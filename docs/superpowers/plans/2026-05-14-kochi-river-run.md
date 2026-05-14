# Kochi River Run Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a playable single-page Kochi-themed Canvas arcade game using a generated background image.

**Architecture:** Keep the page shell, styling, and game runtime in separate files. Simulation state lives in `game.js` and Canvas rendering reads from it each frame, while DOM HUD elements display score, time, charge, and state.

**Tech Stack:** HTML, CSS, vanilla JavaScript Canvas, generated PNG asset.

---

### Task 1: Project Shell

**Files:**
- Create: `index.html`
- Create: `styles.css`

- [ ] **Step 1: Create the HTML shell**

Add a full page game surface with a canvas, HUD values for score/time/charge, and compact controls.

- [ ] **Step 2: Create responsive styling**

Style the page as a game screen, keep the canvas readable on desktop and mobile, and avoid blocking the playfield with heavy panels.

- [ ] **Step 3: Verify static load**

Run: open `index.html` in a browser or use a headless browser screenshot.
Expected: Page displays a canvas area and HUD without overlapping text.

### Task 2: Runtime

**Files:**
- Create: `game.js`

- [ ] **Step 1: Implement state and input**

Create a serializable state object, keyboard action map, pointer/touch fallback movement, and restart handling.

- [ ] **Step 2: Implement spawning and collisions**

Spawn bonito, rocks, and whirlpools from the top of the river route. Apply scoring, penalties, and naruko burst clearing.

- [ ] **Step 3: Implement rendering**

Draw the generated background image, player boat, collectibles, hazards, effects, and end state.

- [ ] **Step 4: Verify gameplay**

Run a browser smoke test. Expected: background loads, player moves, score/time changes, and restart works.

### Task 3: Final QA

**Files:**
- Modify: `index.html`
- Modify: `styles.css`
- Modify: `game.js`

- [ ] **Step 1: Check file references**

Confirm `assets/kochi-background.png`, `styles.css`, and `game.js` are referenced correctly from `index.html`.

- [ ] **Step 2: Run visual smoke test**

Use a headless browser screenshot of `index.html`.
Expected: nonblank game screen with generated Kochi background, HUD, player, and no layout overlap.
