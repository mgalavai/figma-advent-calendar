# How to Play Sound in Figma Widgets

## Overview

**Figma widgets cannot directly play audio** - the Widget API doesn't support audio playback. However, you can use an **external UI window** (iframe) opened with `figma.showUI()` that runs Web Audio API.

## Pattern

1. **Widget** (main UI/logic) → Controls the game/interface
2. **External HTML window** (hidden iframe) → Handles audio playback using Web Audio API
3. **Message passing** → Widget sends commands via `figma.ui.postMessage()`, HTML window receives via `window.onmessage`

## Implementation

### 1. Create Audio Player HTML (`src/ui/audio-player.html`)

This file contains Web Audio API code that can:
- Generate beep tones programmatically
- Load and play audio files from URLs
- Handle audio context initialization (requires user interaction)

### 2. Import and Initialize in Widget

```typescript
// Import the HTML file
import audioPlayerHtml from '../ui/audio-player.html';

// Initialize audio player (singleton pattern)
let audioPlayerWindow = null;
let audioPlayerReady = false;

function initAudioPlayer() {
    if (audioPlayerWindow) return;
    
    audioPlayerWindow = figma.showUI(audioPlayerHtml, { 
        width: 1, 
        height: 1, 
        visible: false, // Hidden window
        title: 'Audio Player'
    });
    
    figma.ui.onmessage = (msg: any) => {
        if (msg.type === 'AUDIO_READY') {
            audioPlayerReady = true;
        }
    };
}
```

### 3. Play Sounds

```typescript
// Play a simple beep tone
function playBeep(frequency = 440, duration = 200, volume = 0.3) {
    initAudioPlayer();
    if (audioPlayerReady && audioPlayerWindow) {
        figma.ui.postMessage({
            type: 'PLAY_BEEP',
            frequency,  // Hz (e.g., 440 = A4)
            duration,   // milliseconds
            volume      // 0.0 to 1.0
        });
    }
}

// Load and play an audio file
function loadAudio(url: string, name: string) {
    initAudioPlayer();
    figma.ui.postMessage({
        type: 'LOAD_AUDIO',
        url,
        name
    });
}

function playAudio(name: string, volume = 1.0) {
    initAudioPlayer();
    if (audioPlayerReady && audioPlayerWindow) {
        figma.ui.postMessage({
            type: 'PLAY_AUDIO',
            name,
            volume
        });
    }
}
```

### 4. Use in Your Widget

```typescript
// Example: Play sound on button click
const handleCellClick = (index: number) => {
    // ... game logic ...
    
    // Play click sound
    playBeep(600, 100, 0.2);
    
    if (gameWinner) {
        // Play win sound
        playBeep(800, 300, 0.4);
    }
};
```

## Example: Tic-Tac-Toe with Sound

The tic-tac-toe game (day 1) now includes:
- **Click sound**: 600Hz beep when placing X or O
- **Win sound**: 800Hz beep when game ends

## Notes

- **User interaction required**: Web Audio API requires user interaction to initialize (browser security)
- **Hidden window**: The audio player window is 1x1px and invisible, but must exist
- **Network access**: To load audio files from URLs, add domains to `manifest.json` `networkAccess.allowedDomains`
- **Performance**: Beep tones are lightweight; audio files require loading time

## Alternative: Load Audio Files

```typescript
// Load an audio file (e.g., from GitHub)
loadAudio('https://raw.githubusercontent.com/user/repo/sound.mp3', 'click');

// Later, play it
playAudio('click', 0.5); // 50% volume
```

## See Also

- `src/ui/audio-player.html` - Audio player implementation
- `src/widget/code.tsx` - Example usage in tic-tac-toe game
- `PROJECT_IDEAS.md` - Mentions audio pattern for Digital Synth
