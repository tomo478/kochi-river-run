const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const timeEl = document.getElementById("time");
const chargeEl = document.getElementById("charge");
const messageEl = document.getElementById("message");
const startButton = document.getElementById("startButton");

const W = canvas.width;
const H = canvas.height;
const bg = new Image();
bg.src = "assets/kochi-background.png";

const sprites = {
  player: loadSprite("assets/player-boat.png"),
  bonito: loadSprite("assets/bonito.png"),
  naruko: loadSprite("assets/naruko-v2.png"),
  rock: loadSprite("assets/rock.png"),
  whirlpool: loadSprite("assets/whirlpool.png")
};

const keys = new Set();
const SCROLL_BLOCK_KEYS = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"]);
const pointer = { active: false, x: W / 2, y: H * 0.72 };
let lastFrame = performance.now();
let bgReady = false;

const state = {
  mode: "menu",
  score: 0,
  time: 60,
  charge: 0,
  elapsed: 0,
  spawnTimer: 0,
  burstTimer: 0,
  flashTimer: 0,
  stunTimer: 0,
  combo: 1,
  penaltyText: null,
  player: { x: W / 2, y: H * 0.74, r: 25, speed: 420 },
  items: [],
  particles: []
};

const rand = (min, max) => min + Math.random() * (max - min);
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function loadSprite(src) {
  const image = new Image();
  const sprite = { image, ready: false };
  image.addEventListener("load", () => {
    sprite.ready = true;
  });
  image.src = src;
  return sprite;
}

function drawSprite(sprite, x, y, size, rotation = 0, alpha = 1) {
  if (!sprite.ready) return false;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.globalAlpha = alpha;
  ctx.drawImage(sprite.image, -size / 2, -size / 2, size, size);
  ctx.restore();
  ctx.globalAlpha = 1;
  return true;
}

function resetGame() {
  state.mode = "play";
  state.score = 0;
  state.time = 60;
  state.charge = 0;
  state.elapsed = 0;
  state.spawnTimer = 0;
  state.burstTimer = 0;
  state.flashTimer = 0;
  state.stunTimer = 0;
  state.combo = 1;
  state.penaltyText = null;
  state.player.x = W / 2;
  state.player.y = H * 0.74;
  state.items = [];
  state.particles = [];
  messageEl.classList.add("is-hidden");
  updateHud();
}

function seedShowcaseItems() {
  state.items = [
    { type: "bonito", x: W * 0.38, y: H * 0.5, r: 20, value: 100, vy: 0, phase: 0.2 },
    { type: "rock", x: W * 0.58, y: H * 0.52, r: 34, damage: 5, scorePenalty: 150, stun: 0.45, vy: 0, phase: 1.2 },
    { type: "whirlpool", x: W * 0.68, y: H * 0.68, r: 38, damage: 8, scorePenalty: 220, stun: 0.65, vy: 0, phase: 2.1 }
  ];
  state.burstTimer = 0.35;
  state.charge = 100;
  updateHud();
}

function seedPenaltyDemo() {
  state.score = 600;
  state.items = [
    { type: "rock", x: state.player.x, y: state.player.y, r: 34, damage: 5, scorePenalty: 150, stun: 0.45, vy: 0, phase: 1.2 }
  ];
  update(0.016);
}

function finishGame() {
  state.mode = "over";
  messageEl.classList.remove("is-hidden");
  messageEl.innerHTML = `
    <h1>Run Complete</h1>
    <p>Score ${state.score}<br>R かボタンでもう一度。</p>
    <button id="restartButton" type="button">Restart</button>
  `;
  document.getElementById("restartButton").addEventListener("click", resetGame);
}

function updateHud() {
  scoreEl.textContent = String(state.score);
  timeEl.textContent = String(Math.max(0, Math.ceil(state.time)));
  chargeEl.textContent = `${Math.round(state.charge)}%`;
  chargeEl.classList.toggle("is-ready", state.charge >= 100 && state.mode === "play");
}

