# Figma Advent Calendar Widget - Project Ideas

## Core Concept
A multiplayer Figma Widget acting as an interactive Advent Calendar.
- **Structure:** 4x6 Grid (Days 1-24).
- **Navigation:** Home Grid -> Experiment View.
- **Vibe:** Fun, wonky, collaborative, "toy-like".
- **Tech:** Hybrid approach. Simple tools run natively in the Widget (AutoLayout). Complex games/visuals run in a React Iframe (`figma.showUI`) or manipulate the Canvas directly.

---

## 🟢 The "Snacks" (Native Widget Only)
*Instant interaction, runs directly on the widget surface. Low friction.*

1.  **Tic-Tac-Toe**
    - Classic multiplayer.
    - Uses `useSyncedState` for the board.

2.  **Memory Game**
    - Grid of cards to flip.
    - Cooperative (clear the board together) or chaotic (messing with others).

3.  **Ridiculous Animal Generator**
    - Slot-machine mechanic (Head / Body / Legs).
    - Stacks transparent PNGs/SVGs.
    - **Action:** "Place on Canvas" button to paste the result as a node.

4.  **Pattern Generator**
    - Widget UI: Sliders for density, shape, color.
    - **Action:** Generates vector art directly on the Figma canvas behind the widget.

5.  **Auto-Snake (The Tamagotchi)**
    - **Ambient:** Snake moves 1 step/sec automatically (when file is open).
    - **Interaction:** Users don't control the snake; they click the grid to spawn **Apples** (food) or **Rocks** (obstacles).
    - **Vibe:** A shared "pet" for the file. Users can guide it or grief it.

---

## 🟡 The "Machines" (Widget + Iframe Helper)
*Widget is the main controller, but opens a small/invisible window for Audio or Input.*

6.  **Digital Synth (Collaborative Sequencer)**
    - **Widget:** 16-step sequencer grid. Users toggle beats together.
    - **Iframe:** Hidden window running Web Audio API to play the sound.
    - **Vibe:** Multiplayer Jam Session.

7.  **Top-Down Car Driving**
    - **Widget:** "Drive" button.
    - **Iframe:** Small controller window captures WASD/Arrow keys.
    - **Canvas:** Updates the X/Y position of a "Car" node on the actual Figma canvas.
    - **Vibe:** Multiplayer driving chaos. No goals, just a fun mess.

---

## 🔴 The "Portals" (Widget + Full Editor Iframe)
*Widget is just a launcher. The experience happens in a modal window.*

8.  **3D Lego Editor**
    - **Widget:** Displays screenshot of current build.
    - **Iframe:** Three.js environment to build with blocks.
    - **Save:** Updates widget cover image + saves JSON data.

9.  **Shader Image Generator**
    - **Iframe:** GLSL shader editor/tweaker.
    - **Output:** Renders high-res image to the Figma canvas.

10. **The "Word Well" (Feedback & Inspiration Tool)**
    *This is a dedicated area for the remaining 12 windows/days.*
    - **Purpose:** Users provide inspiration for future experiments.
    - **Input:** Users can add up to 3 words (preferably nouns).
    - **Visual Metaphor:** A "Tetris-like well" or container.
    - **The Physics:**
        - When a word is added, it falls into the well as a **Circle** containing the text.
        - The circles have **realistic physics**: gravity, squishy, springy, and jumpy.
        - Users can **drag** the circles around, throwing them against walls or each other.
    - **Voting Mechanism:**
        - Clicking a circle counts as a vote.
        - **Effect:** The circle physically **grows in size** with each vote.
        - **Limit:** Up to 3 votes per user/circle.
    - **Interpretation:** The creator uses these word clouds to interpret and build the next day's experiment.

---

## ✨ The "Overlays" (Ephemeral Effects)
*Visual effects that play "over" the canvas without messing up the file.*

11. **Confetti Thrower**
    - **Trigger:** Widget button.
    - **Effect:** Transparent full-screen iframe blasts confetti particles.
    - **Cleanup:** Auto-closes after 3s. No nodes left behind. Pure visual joy.

12. **"The Airspace" (Yes/No Reactions)**
    - **Trigger:** Big [YES] / [NO] buttons on Widget.
    - **Effect:**
        - **NO:** Animation of a train pulling "N-O-O-O-O" carts across the bottom of the screen. Completely gone when it leaves.
        - **YES:** Vintage Cessna plane flying across the top with a "YESSS!!" banner.
    - **Sync:** Broadcasts to all users so everyone sees the animation simultaneously. Useful for meetings.

13. **Canvas Destroyer (Stress Relief)**
    - **Single Player:** Takes a screenshot of the viewport -> Opens full-screen Iframe with that image -> User "smashes" it (cracks/holes).
    - **Multiplayer Variant:** "Sticky" destruction. Clicking places actual "Crack" image nodes on the canvas (requires a "Clean Up" button).
    - **Vibe:** "Desktop Destroyer" nostalgia.

---

## 🗓 Architecture Notes
- **State Management:** `useSyncedState` for everything that needs to persist (game boards, high scores, Lego builds).
- **Navigation:** Simple State Machine (`view` state: 'GRID' | 'EXPERIMENT').
- **Assets:** Keep widget bundle size in mind. Load heavy assets (3D models, sounds) via the Iframe or external URLs if possible.
