const GRID_BACKGROUND_URL = 'https://raw.githubusercontent.com/mgalavai/figma-advent-calendar/main/src/widget/grid-background.jpg';
const ADVENT_CALENDAR_BADGE_URL = 'https://raw.githubusercontent.com/mgalavai/figma-advent-calendar/main/src/widget/advent-calendar-badge.png';

const { widget } = figma;
const {
    AutoLayout,
    Frame,
    Image: WidgetImage,
    Text: WidgetText,
    useSyncedState,
    useEffect,
} = widget;

// @ts-ignore - HTML import
import html from '../../dist/index.html';
// @ts-ignore - Audio player HTML import
import audioPlayerHtml from '../ui/audio-player.html';

interface Word {
    id: string;
    text: string;
    votes: number;
    color: string;
}

function useRemoteImageHash(url: string, storageKey: string): string | null {
    const [hash, setHash] = useSyncedState<string | null>(storageKey, null);

    useEffect(() => {
        if (hash) {
            console.log(`[useRemoteImageHash] ${storageKey}: cached hash (${hash}), skipping load.`);
            return;
        }

        console.log(`[useRemoteImageHash] ${storageKey}: loading ${url} via figma.createImageAsync...`);

        figma.widget.waitForTask(
            (async () => {
                try {
                    const image = await figma.createImageAsync(url);
                    console.log(`[useRemoteImageHash] ${storageKey}: loaded successfully. hash=${image.hash}`);
                    setHash(image.hash);
                } catch (error) {
                    console.error(`[useRemoteImageHash] ${storageKey}: failed to load ${url}`, error);
                }
            })(),
        );
    }, [hash, setHash, url]);

    return hash;
}

// Audio Player Helper - Singleton pattern
let audioPlayerWindow: boolean = false;
let audioPlayerReady = false;
let pendingMessages: Array<{ type: string;[key: string]: any }> = [];
let originalMessageHandler: ((msg: any) => void) | null = null;

function initAudioPlayer() {
    if (audioPlayerWindow) {
        console.log('[Audio] Audio player already initialized, ready:', audioPlayerReady);
        return;
    }

    // Use waitForTask to keep window open (same pattern as Word Well)
    figma.widget.waitForTask(
        new Promise<void>((resolve) => {
            try {
                // Store original message handler if it exists
                originalMessageHandler = figma.ui.onmessage || null;

                console.log('[Audio] Initializing audio player window...');
                figma.showUI(audioPlayerHtml, {
                    width: 1,
                    height: 1,
                    visible: false, // Hidden window
                    title: 'Audio Player'
                });
                audioPlayerWindow = true; // Mark as initialized
                console.log('[Audio] Audio player window opened');

                let resolved = false;
                const cleanup = () => {
                    if (resolved) return;
                    resolved = true;
                    audioPlayerWindow = false;
                    audioPlayerReady = false;
                    figma.ui.onmessage = originalMessageHandler;
                    resolve();
                };

                // Unified message handler that routes messages
                figma.ui.onmessage = (msg: any) => {
                    console.log('[Audio] Message handler received:', msg, 'type:', msg?.type);

                    // Handle audio player messages
                    if (msg.type === 'AUDIO_READY') {
                        audioPlayerReady = true;
                        console.log('[Audio] Audio player ready, state:', msg.audioState);

                        // Send any pending messages
                        if (pendingMessages.length > 0) {
                            console.log('[Audio] Sending', pendingMessages.length, 'pending messages');
                            pendingMessages.forEach(pendingMsg => {
                                console.log('[Audio] Sending pending message:', pendingMsg);
                                figma.ui.postMessage(pendingMsg);
                            });
                            pendingMessages = [];
                        }

                        // Don't resolve Promise - keeping it unresolved keeps the window open
                        // This shows a notification, but it's necessary for persistent audio
                        return;
                    }

                    if (msg.type === 'AUDIO_LOADED') {
                        console.log('[Audio] Audio loaded:', msg.name, msg.success);
                        return;
                    }

                    if (msg.type === 'AUDIO_INITIALIZED') {
                        console.log('[Audio] Audio context initialized, state:', msg.state);
                        return;
                    }

                    if (msg.type === 'CLOSE_AUDIO') {
                        // Allow closing audio window
                        figma.ui.close();
                        cleanup();
                        return;
                    }

                    // Route other messages to original handler (for Word Well, etc.)
                    if (originalMessageHandler) {
                        originalMessageHandler(msg);
                    }
                };
            } catch (error) {
                console.error('[Audio] Failed to initialize audio player:', error);
                audioPlayerWindow = false;
                resolve();
            }
        })
    );
}

function playBeep(frequency: number = 440, duration: number = 200, volume: number = 0.3) {
    console.log('[Audio] playBeep called');
    initAudioPlayer();

    const message = {
        type: 'PLAY_BEEP',
        frequency,
        duration,
        volume: Math.max(volume, 0.5) // Ensure minimum volume
    };

    // Always try to send - figma.ui.postMessage works if any UI window exists
    console.log('[Audio] Attempting to send PLAY_BEEP message:', message);
    try {
        figma.ui.postMessage(message);
        console.log('[Audio] Message sent via figma.ui.postMessage');
    } catch (error) {
        console.error('[Audio] Error sending message:', error);
        // Queue for later if sending failed
        console.log('[Audio] Queuing message for later');
        pendingMessages.push(message);
    }
}

function loadAudio(url: string, name: string) {
    initAudioPlayer();
    if (audioPlayerWindow) {
        figma.ui.postMessage({
            type: 'LOAD_AUDIO',
            url,
            name
        });
    }
}

function playAudio(name: string, volume: number = 1.0) {
    initAudioPlayer();
    if (audioPlayerWindow) {
        figma.ui.postMessage({
            type: 'PLAY_AUDIO',
            name,
            volume
        });
    }
}