function actionVector() {
  let x = 0;
  let y = 0;
  if (keys.has("ArrowLeft") || keys.has("KeyA")) x -= 1;
  if (keys.has("ArrowRight") || keys.has("KeyD")) x += 1;
  if (keys.has("ArrowUp") || keys.has("KeyW")) y -= 1;
  if (keys.has("ArrowDown") || keys.has("KeyS")) y += 1;
  if (x !== 0 && y !== 0) {
    x *= Math.SQRT1_2;
    y *= Math.SQRT1_2;
  }
  return { x, y };
}

function spawnEntity() {
  const roll = Math.random();
  const riverCenter = W / 2 + Math.sin(state.elapsed * 0.8) * 110;
  const lane = riverCenter + rand(-260, 260);
  const common = {
    x: clamp(lane, 95, W - 95),
    y: -50,
    vy: rand(145, 220) + state.elapsed * 2.2,
    phase: rand(0, Math.PI * 2)
  };

  if (roll < 0.52) {
    state.items.push({ ...common, type: "bonito", r: 20, value: 100 });
  } else if (roll < 0.82) {
    state.items.push({ ...common, type: "rock", r: rand(24, 38), damage: 5, scorePenalty: 150, stun: 0.45 });
  } else {
    state.items.push({ ...common, type: "whirlpool", r: rand(30, 44), damage: 8, scorePenalty: 220, stun: 0.65 });
  }
}

function makeParticles(x, y, color, count) {
  for (let i = 0; i < count; i += 1) {
    state.particles.push({
      x,
      y,
      vx: rand(-180, 180),
      vy: rand(-210, 120),
      life: rand(0.35, 0.8),
      maxLife: 0.8,
      color,
      size: rand(3, 8)
    });
  }
}

function burst() {
  if (state.mode !== "play" || state.charge < 100) return;
  let cleared = 0;
  state.items = state.items.filter((item) => {
    if (item.type === "bonito") return true;
    const hit = item.type !== "bonito";
    if (hit) {
      cleared += 1;
      makeParticles(item.x, item.y, "#ffd447", 24);
      makeParticles(item.x, item.y, "#f25f4c", 10);
    }
    return !hit;
  });
  state.score += cleared * 220;
  state.charge = 0;
  state.burstTimer = 0.9;
  state.flashTimer = Math.max(state.flashTimer, 0.18);
  if (cleared > 0) {
    state.penaltyText = {
      x: W / 2,
      y: H * 0.34,
      text: `鳴子バースト +${cleared * 220}`,
      life: 0.9
    };
  }
  updateHud();
}

