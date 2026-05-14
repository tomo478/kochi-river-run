# Kochi River Run Design

## Concept

Build a small browser arcade game themed around Kochi, Japan. The player rides a paper boat down a stylized Shimanto River route, collects bonito, avoids rocks and whirlpools, and triggers a yosakoi naruko burst to clear hazards.

## Approach

Use a dependency-free HTML, CSS, and JavaScript Canvas game so the project can be opened directly from disk. Use the generated Kochi landscape as the main raster background asset. Draw gameplay entities with Canvas primitives for crisp collision readability and low setup cost.

## Gameplay

- Move with arrow keys or WASD.
- Collect bonito for score.
- Avoid rocks and whirlpools, which reduce time.
- Press Space to use a naruko burst when charged.
- Survive a 60-second run and aim for a high score.

## Architecture

- `index.html` owns the page shell, canvas, HUD, and help text.
- `styles.css` owns responsive layout, HUD readability, and visual polish.
- `game.js` owns simulation state, input mapping, rendering, collision, scoring, and restart.
- `assets/kochi-background.png` is the generated game background.

Simulation state is plain serializable JavaScript objects. Canvas rendering reads from state each frame. DOM HUD text is updated from game state.

## Testing

Verify by opening the local HTML file, confirming the game boots, checking keyboard controls, testing restart, and ensuring the generated background loads. Use a headless browser screenshot for a visual smoke test.
