const fs = require("fs");
const assert = require("assert");

const source = fs.readFileSync("game.js", "utf8");

assert.match(source, /drawSprite\(sprites\.bonito,\s*item\.x,\s*item\.y,\s*104,/, "bonito sprite should render larger");
assert.match(source, /stunTimer:\s*0/, "state should track a stun penalty timer");
assert.match(source, /state\.score\s*=\s*Math\.max\(0,\s*state\.score\s*-\s*item\.scorePenalty\)/, "hazards should subtract score");
assert.match(source, /penaltyText/, "hazard hits should show penalty feedback text");
assert.match(source, /naruko-v2\.png/, "renderer should use the refreshed naruko sprite");
assert.match(source, /chargeEl\.classList\.toggle\("is-ready"/, "naruko HUD should signal when burst is ready");
assert.match(source, /drawReadyCue/, "canvas should draw a ready cue around the player");
assert.match(source, /const hit = item\.type !== "bonito";/, "naruko burst should clear every rock and whirlpool on screen");
assert.match(source, /state\.burstTimer = 0\.9;/, "naruko burst should use a longer full-screen effect");
assert.match(source, /drawFullScreenBurst/, "naruko burst should draw a full-screen visual effect");
assert.match(source, /player:\s*loadSprite\("assets\/player-boat\.png"\)/, "player should use a generated sprite");
assert.match(source, /drawSprite\(sprites\.player,\s*x,\s*y,\s*112,/, "player sprite should be rendered at a readable size");

console.log("static game checks passed");