function update(dt) {
  if (state.mode !== "play") return;

  state.elapsed += dt;
  state.time -= dt;
  state.spawnTimer -= dt;
  state.burstTimer = Math.max(0, state.burstTimer - dt);
  state.flashTimer = Math.max(0, state.flashTimer - dt);
  state.stunTimer = Math.max(0, state.stunTimer - dt);
  if (state.penaltyText) {
    state.penaltyText.life -= dt;
    state.penaltyText.y -= 44 * dt;
    if (state.penaltyText.life <= 0) state.penaltyText = null;
  }

  const move = actionVector();
  const controlScale = state.stunTimer > 0 ? 0.18 : 1;
  state.player.x += move.x * state.player.speed * dt * controlScale;
  state.player.y += move.y * state.player.speed * dt * controlScale;

  if (pointer.active && state.stunTimer <= 0) {
    state.player.x += (pointer.x - state.player.x) * Math.min(1, dt * 7);
    state.player.y += (pointer.y - state.player.y) * Math.min(1, dt * 7);
  }

  state.player.x = clamp(state.player.x, 72, W - 72);
  state.player.y = clamp(state.player.y, 135, H - 62);

  if (state.spawnTimer <= 0) {
    spawnEntity();
    state.spawnTimer = Math.max(0.32, rand(0.55, 0.9) - state.elapsed * 0.006);
  }

  for (const item of state.items) {
    item.y += item.vy * dt;
    item.x += Math.sin(state.elapsed * 4 + item.phase) * (item.type === "bonito" ? 28 : 10) * dt;
  }

  const survivors = [];
  for (const item of state.items) {
    if (item.y > H + 80) continue;
    if (distance(item, state.player) < item.r + state.player.r) {
      if (item.type === "bonito") {
        state.score += item.value * state.combo;
        state.charge = clamp(state.charge + 16, 0, 100);
        state.combo = Math.min(5, state.combo + 1);
        makeParticles(item.x, item.y, "#f25f4c", 10);
      } else {
        state.time -= item.damage;
        state.score = Math.max(0, state.score - item.scorePenalty);
        state.combo = 1;
        state.flashTimer = 0.28;
        state.stunTimer = Math.max(state.stunTimer, item.stun);
        state.penaltyText = {
          x: state.player.x,
          y: state.player.y - 58,
          text: `-${item.scorePenalty} / -${item.damage}s`,
          life: 0.8
        };
        makeParticles(item.x, item.y, "#e9eef2", 16);
      }
      continue;
    }
    survivors.push(item);
  }
  state.items = survivors;

  for (const particle of state.particles) {
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vy += 260 * dt;
    particle.life -= dt;
  }
  state.particles = state.particles.filter((particle) => particle.life > 0);

  updateHud();
  if (state.time <= 0) finishGame();
}

function drawBackground() {
  if (bgReady) {
    const scale = Math.max(W / bg.width, H / bg.height);
    const drawW = bg.width * scale;
    const drawH = bg.height * scale;
    ctx.drawImage(bg, (W - drawW) / 2, (H - drawH) / 2, drawW, drawH);
  } else {
    const gradient = ctx.createLinearGradient(0, 0, 0, H);
    gradient.addColorStop(0, "#83cde5");
    gradient.addColorStop(0.5, "#1f8fbd");
    gradient.addColorStop(1, "#12556d");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W, H);
  }

  ctx.fillStyle = "rgba(19, 93, 118, 0.32)";
  ctx.beginPath();
  ctx.moveTo(W * 0.18, 0);
  ctx.bezierCurveTo(W * 0.36, H * 0.24, W * 0.23, H * 0.54, W * 0.37, H);
  ctx.lineTo(W * 0.72, H);
  ctx.bezierCurveTo(W * 0.57, H * 0.56, W * 0.72, H * 0.25, W * 0.58, 0);
  ctx.closePath();
  ctx.fill();
}

function drawBoat() {
  const { x, y } = state.player;
  const wobble = state.stunTimer > 0 ? Math.sin(state.elapsed * 48) * 0.08 : Math.sin(state.elapsed * 5) * 0.025;
  if (drawSprite(sprites.player, x, y, 112, wobble)) return;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(wobble);
  ctx.shadowColor = "rgba(0, 0, 0, 0.28)";
  ctx.shadowBlur = 12;
  ctx.fillStyle = "#fff8e8";
  ctx.beginPath();
  ctx.moveTo(0, -34);
  ctx.lineTo(34, 17);
  ctx.quadraticCurveTo(0, 34, -34, 17);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#f25f4c";
  ctx.beginPath();
  ctx.moveTo(0, -22);
  ctx.lineTo(15, 12);
  ctx.lineTo(-15, 12);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#17202a";
  ctx.fillRect(-3, -6, 6, 27);
  ctx.restore();
}