function playSynthNote(frequency: number, waveform: 'sine' | 'square' | 'sawtooth' | 'triangle' = 'sine', attack: number = 0.01, release: number = 0.2, volume: number = 0.5) {
    initAudioPlayer();
    if (audioPlayerWindow) {
        figma.ui.postMessage({
            type: 'PLAY_SYNTH_NOTE',
            frequency,
            waveform,
            attack,
            release,
            volume
        });
    }
}

function AdventCalendar() {
    const gridBackgroundHash = useRemoteImageHash(GRID_BACKGROUND_URL, 'gridBackgroundHash');
    const adventCalendarBadgeHash = useRemoteImageHash(ADVENT_CALENDAR_BADGE_URL, 'adventCalendarBadgeHash');

    useEffect(() => {
        if (gridBackgroundHash) {
            console.log('[AdventCalendar] Grid background ready.');
        } else {
            console.log('[AdventCalendar] Waiting for grid background.');
        }
    }, [gridBackgroundHash]);

    useEffect(() => {
        if (adventCalendarBadgeHash) {
            console.log('[AdventCalendar] Badge image ready.');
        } else {
            console.log('[AdventCalendar] Waiting for badge image.');
        }
    }, [adventCalendarBadgeHash]);

    // State for the calendar grid
    const [openDays, setOpenDays] = useSyncedState<number[]>('openDays', []);
    const [activeDay, setActiveDay] = useSyncedState<number | null>('activeDay', null);
    const [view, setView] = useSyncedState<'GRID' | 'EXPERIMENT'>('view', 'GRID');

    // 24 Days Configuration
    const days = Array.from({ length: 24 }, (_, i) => i + 1);

    const [words, setWords] = useSyncedState<Word[]>('words', []);

    // Tic-Tac-Toe game state (for day 1)
    const [board, setBoard] = useSyncedState<('X' | 'O' | null)[]>('ticTacToeBoard', Array(9).fill(null));
    const [currentPlayer, setCurrentPlayer] = useSyncedState<'X' | 'O'>('ticTacToePlayer', 'X');
    const [winner, setWinner] = useSyncedState<'X' | 'O' | 'TIE' | null>('ticTacToeWinner', null);

    const checkWinner = (boardState: ('X' | 'O' | null)[]): 'X' | 'O' | 'TIE' | null => {
        const lines = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
            [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
            [0, 4, 8], [2, 4, 6] // diagonals
        ];

        for (const [a, b, c] of lines) {
            if (boardState[a] && boardState[a] === boardState[b] && boardState[a] === boardState[c]) {
                return boardState[a] as 'X' | 'O';
            }
        }

        if (boardState.every(cell => cell !== null)) {
            return 'TIE';
        }

        return null;
    };

    const handleCellClick = (index: number) => {
        if (board[index] || winner) return;

        const newBoard = [...board];
        newBoard[index] = currentPlayer;
        setBoard(newBoard);

        // Play click sound
        playBeep(600, 100, 0.2);

        const gameWinner = checkWinner(newBoard);
        if (gameWinner) {
            setWinner(gameWinner);
            // Play win sound (higher pitch, longer duration)
            playBeep(800, 300, 0.4);
        } else {
            setCurrentPlayer(currentPlayer === 'X' ? 'O' : 'X');
        }
    };

    const resetGame = () => {
        setBoard(Array(9).fill(null));
        setCurrentPlayer('X');
        setWinner(null);
    };

    // Memory game state (for day 2)
    const [memoryCards, setMemoryCards] = useSyncedState<(number | null)[]>('memoryCards', []);
    const [flippedCards, setFlippedCards] = useSyncedState<number[]>('memoryFlipped', []);
    const [matchedPairs, setMatchedPairs] = useSyncedState<number[]>('memoryMatched', []);
    const [moves, setMoves] = useSyncedState<number>('memoryMoves', 0);
    const [checkingMatch, setCheckingMatch] = useSyncedState<boolean>('memoryChecking', false);
    const [pendingFlip, setPendingFlip] = useSyncedState<number[]>('memoryPendingFlip', []);

    // Initialize memory game cards (4 pairs = 8 cards in a 3x3 grid)
    const initializeMemoryGame = (): (number | null)[] => {
        const pairs = [1, 2, 3, 4];
        const cards: (number | null)[] = [...pairs, ...pairs]; // Duplicate for pairs (8 cards total)
        // Shuffle
        for (let i = cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [cards[i], cards[j]] = [cards[j], cards[i]];
        }
        // Add null for empty cell (9 positions total)
        cards.push(null);
        return cards;
    };

    const handleMemoryCardClick = (index: number) => {
        // Don't allow clicking if card is empty, already flipped, matched, checking match, or two cards are already flipped
        if (!memoryCards[index] || flippedCards.includes(index) || matchedPairs.includes(index) || checkingMatch || flippedCards.length >= 2) {
            return;
        }

        const newFlipped = [...flippedCards, index];
        setFlippedCards(newFlipped);

        // If two cards are flipped, check for match
        if (newFlipped.length === 2) {
            setMoves(moves + 1);
            setCheckingMatch(true);
            const [first, second] = newFlipped;

            // Check for match - use waitForTask to handle async state updates
            figma.widget.waitForTask(
                new Promise<void>((resolve) => {
                    // Cards are visible now, check match after a brief moment
                    // We'll use pendingFlip to track cards that should flip back
                    if (memoryCards[first] === memoryCards[second]) {
                        // Match found!
                        setMatchedPairs([...matchedPairs, first, second]);
                        setFlippedCards([]);
                        setCheckingMatch(false);
                        resolve();
                    } else {
                        // No match - mark for flipping back
                        setPendingFlip([first, second]);
                        setCheckingMatch(false);
                        resolve();
                    }
                })
            );
        }
    };

    // Handle pending flips - clear flipped cards (user sees them during render)
    useEffect(() => {
        if (pendingFlip.length === 2) {
            // Clear immediately - cards were visible during render cycle
            setFlippedCards([]);
            setPendingFlip([]);
        }
    }, [pendingFlip.length]);

    const resetMemoryGame = () => {
        const newCards = initializeMemoryGame();
        setMemoryCards(newCards);
        setFlippedCards([]);
        setMatchedPairs([]);
        setMoves(0);
        setPendingFlip([]);
        setCheckingMatch(false);
    };

    // Initialize memory game if cards are empty
    useEffect(() => {
        if (memoryCards.length === 0 && activeDay === 2) {
            const newCards = initializeMemoryGame();
            setMemoryCards(newCards);
        }
    }, [activeDay, memoryCards.length, setMemoryCards]);

    // Snake game state (for day 3)
    const GRID_SIZE = 20;
    const [snake, setSnake] = useSyncedState<Array<{ x: number; y: number }>>('snakeBody', [{ x: 10, y: 10 }]);
    const [food, setFood] = useSyncedState<{ x: number; y: number }>('snakeFood', { x: 15, y: 15 });
    const [direction, setDirection] = useSyncedState<'UP' | 'DOWN' | 'LEFT' | 'RIGHT'>('snakeDirection', 'RIGHT');
    const [nextDirection, setNextDirection] = useSyncedState<'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | null>('snakeNextDirection', null);
    const [gameOver, setGameOver] = useSyncedState<boolean>('snakeGameOver', false);
    const [score, setScore] = useSyncedState<number>('snakeScore', 0);
    const [isPaused, setIsPaused] = useSyncedState<boolean>('snakePaused', true);
    const [gameStep, setGameStep] = useSyncedState<number>('snakeGameStep', 0);

    const generateFood = (): { x: number; y: number } => {
        let newFood;
        let attempts = 0;
        do {
            newFood = {
                x: Math.floor(Math.random() * GRID_SIZE),
                y: Math.floor(Math.random() * GRID_SIZE),
            };
            attempts++;
            if (attempts > 100) break; // Safety limit
        } while (snake.some(segment => segment.x === newFood.x && segment.y === newFood.y));
        return newFood;
    };

    const resetSnakeGame = () => {
        setSnake([{ x: 10, y: 10 }]);
        setFood(generateFood());
        setDirection('RIGHT');
        setNextDirection(null);
        setGameOver(false);
        setScore(0);
        setIsPaused(true);
        setGameStep(0);
    };

    const stepSnake = () => {
        if (!gameOver && !isPaused) {
            moveSnake();
        }
    };

    const changeDirection = (newDirection: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => {
        // Prevent reversing into itself
        const opposites: { [key: string]: string } = {
            'UP': 'DOWN',
            'DOWN': 'UP',
            'LEFT': 'RIGHT',
            'RIGHT': 'LEFT',
        };
        if (opposites[newDirection] !== direction) {
            setNextDirection(newDirection);
        }
    };

    const moveSnake = () => {
        if (gameOver || isPaused) return;

        const currentDir = nextDirection || direction;
        setDirection(currentDir);
        setNextDirection(null);

        const head = { ...snake[0] };
        switch (currentDir) {
            case 'UP':
                head.y -= 1;
                break;
            case 'DOWN':
                head.y += 1;
                break;
            case 'LEFT':
                head.x -= 1;
                break;
            case 'RIGHT':
                head.x += 1;
                break;
        }

        // Check wall collision
        if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
            setGameOver(true);
            setIsPaused(true);
            return;
        }

        // Check self collision
        if (snake.some(segment => segment.x === head.x && segment.y === head.y)) {
            setGameOver(true);
            setIsPaused(true);
            return;
        }

        const newSnake = [head, ...snake];

        // Check food collision
        if (head.x === food.x && head.y === food.y) {
            setScore(score + 1);
            setFood(generateFood());
        } else {
            newSnake.pop(); // Remove tail if no food eaten
        }

        setSnake(newSnake);
    };

    // Game loop for snake - automatic stepping when not paused
    useEffect(() => {
        if (activeDay !== 3 || isPaused || gameOver) return;

        // Move snake and schedule next step
        figma.widget.waitForTask(
            new Promise<void>((resolve) => {
                moveSnake();
                // Simple delay - will be minimal but allows game to progress
                resolve();
            })
        );

        // Schedule next step after a brief moment
        const nextStep = gameStep + 1;
        setTimeout(() => {
            if (activeDay === 3 && !isPaused && !gameOver) {
                setGameStep(nextStep);
            }
        }, 200);
    }, [activeDay, isPaused, gameOver, gameStep]);

    // Initialize snake game if needed
    useEffect(() => {
        if (activeDay === 3 && food.x === 15 && food.y === 15 && score === 0) {
            const newFood = generateFood();
            setFood(newFood);
        }
    }, [activeDay]);

    // Sequencer state (for day 4)
    type Track = {
        id: string;
        name: string;
        waveform: 'sine' | 'square' | 'sawtooth' | 'triangle';
        volume: number;
        pattern: (string | null)[]; // Array of notes or null for rest
        attack: number;
        release: number;
    };

    const [isPlaying, setIsPlaying] = useSyncedState<boolean>('sequencerPlaying', false);
    const [currentStep, setCurrentStep] = useSyncedState<number>('sequencerStep', 0);
    const [tempo, setTempo] = useSyncedState<number>('sequencerTempo', 120); // BPM
    const [tracks, setTracks] = useSyncedState<Track[]>('sequencerTracks', [
        {
            id: 'melody',
            name: '🔔 Melody',
            waveform: 'sine',
            volume: 0.6,
            attack: 0.01,
            release: 0.3,
            // Jingle Bells pattern (simplified)
            pattern: ['E4', 'E4', 'E4', null, 'E4', 'E4', 'E4', null, 'E4', 'G4', 'C4', 'D4', 'E4', null, null, null]
        },
        {
            id: 'bass',
            name: '🎸 Bass',
            waveform: 'square',
            volume: 0.7,
            attack: 0.05,
            release: 0.1,
            pattern: ['C3', null, 'C3', null, 'C3', null, 'C3', null, 'C3', null, 'C3', null, 'C3', null, null, null]
        },
        {
            id: 'pad',
            name: '☁️ Pad',
            waveform: 'triangle',
            volume: 0.4,
            attack: 0.3,
            release: 0.5,
            pattern: ['C4', null, null, null, 'G4', null, null, null, 'C4', null, null, null, 'G4', null, null, null]
        }
    ]);

    // Convert note name to frequency (C4 = 261.63 Hz)
    const noteToFrequency = (note: string): number => {
        const notes: { [key: string]: number } = {
            'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5,
            'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11
        };
        const match = note.match(/([A-G]#?)(\d)/);
        if (!match) return 261.63; // Default to C4

        const [, noteName, octave] = match;
        const semitones = notes[noteName] + (parseInt(octave) - 4) * 12;
        return 261.63 * Math.pow(2, semitones / 12);
    };

    const playTrackNote = (track: Track, note: string | null) => {
        if (!note) return;
        const frequency = noteToFrequency(note);
        playSynthNote(frequency, track.waveform, track.attack, track.release, track.volume);
    };

    // Sequencer step handler
    useEffect(() => {
        if (!isPlaying || activeDay !== 4) return;

        // Play all tracks at current step
        tracks.forEach(track => {
            const note = track.pattern[currentStep];
            if (note) {
                playTrackNote(track, note);
            }
        });

        // Schedule next step using waitForTask for better compatibility
        const stepDuration = (60 / tempo) * 1000; // Convert BPM to ms per step
        figma.widget.waitForTask(
            new Promise<void>((resolve) => {
                const timeout = setTimeout(() => {
                    if (isPlaying && activeDay === 4) {
                        const nextStep = (currentStep + 1) % 16; // Loop 16 steps
                        setCurrentStep(nextStep);
                    }
                    resolve();
                }, stepDuration);
            })
        );
    }, [isPlaying, currentStep, activeDay, tempo, tracks]);

    const togglePlay = () => {
        setIsPlaying(!isPlaying);
        if (!isPlaying) {
            setCurrentStep(0); // Reset to start when playing
        }
    };

    const updateTrackVolume = (trackId: string, volume: number) => {
        setTracks(tracks.map(t => t.id === trackId ? { ...t, volume } : t));
    };

    const updateTrackWaveform = (trackId: string, waveform: 'sine' | 'square' | 'sawtooth' | 'triangle') => {
        setTracks(tracks.map(t => t.id === trackId ? { ...t, waveform } : t));
    };

    const handleDayClick = (day: number) => {
        // Day 1 is active (Tic-Tac-Toe)
        if (day === 1) {
            if (!openDays.includes(day)) {
                setOpenDays([...openDays, day]);
            }
            setActiveDay(day);
            setView('EXPERIMENT');
            console.log(`Clicked day ${day}, navigating to EXPERIMENT`);
            return;
        }

        // Days 2-12 are disabled
        if (day >= 2 && day <= 12) {
            console.log(`Clicked day ${day}, but it is currently disabled.`);
            return;
        }

        // Days 13-24 open the Word Well (Feedback)
        if (day >= 13 && day <= 24) {
            if (!openDays.includes(day)) {
                setOpenDays([...openDays, day]);
            }
            setActiveDay(day);
            openWordWell();
            console.log(`Clicked day ${day}, opening Word Well`);
            return;
        }
    };

    const handleBackToGrid = () => {
        setView('GRID');
        setActiveDay(null);
    };

    // Round back button component matching grid style
    const renderBackButton = () => (
        <Frame
            x={80}
            y={80}
            width={70}
            height={70}
            fill="#4A1C52"
            cornerRadius={35}
            stroke="#D4AF37"
            strokeWidth={2}
            onClick={handleBackToGrid}
        >
            <AutoLayout
                width={70}
                height={70}
                horizontalAlignItems="center"
                verticalAlignItems="center"
            >
                <WidgetText
                    fontSize={32}
                    fontWeight={700}
                    fill="#D4AF37"
                >
                    ←
                </WidgetText>
            </AutoLayout>
        </Frame>
    );

    const openWordWell = () => {
        // Close audio player window if open (Word Well will replace it)
        if (audioPlayerWindow) {
            // Send close message to audio player
            figma.ui.postMessage({ type: 'CLOSE_AUDIO' });
            audioPlayerWindow = false;
            audioPlayerReady = false;
        }

        figma.widget.waitForTask(
            new Promise<void>((resolve) => {
                console.log('Opening Word Well UI...');

                let resolved = false;
                const cleanup = () => {
                    if (resolved) return;
                    resolved = true;
                    // Reinitialize audio player after Word Well closes
                    audioPlayerWindow = false;
                    audioPlayerReady = false;
                    figma.ui.onmessage = null;
                    resolve();
                };

                figma.ui.onmessage = (msg: any) => {
                    // Handle Word Well messages
                    if (msg.type === 'ADD_WORD') {
                        console.log('Widget received ADD_WORD:', msg);
                        const newWord: Word = {
                            id: Date.now().toString(),
                            text: msg.text,
                            votes: 0,
                            color: msg.color,
                        };
                        setWords((prev) => {
                            const updated = [...prev, newWord];
                            console.log('Widget updating words:', updated);
                            figma.ui.postMessage({ type: 'UPDATE_WORDS', words: updated });
                            return updated;
                        });
                    } else if (msg.type === 'VOTE_WORD') {
                        setWords((prev) => {
                            const updatedWords = prev.map((w: Word) =>
                                w.id === msg.id ? { ...w, votes: w.votes + 1 } : w
                            );
                            figma.ui.postMessage({ type: 'UPDATE_WORDS', words: updatedWords });
                            return updatedWords;
                        });
                    } else if (msg.type === 'READY') {
                        figma.ui.postMessage({ type: 'UPDATE_WORDS', words });
                    } else if (msg.type === 'CLOSE') {
                        figma.ui.close();
                        cleanup();
                    }
                };

                try {
                    figma.showUI(html, { width: 400, height: 700, title: 'The Word Well' });
                } catch (err) {
                    console.error('Error calling figma.showUI:', err);
                    cleanup();
                }
            })
        );
    };

    // Tic-Tac-Toe Game View (for day 1)
    const renderTicTacToe = () => (
        <Frame width={800} height={800}>
            <AutoLayout
                direction="vertical"
                width={800}
                height={800}
                padding={{ top: 60, left: 60, right: 60, bottom: 40 }}
                spacing={40}
                horizontalAlignItems="center"
            >
                {/* Header: Back Button, Title, Reset Button */}
                <AutoLayout
                    direction="horizontal"
                    width="fill-parent"
                    verticalAlignItems="center"
                    spacing={24}
                >
                    {/* Back Button */}
                    <AutoLayout
                        width={70}
                        height={70}
                        fill="#4A1C52"
                        cornerRadius={35}
                        stroke="#D4AF37"
                        strokeWidth={2}
                        horizontalAlignItems="center"
                        verticalAlignItems="center"
                        onClick={handleBackToGrid}
                    >
                        <WidgetText
                            fontSize={32}
                            fontWeight={700}
                            fill="#D4AF37"
                        >
                            ←
                        </WidgetText>
                    </AutoLayout>

                    {/* Spacer Left */}
                    <AutoLayout width="fill-parent" />

                    {/* Title */}
                    <WidgetText
                        fontSize={48}
                        fontWeight={900}
                        fill="#D4AF37"
                        effect={{
                            type: 'drop-shadow',
                            color: { r: 0, g: 0, b: 0, a: 0.5 },
                            offset: { x: 4, y: 4 },
                            blur: 4
                        }}
                    >
                        Tic-Tac-Toe
                    </WidgetText>

                    {/* Spacer Right */}
                    <AutoLayout width="fill-parent" />

                    {/* Reset Button */}
                    <AutoLayout
                        width={70}
                        height={70}
                        fill="#4A1C52"
                        cornerRadius={35}
                        stroke="#D4AF37"
                        strokeWidth={2}
                        horizontalAlignItems="center"
                        verticalAlignItems="center"
                        onClick={resetGame}
                    >
                        <WidgetText
                            fontSize={32}
                            fontWeight={700}
                            fill="#D4AF37"
                        >
                            ↻
                        </WidgetText>
                    </AutoLayout>
                </AutoLayout>

                {/* Game Board */}
                <AutoLayout
                    direction="vertical"
                    spacing={4}
                    horizontalAlignItems="center"
                >
                    {Array.from({ length: 3 }).map((_, row) => (
                        <AutoLayout
                            key={row}
                            direction="horizontal"
                            spacing={4}
                        >
                            {Array.from({ length: 3 }).map((_, col) => {
                                const index = row * 3 + col;
                                const cellValue = board[index];
                                return (
                                    <AutoLayout
                                        key={index}
                                        width={140}
                                        height={140}
                                        fill="#2D0A31"
                                        opacity={0.9} // Slightly transparent
                                        cornerRadius={8}
                                        stroke="#D4AF37"
                                        strokeWidth={2}
                                        horizontalAlignItems="center"
                                        verticalAlignItems="center"
                                        onClick={() => handleCellClick(index)}
                                    >
                                        <WidgetText
                                            fontSize={80}
                                            fontWeight={900}
                                            fill={cellValue === 'X' ? '#4A90E2' : cellValue === 'O' ? '#FF6B6B' : '#666'}
                                        >
                                            {cellValue || ''}
                                        </WidgetText>
                                    </AutoLayout>
                                );
                            })}
                        </AutoLayout>
                    ))}
                </AutoLayout>

                {/* Game Status (Moved to Bottom) */}
                <AutoLayout
                    direction="vertical"
                    spacing={8}
                    horizontalAlignItems="center"
                    padding={{ top: 16, bottom: 16, left: 32, right: 32 }}
                    fill="#1E1E1E" // Darker background for readability
                    cornerRadius={16}
                    opacity={0.8}
                >
                    {winner ? (
                        <WidgetText
                            fontSize={24}
                            fontWeight={700}
                            fill={winner === 'TIE' ? '#AAA' : '#D4AF37'}
                        >
                            {winner === 'TIE' ? "It's a Tie!" : `Player ${winner} Wins!`}
                        </WidgetText>
                    ) : (
                        <WidgetText
                            fontSize={24}
                            fontWeight={700}
                            fill="#FFFFFF"
                        >
                            Player {currentPlayer}'s Turn
                        </WidgetText>
                    )}
                </AutoLayout>
            </AutoLayout>
        </Frame>
    );

    // Memory Game View (for day 2)
    const renderMemoryGame = () => {
        const isGameComplete = matchedPairs.length === 8; // 4 pairs = 8 cards
        const emojiMap: { [key: number]: string } = {
            1: '⭐', 2: '🎄', 3: '🎁', 4: '❄️'
        };

        return (
            <Frame width={800} height={800}>
                <AutoLayout
                    direction="vertical"
                    width={800}
                    height={800}
                    padding={40}
                    spacing={24}
                    horizontalAlignItems="center"
                    verticalAlignItems="center"
                >
                    <WidgetText
                        fontSize={48}
                        fontWeight={900}
                        fill="#D4AF37"
                    >
                        Memory Game
                    </WidgetText>

                    {/* Game Stats */}
                    <AutoLayout
                        direction="horizontal"
                        spacing={24}
                        horizontalAlignItems="center"
                    >
                        <WidgetText
                            fontSize={20}
                            fill="#FFFFFF"
                        >
                            Moves: {moves}
                        </WidgetText>
                        <WidgetText
                            fontSize={20}
                            fill="#FFFFFF"
                        >
                            Pairs: {matchedPairs.length / 2}/4
                        </WidgetText>
                    </AutoLayout>

                    {/* Game Status */}
                    {isGameComplete && (
                        <WidgetText
                            fontSize={32}
                            fontWeight={700}
                            fill="#D4AF37"
                        >
                            🎉 You Win! 🎉
                        </WidgetText>
                    )}

                    {/* Game Board - 3x3 grid */}
                    <AutoLayout
                        direction="vertical"
                        spacing={8}
                        horizontalAlignItems="center"
                    >
                        {Array.from({ length: 3 }).map((_, row) => (
                            <AutoLayout
                                key={row}
                                direction="horizontal"
                                spacing={8}
                            >
                                {Array.from({ length: 3 }).map((_, col) => {
                                    const index = row * 3 + col;
                                    const isFlipped = flippedCards.includes(index);
                                    const isMatched = matchedPairs.includes(index);
                                    const cardValue = memoryCards[index];
                                    const showValue = isFlipped || isMatched;
                                    const isEmpty = !cardValue;

                                    return (
                                        <AutoLayout
                                            key={index}
                                            width={160}
                                            height={160}
                                            fill={isEmpty ? '#1E1E1E' : isMatched ? '#2D5A27' : showValue ? '#2D0A31' : '#4A1C52'}
                                            cornerRadius={12}
                                            stroke={isEmpty ? '#333' : isMatched ? '#4CAF50' : '#D4AF37'}
                                            strokeWidth={2}
                                            horizontalAlignItems="center"
                                            verticalAlignItems="center"
                                            onClick={isEmpty ? undefined : () => handleMemoryCardClick(index)}
                                        >
                                            {isEmpty ? (
                                                <WidgetText
                                                    fontSize={24}
                                                    fontWeight={700}
                                                    fill="#666"
                                                >
                                                    Empty
                                                </WidgetText>
                                            ) : showValue ? (
                                                <WidgetText
                                                    fontSize={72}
                                                    fontWeight={900}
                                                    fill="#FFFFFF"
                                                >
                                                    {emojiMap[cardValue] || '?'}
                                                </WidgetText>
                                            ) : (
                                                <WidgetText
                                                    fontSize={48}
                                                    fontWeight={700}
                                                    fill="#D4AF37"
                                                >
                                                    ?
                                                </WidgetText>
                                            )}
                                        </AutoLayout>
                                    );
                                })}
                            </AutoLayout>
                        ))}
                    </AutoLayout>

                    {/* Reset Button */}
                    <AutoLayout
                        onClick={resetMemoryGame}
                        padding={16}
                        fill="#4A90E2"
                        cornerRadius={12}
                        horizontalAlignItems="center"
                    >
                        <WidgetText fill="#FFF" fontSize={18} fontWeight="bold">
                            New Game
                        </WidgetText>
                    </AutoLayout>
                </AutoLayout>
                {renderBackButton()}
            </Frame>
        );
    };

    // Snake Game View (for day 3)
    const renderSnakeGame = () => {
        const CELL_SIZE = 30;
        const BOARD_SIZE = GRID_SIZE * CELL_SIZE;

        return (
            <Frame width={800} height={800}>
                <AutoLayout
                    direction="vertical"
                    width={800}
                    height={800}
                    padding={40}
                    spacing={24}
                    horizontalAlignItems="center"
                    verticalAlignItems="center"
                >
                    <WidgetText
                        fontSize={48}
                        fontWeight={900}
                        fill="#D4AF37"
                    >
                        Snake Game
                    </WidgetText>

                    {/* Game Stats */}
                    <AutoLayout
                        direction="horizontal"
                        spacing={24}
                        horizontalAlignItems="center"
                    >
                        <WidgetText
                            fontSize={20}
                            fill="#FFFFFF"
                        >
                            Score: {score}
                        </WidgetText>
                        <WidgetText
                            fontSize={20}
                            fill="#FFFFFF"
                        >
                            Length: {snake.length}
                        </WidgetText>
                    </AutoLayout>

                    {/* Game Status */}
                    {gameOver && (
                        <WidgetText
                            fontSize={32}
                            fontWeight={700}
                            fill="#FF6B6B"
                        >
                            Game Over!
                        </WidgetText>
                    )}

                    {/* Game Board */}
                    <Frame
                        width={BOARD_SIZE + 4}
                        height={BOARD_SIZE + 4}
                        fill="#1E1E1E"
                        stroke="#D4AF37"
                        strokeWidth={2}
                    >
                        {Array.from({ length: GRID_SIZE }).map((_, row) =>
                            Array.from({ length: GRID_SIZE }).map((_, col) => {
                                const isSnake = snake.some(segment => segment.x === col && segment.y === row);
                                const isHead = snake[0]?.x === col && snake[0]?.y === row;
                                const isFood = food.x === col && food.y === row;

                                return (
                                    <Frame
                                        key={`${row}-${col}`}
                                        x={col * CELL_SIZE + 2}
                                        y={row * CELL_SIZE + 2}
                                        width={CELL_SIZE - 2}
                                        height={CELL_SIZE - 2}
                                        fill={
                                            isHead ? '#4A90E2' :
                                                isSnake ? '#2D5A27' :
                                                    isFood ? '#FF6B6B' :
                                                        '#2D0A31'
                                        }
                                        cornerRadius={isSnake || isFood ? 4 : 0}
                                    />
                                );
                            })
                        )}
                    </Frame>

                    {/* Direction Controls */}
                    <AutoLayout
                        direction="vertical"
                        spacing={8}
                        horizontalAlignItems="center"
                    >
                        {/* Up Button */}
                        <AutoLayout
                            onClick={() => changeDirection('UP')}
                            padding={12}
                            fill="#4A90E2"
                            cornerRadius={8}
                            horizontalAlignItems="center"
                        >
                            <WidgetText fill="#FFF" fontSize={24} fontWeight="bold">
                                ↑
                            </WidgetText>
                        </AutoLayout>

                        {/* Left/Right Buttons */}
                        <AutoLayout
                            direction="horizontal"
                            spacing={8}
                        >
                            <AutoLayout
                                onClick={() => changeDirection('LEFT')}
                                padding={12}
                                fill="#4A90E2"
                                cornerRadius={8}
                                horizontalAlignItems="center"
                            >
                                <WidgetText fill="#FFF" fontSize={24} fontWeight="bold">
                                    ←
                                </WidgetText>
                            </AutoLayout>
                            <AutoLayout
                                onClick={() => changeDirection('RIGHT')}
                                padding={12}
                                fill="#4A90E2"
                                cornerRadius={8}
                                horizontalAlignItems="center"
                            >
                                <WidgetText fill="#FFF" fontSize={24} fontWeight="bold">
                                    →
                                </WidgetText>
                            </AutoLayout>
                        </AutoLayout>

                        {/* Down Button */}
                        <AutoLayout
                            onClick={() => changeDirection('DOWN')}
                            padding={12}
                            fill="#4A90E2"
                            cornerRadius={8}
                            horizontalAlignItems="center"
                        >
                            <WidgetText fill="#FFF" fontSize={24} fontWeight="bold">
                                ↓
                            </WidgetText>
                        </AutoLayout>
                    </AutoLayout>

                    {/* Control Buttons */}
                    <AutoLayout
                        direction="horizontal"
                        spacing={16}
                    >
                        <AutoLayout
                            onClick={() => setIsPaused(!isPaused)}
                            padding={16}
                            fill={isPaused ? '#4CAF50' : '#FF9800'}
                            cornerRadius={12}
                            horizontalAlignItems="center"
                        >
                            <WidgetText fill="#FFF" fontSize={18} fontWeight="bold">
                                {isPaused ? 'Start' : 'Pause'}
                            </WidgetText>
                        </AutoLayout>

                        {isPaused && !gameOver && (
                            <AutoLayout
                                onClick={stepSnake}
                                padding={16}
                                fill="#9C27B0"
                                cornerRadius={12}
                                horizontalAlignItems="center"
                            >
                                <WidgetText fill="#FFF" fontSize={18} fontWeight="bold">
                                    Step
                                </WidgetText>
                            </AutoLayout>
                        )}

                        <AutoLayout
                            onClick={resetSnakeGame}
                            padding={16}
                            fill="#4A90E2"
                            cornerRadius={12}
                            horizontalAlignItems="center"
                        >
                            <WidgetText fill="#FFF" fontSize={18} fontWeight="bold">
                                Reset
                            </WidgetText>
                        </AutoLayout>
                    </AutoLayout>
                </AutoLayout>
                {renderBackButton()}
            </Frame>
        );
    };

    // Sequencer View (for day 4)
    const renderSynth = () => {
        const waveformOptions: Array<'sine' | 'square' | 'sawtooth' | 'triangle'> = ['sine', 'square', 'sawtooth', 'triangle'];
        const waveformLabels = ['Sine', 'Square', 'Saw', 'Tri'];
        const volumeOptions = [0.3, 0.5, 0.7, 0.9];
        const tempoOptions = [90, 120, 140, 160];

        return (
            <Frame width={800} height={800}>
                <AutoLayout
                    direction="vertical"
                    width={800}
                    height={800}
                    padding={20}
                    spacing={12}
                    horizontalAlignItems="center"
                    verticalAlignItems="center"
                >
                    <WidgetText
                        fontSize={36}
                        fontWeight={900}
                        fill="#D4AF37"
                    >
                        🎄 Sequencer 🎄
                    </WidgetText>

                    {/* Play Controls */}
                    <AutoLayout
                        direction="horizontal"
                        spacing={16}
                        horizontalAlignItems="center"
                    >
                        <AutoLayout
                            onClick={togglePlay}
                            padding={16}
                            fill={isPlaying ? '#FF6B6B' : '#4CAF50'}
                            cornerRadius={12}
                            horizontalAlignItems="center"
                        >
                            <WidgetText fill="#FFF" fontSize={18} fontWeight="bold">
                                {isPlaying ? '⏸ Pause' : '▶ Play'}
                            </WidgetText>
                        </AutoLayout>

                        <AutoLayout
                            direction="vertical"
                            spacing={4}
                            horizontalAlignItems="center"
                        >
                            <WidgetText fontSize={12} fill="#FFFFFF">
                                Tempo: {tempo} BPM
                            </WidgetText>
                            <AutoLayout
                                direction="horizontal"
                                spacing={6}
                            >
                                {tempoOptions.map((bpm) => (
                                    <AutoLayout
                                        key={bpm}
                                        onClick={() => setTempo(bpm)}
                                        padding={6}
                                        fill={tempo === bpm ? '#4A90E2' : '#2D0A31'}
                                        cornerRadius={6}
                                        horizontalAlignItems="center"
                                    >
                                        <WidgetText fill="#FFF" fontSize={11}>
                                            {bpm}
                                        </WidgetText>
                                    </AutoLayout>
                                ))}
                            </AutoLayout>
                        </AutoLayout>
                    </AutoLayout>

                    {/* Tracks */}
                    <AutoLayout
                        direction="vertical"
                        spacing={12}
                        width={760}
                    >
                        {tracks.map((track) => (
                            <AutoLayout
                                key={track.id}
                                direction="vertical"
                                spacing={8}
                                padding={12}
                                fill="#2D0A31"
                                cornerRadius={8}
                            >
                                {/* Track Header */}
                                <AutoLayout
                                    direction="horizontal"
                                    spacing={12}
                                    horizontalAlignItems="center"
                                >
                                    <WidgetText fontSize={16} fill="#D4AF37" fontWeight={700}>
                                        {track.name}
                                    </WidgetText>

                                    {/* Waveform Selector */}
                                    <AutoLayout
                                        direction="horizontal"
                                        spacing={4}
                                    >
                                        {waveformOptions.map((wf) => (
                                            <AutoLayout
                                                key={wf}
                                                onClick={() => updateTrackWaveform(track.id, wf)}
                                                padding={6}
                                                fill={track.waveform === wf ? '#4A90E2' : '#1E1E1E'}
                                                cornerRadius={4}
                                                horizontalAlignItems="center"
                                            >
                                                <WidgetText fill="#FFF" fontSize={10} fontWeight="bold">
                                                    {waveformLabels[waveformOptions.indexOf(wf)][0]}
                                                </WidgetText>
                                            </AutoLayout>
                                        ))}
                                    </AutoLayout>

                                    {/* Volume Control */}
                                    <AutoLayout
                                        direction="horizontal"
                                        spacing={4}
                                    >
                                        {volumeOptions.map((vol) => (
                                            <AutoLayout
                                                key={vol}
                                                onClick={() => updateTrackVolume(track.id, vol)}
                                                padding={6}
                                                fill={Math.abs(track.volume - vol) < 0.05 ? '#4CAF50' : '#1E1E1E'}
                                                cornerRadius={4}
                                                horizontalAlignItems="center"
                                            >
                                                <WidgetText fill="#FFF" fontSize={10}>
                                                    {Math.round(vol * 100)}%
                                                </WidgetText>
                                            </AutoLayout>
                                        ))}
                                    </AutoLayout>
                                </AutoLayout>

                                {/* Step Sequencer Grid */}
                                <AutoLayout
                                    direction="horizontal"
                                    spacing={4}
                                >
                                    {Array.from({ length: 16 }).map((_, step) => {
                                        const note = track.pattern[step];
                                        const isActive = currentStep === step && isPlaying;
                                        return (
                                            <AutoLayout
                                                key={step}
                                                width={40}
                                                height={40}
                                                fill={
                                                    isActive ? '#FFD700' :
                                                        note ? '#4A90E2' :
                                                            '#1E1E1E'
                                                }
                                                cornerRadius={4}
                                                stroke={isActive ? '#FFD700' : '#333'}
                                                strokeWidth={isActive ? 2 : 1}
                                                horizontalAlignItems="center"
                                                verticalAlignItems="center"
                                            >
                                                <WidgetText
                                                    fill={note ? '#FFF' : '#666'}
                                                    fontSize={10}
                                                    fontWeight="bold"
                                                >
                                                    {note ? note.replace('4', '').replace('3', '').replace('5', '') : '·'}
                                                </WidgetText>
                                            </AutoLayout>
                                        );
                                    })}
                                </AutoLayout>
                            </AutoLayout>
                        ))}
                    </AutoLayout>
                </AutoLayout>
                {renderBackButton()}
            </Frame>
        );
    };

    // Experiment Details View
    const renderExperimentView = () => {
        // Show tic-tac-toe for day 1, memory game for day 2, snake for day 3, synth for day 4, otherwise show regular experiment details
        if (activeDay === 1) {
            return renderTicTacToe();
        }
        if (activeDay === 2) {
            return renderMemoryGame();
        }
        if (activeDay === 3) {
            return renderSnakeGame();
        }
        if (activeDay === 4) {
            return renderSynth();
        }

        return (
            <Frame width={800} height={800}>
                <AutoLayout
                    direction="vertical"
                    width={800}
                    height={800}
                    padding={40}
                    spacing={24}
                    horizontalAlignItems="center"
                    verticalAlignItems="center"
                >
                    <WidgetText
                        fontSize={48}
                        fontWeight={900}
                        fill="#D4AF37"
                    >
                        Experiment Details
                    </WidgetText>

                    <WidgetText
                        fontSize={24}
                        fill="#FFFFFF"
                        horizontalAlignText="center"
                    >
                        Day {activeDay}
                    </WidgetText>

                    <AutoLayout
                        direction="vertical"
                        spacing={16}
                        width={600}
                        horizontalAlignItems="center"
                    >
                        <WidgetText
                            fontSize={18}
                            fill="#D4AF37"
                            horizontalAlignText="center"
                        >
                            This is the experiment details page for day {activeDay}.
                        </WidgetText>
                        <WidgetText
                            fontSize={16}
                            fill="#AAA"
                            horizontalAlignText="center"
                        >
                            More details and content will go here.
                        </WidgetText>
                    </AutoLayout>
                </AutoLayout>
                {renderBackButton()}
            </Frame>
        );
    };


    // Grid View
    const renderGridView = () => (
        <AutoLayout
            direction="vertical"
            width={800}
            height={800}
            padding={40}
            spacing={24}
            horizontalAlignItems="center"
            verticalAlignItems="center"
        >
            {/* Header Badge */}
            <WidgetImage
                src={ADVENT_CALENDAR_BADGE_URL}
                width={262}
                height={90}
            />

            {/* Calendar Grid */}
            <AutoLayout
                direction="vertical"
                spacing={12}
                width={720}
                horizontalAlignItems="center"
                verticalAlignItems="center"
            >
                {/* Render rows of 6 */}
                {Array.from({ length: 4 }).map((_, rowIndex) => (
                    <AutoLayout
                        key={rowIndex}
                        direction="horizontal"
                        spacing={12}
                    >
                        {Array.from({ length: 6 }).map((_, colIndex) => {
                            const day = rowIndex * 6 + colIndex + 1;
                            const isOpen = openDays.includes(day);
                            const isDisabled = day >= 2 && day <= 12;
                            return (
                                <AutoLayout
                                    key={day}
                                    width={100}
                                    height={120}
                                    cornerRadius={12}
                                    fill={isOpen ? '#2D0A31' : '#4A1C52'}
                                    horizontalAlignItems="center"
                                    verticalAlignItems="center"
                                    onClick={isDisabled ? undefined : () => handleDayClick(day)}
                                >
                                    <WidgetText
                                        fontSize={32}
                                        fontWeight={700}
                                        fill={isOpen ? '#FFFFFF' : '#D4AF37'}
                                    >
                                        {day.toString()}
                                    </WidgetText>
                                </AutoLayout>
                            );
                        })}
                    </AutoLayout>
                ))}
            </AutoLayout>
        </AutoLayout>
    );

    return (
        <Frame
            width={800}
            height={800}
            fill="#1E1E1E"
            cornerRadius={24}
        >
            {/* Background Image - 800x800 matches Frame perfectly */}
            {gridBackgroundHash && (
                <WidgetImage
                    src={GRID_BACKGROUND_URL}
                    width={800}
                    height={800}
                />
            )}
            {/* Conditional rendering based on view */}
            {view === 'GRID' && renderGridView()}
            {view === 'EXPERIMENT' && renderExperimentView()}
        </Frame>
    );
}

figma.widget.register(AdventCalendar);