function drawReadyCue() {
  if (state.charge < 100 || state.mode !== "play") return;
  const pulse = 0.5 + Math.sin(state.elapsed * 8) * 0.5;
  ctx.save();
  ctx.globalAlpha = 0.55 + pulse * 0.25;
  ctx.strokeStyle = "#ffd447";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(state.player.x, state.player.y, 54 + pulse * 9, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 0.9;
  drawSprite(sprites.naruko, state.player.x + 44, state.player.y - 42, 46, Math.sin(state.elapsed * 6) * 0.12);
  ctx.restore();
}

function drawBonito(item) {
  const bob = Math.sin(state.elapsed * 6 + item.phase) * 0.18;
  if (drawSprite(sprites.bonito, item.x, item.y, 104, bob)) return;

  ctx.save();
  ctx.translate(item.x, item.y);
  ctx.rotate(bob);
  ctx.fillStyle = "#3f6f8f";
  ctx.beginPath();
  ctx.ellipse(0, 0, 28, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#d8f4ff";
  ctx.beginPath();
  ctx.moveTo(26, 0);
  ctx.lineTo(43, -13);
  ctx.lineTo(39, 0);
  ctx.lineTo(43, 13);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#fff8e8";
  ctx.beginPath();
  ctx.arc(-13, -3, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 248, 232, 0.75)";
  ctx.lineWidth = 2;
  for (let i = -10; i <= 10; i += 10) {
    ctx.beginPath();
    ctx.moveTo(-6, i * 0.35);
    ctx.lineTo(15, i * 0.2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawRock(item) {
  if (drawSprite(sprites.rock, item.x, item.y, item.r * 2.55, Math.sin(item.phase) * 0.1)) return;

  ctx.save();
  ctx.translate(item.x, item.y);
  ctx.fillStyle = "#5a6468";
  ctx.beginPath();
  ctx.moveTo(-item.r, item.r * 0.55);
  ctx.lineTo(-item.r * 0.58, -item.r * 0.72);
  ctx.lineTo(item.r * 0.2, -item.r);
  ctx.lineTo(item.r, -item.r * 0.1);
  ctx.lineTo(item.r * 0.62, item.r * 0.78);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.22)";
  ctx.beginPath();
  ctx.moveTo(-item.r * 0.2, -item.r * 0.55);
  ctx.lineTo(item.r * 0.34, -item.r * 0.24);
  ctx.lineTo(-item.r * 0.08, -item.r * 0.12);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawWhirlpool(item) {
  if (drawSprite(sprites.whirlpool, item.x, item.y, item.r * 2.8, state.elapsed * 1.9 + item.phase, 0.95)) return;

  ctx.save();
  ctx.translate(item.x, item.y);
  ctx.rotate(state.elapsed * 3 + item.phase);
  ctx.strokeStyle = "rgba(255, 248, 232, 0.86)";
  ctx.lineWidth = 5;
  ctx.beginPath();
  for (let a = 0; a < Math.PI * 4.6; a += 0.18) {
    const r = (a / (Math.PI * 4.6)) * item.r;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (a === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.restore();
}

function drawParticles() {
  for (const particle of state.particles) {
    const alpha = clamp(particle.life / particle.maxLife, 0, 1);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawFullScreenBurst(t) {
  const progress = 1 - t;
  ctx.save();
  ctx.globalAlpha = 0.24 * t;
  ctx.fillStyle = "#ffd447";
  ctx.fillRect(0, 0, W, H);

  for (let i = 0; i < 4; i += 1) {
    const radius = (progress * 920) + i * 120;
    ctx.globalAlpha = Math.max(0, t - i * 0.13);
    ctx.strokeStyle = i % 2 === 0 ? "#ffd447" : "#f25f4c";
    ctx.lineWidth = 12 - i * 2;
    ctx.beginPath();
    ctx.arc(state.player.x, state.player.y, radius, 0, Math.PI * 2);
    ctx.stroke();
  }

  for (let i = 0; i < 8; i += 1) {
    const angle = state.elapsed * 4 + i * (Math.PI * 2 / 8);
    const radius = 120 + progress * 420;
    const x = state.player.x + Math.cos(angle) * radius;
    const y = state.player.y + Math.sin(angle) * radius * 0.56;
    drawSprite(sprites.naruko, x, y, 78, angle + Math.PI / 4, Math.max(0, t - 0.08));
  }

  ctx.restore();
}

function drawBurst() {
  if (state.burstTimer <= 0) return;
  const t = state.burstTimer / 0.9;
  drawFullScreenBurst(t);
  ctx.save();
  ctx.globalAlpha = t;
  ctx.strokeStyle = "#ffd447";
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(state.player.x, state.player.y, 280 + (1 - t) * 520, 0, Math.PI * 2);
  ctx.stroke();
  if (!drawSprite(sprites.naruko, state.player.x, state.player.y, 190, -0.35 + state.elapsed * 3, t)) {
    ctx.fillStyle = "#f25f4c";
    ctx.fillRect(state.player.x - 80, state.player.y - 8, 160, 16);
  }
  ctx.restore();
}

function drawOverlay() {
  if (state.flashTimer > 0) {
    ctx.fillStyle = `rgba(242, 95, 76, ${state.flashTimer * 1.8})`;
    ctx.fillRect(0, 0, W, H);
  }

  if (state.mode === "menu") {
    ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
    ctx.fillRect(0, 0, W, H);
  }

  if (state.penaltyText) {
    const alpha = clamp(state.penaltyText.life / 0.8, 0, 1);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = "800 34px Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.lineWidth = 7;
    ctx.strokeStyle = "rgba(23, 32, 42, 0.82)";
    ctx.fillStyle = "#ffd447";
    ctx.strokeText(state.penaltyText.text, state.penaltyText.x, state.penaltyText.y);
    ctx.fillText(state.penaltyText.text, state.penaltyText.x, state.penaltyText.y);
    ctx.restore();
  }
}

function render() {
  ctx.clearRect(0, 0, W, H);
  drawBackground();

  for (const item of state.items) {
    if (item.type === "bonito") drawBonito(item);
    if (item.type === "rock") drawRock(item);
    if (item.type === "whirlpool") drawWhirlpool(item);
  }

  drawParticles();
  drawReadyCue();
  drawBoat();
  drawBurst();
  drawOverlay();
}

function loop(now) {
  const dt = Math.min(0.033, (now - lastFrame) / 1000);
  lastFrame = now;
  update(dt);
  render();
  requestAnimationFrame(loop);
}

function pointerToCanvas(event) {
  const rect = canvas.getBoundingClientRect();
  const source = event.touches ? event.touches[0] : event;
  return {
    x: ((source.clientX - rect.left) / rect.width) * W,
    y: ((source.clientY - rect.top) / rect.height) * H
  };
}

window.addEventListener("keydown", (event) => {
  if (SCROLL_BLOCK_KEYS.has(event.code)) {
    event.preventDefault();
  }
  keys.add(event.code);
  if (event.code === "Space") {
    burst();
  }
  if (event.code === "KeyR") resetGame();
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.code);
});

canvas.addEventListener("pointerdown", (event) => {
  pointer.active = true;
  Object.assign(pointer, pointerToCanvas(event));
});

canvas.addEventListener("pointermove", (event) => {
  if (!pointer.active) return;
  Object.assign(pointer, pointerToCanvas(event));
});

window.addEventListener("pointerup", () => {
  pointer.active = false;
});

canvas.addEventListener("touchstart", (event) => {
  pointer.active = true;
  Object.assign(pointer, pointerToCanvas(event));
}, { passive: true });

canvas.addEventListener("touchmove", (event) => {
  Object.assign(pointer, pointerToCanvas(event));
}, { passive: true });

window.addEventListener("touchend", () => {
  pointer.active = false;
});

startButton.addEventListener("click", resetGame);
bg.addEventListener("load", () => {
  bgReady = true;
});

updateHud();
const params = new URLSearchParams(window.location.search);
if (params.get("autoplay") === "1") {
  resetGame();
  seedShowcaseItems();
}
if (params.get("penalty") === "1") {
  resetGame();
  seedPenaltyDemo();
}
if (params.get("burst") === "1") {
  resetGame();
  seedShowcaseItems();
  burst();
}
requestAnimationFrame(loop);
