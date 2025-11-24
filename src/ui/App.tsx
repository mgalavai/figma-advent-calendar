import React, { useState, useEffect, useRef } from 'react';
import Matter from 'matter-js';
// import html2canvas from 'html2canvas';
import './App.css';
// import backgroundImage from './background.jpg';
const backgroundImage = 'https://raw.githubusercontent.com/mgalavai/figma-advent-calendar/main/src/ui/background.jpg';

interface Word {
    id: string;
    text: string;
    votes: number;
    color: string;
}

function App() {
    const [words, setWords] = useState<Word[]>([]);
    const [inputValue, setInputValue] = useState('');
    const sceneRef = useRef<HTMLDivElement>(null);
    const engineRef = useRef<Matter.Engine | null>(null);
    const bodiesRef = useRef<Map<string, Matter.Body>>(new Map());
    const requestRef = useRef<number | null>(null);

    useEffect(() => {
        // Initialize Matter.js
        const Engine = Matter.Engine,
            Render = Matter.Render,
            Runner = Matter.Runner,
            Bodies = Matter.Bodies,
            Composite = Matter.Composite,
            Mouse = Matter.Mouse,
            MouseConstraint = Matter.MouseConstraint;

        const engine = Engine.create();
        engineRef.current = engine;

        // Create renderer (hidden, just for mouse interaction mapping)
        const render = Render.create({
            element: sceneRef.current!,
            engine: engine,
            options: {
                width: 400,
                height: 700,
                background: 'transparent',
                wireframes: false,
                showAngleIndicator: false
            }
        });

        // Walls - adjusted to account for ball radius to prevent overflow
        // Account for max ball size (40 + 3 votes * 10 = 70px, radius = 35px)
        // Scene is 400x700px, so walls should constrain balls within bounds
        const maxBallRadius = 35;
        const wallOptions = { isStatic: true, render: { visible: false } };
        // Ground at bottom minus radius
        const ground = Bodies.rectangle(200, 700 - maxBallRadius, 400, 20, wallOptions);
        // Left wall at radius position
        const leftWall = Bodies.rectangle(maxBallRadius, 350, 20, 700, wallOptions);
        // Right wall at width minus radius
        const rightWall = Bodies.rectangle(400 - maxBallRadius, 350, 20, 700, wallOptions);
        // Ceiling at top plus radius
        const ceiling = Bodies.rectangle(200, maxBallRadius, 400, 20, wallOptions);

        Composite.add(engine.world, [ground, leftWall, rightWall, ceiling]);

        // Mouse Control
        // Attach mouse to the scene container (div) instead of the canvas
        // This ensures clicks on DOM elements (orbs) are captured by Matter.js
        const mouse = Mouse.create(sceneRef.current!);
        const mouseConstraint = MouseConstraint.create(engine, {
            mouse: mouse,
            constraint: {
                stiffness: 0.2,
                render: { visible: false }
            }
        });
        Composite.add(engine.world, mouseConstraint);

        // Keep the mouse in sync with rendering
        render.mouse = mouse;

        // Start the engine
        const runner = Runner.create();
        Runner.run(runner, engine);

        // Custom Render Loop for DOM elements with bounds checking
        const updateLoop = () => {
            bodiesRef.current.forEach((body, id) => {
                const element = document.getElementById(id);
                if (element) {
                    let { x, y } = body.position;
                    const radius = (body as any).circleRadius || 35;
                    const angle = body.angle;
                    
                    // Constrain position to keep ball center within bounds
                    // Ball center must be at least 'radius' from each edge
                    x = Math.max(radius, Math.min(400 - radius, x));
                    y = Math.max(radius, Math.min(700 - radius, y));
                    
                    // Update physics body position if constrained
                    if (x !== body.position.x || y !== body.position.y) {
                        Matter.Body.setPosition(body, { x, y });
                    }
                    
                    element.style.transform = `translate(${x - radius}px, ${y - radius}px) rotate(${angle}rad)`;
                }
            });
            requestRef.current = requestAnimationFrame(updateLoop);
        };
        requestRef.current = requestAnimationFrame(updateLoop);

        // Listen for messages
        window.onmessage = (event) => {
            const msg = event.data.pluginMessage;
            console.log('UI received message:', msg);
            if (msg?.type === 'UPDATE_WORDS') {
                console.log('UI updating words state:', msg.words);
                setWords(msg.words);
            }
        };

        // Notify ready
        parent.postMessage({ pluginMessage: { type: 'READY' } }, '*');

        return () => {
            Runner.stop(runner);
            Engine.clear(engine);
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, []);

    // Sync Words with Physics Bodies
    useEffect(() => {
        if (!engineRef.current) return;

        const world = engineRef.current.world;
        const bodies = bodiesRef.current;

        // Add new bodies
        words.forEach(word => {
            if (!bodies.has(word.id)) {
                console.log('Creating physics body for word:', word.id);
                const size = 40 + (word.votes * 10);
                const radius = size / 2;
                const body = Matter.Bodies.circle(
                    Math.random() * 300 + 50, // Random X
                    -100, // Start above screen to "fall into the well"
                    radius,
                    {
                        restitution: 0.6, // Bouncy but settling
                        friction: 0.1,    // Allow some sliding
                        frictionAir: 0.02, // Air resistance to slow down movement
                        density: 0.04,
                        render: { visible: false }
                    }
                );

                // Store radius for rendering offset
                (body as any).circleRadius = radius;

                Matter.Composite.add(world, body);
                bodies.set(word.id, body);
            } else {
                // Update size if votes changed
                const body = bodies.get(word.id)!;
                const currentRadius = (body as any).circleRadius;
                const newSize = 40 + (word.votes * 10);
                const newRadius = newSize / 2;

                if (currentRadius !== newRadius) {
                    const { x, y } = body.position;
                    
                    // Scale the body
                    Matter.Body.scale(body, newRadius / currentRadius, newRadius / currentRadius);
                    (body as any).circleRadius = newRadius;
                    
                    // Constrain position after scaling to prevent overflow
                    // Ball center must be at least 'newRadius' from each edge
                    let constrainedX = Math.max(newRadius, Math.min(400 - newRadius, x));
                    let constrainedY = Math.max(newRadius, Math.min(700 - newRadius, y));
                    Matter.Body.setPosition(body, { x: constrainedX, y: constrainedY });
                }
            }
        });

        // Remove old bodies (optional, if words can be deleted)
    }, [words]);

    const handleAddWord = () => {
        if (!inputValue.trim()) return;

        const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEEAD', '#D4A5A5', '#9B59B6', '#3498DB'];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];

        console.log('UI sending ADD_WORD:', inputValue.trim());
        parent.postMessage({
            pluginMessage: {
                type: 'ADD_WORD',
                text: inputValue.trim(),
                color: randomColor
            }
        }, '*');
        setInputValue('');
    };

    const handleVote = (id: string) => {
        parent.postMessage({ pluginMessage: { type: 'VOTE_WORD', id } }, '*');
    };

    const handleClose = async () => {
        if (sceneRef.current) {
            try {
                /*
                const canvas = await html2canvas(document.body, {
                    background: 'transparent', // Preserve transparency/background
                    scale: 1, // Adjust if needed
                    logging: false
                });
                const dataUrl = canvas.toDataURL('image/png');
                parent.postMessage({
                    pluginMessage: {
                        type: 'SAVE_SNAPSHOT',
                        imageData: dataUrl
                    }
                }, '*');
                */
            } catch (error) {
                console.error('Snapshot failed:', error);
            }
        }
        parent.postMessage({ pluginMessage: { type: 'CLOSE' } }, '*');
    };

    return (
        <div className="container" style={{
            backgroundImage: `url(${backgroundImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
        }}>
            <div ref={sceneRef} className="scene" style={{ position: 'absolute', top: 0, left: 0, width: '400px', height: '700px', overflow: 'hidden' }}>
                {words.map((word) => {
                    const size = 40 + (word.votes * 10);
                    return (
                        <div
                            key={word.id}
                            id={word.id}
                            className="orb"
                            onClick={() => handleVote(word.id)}
                            style={{
                                width: `${size}px`,
                                height: `${size}px`,
                                '--orb-color': word.color, // Pass color as CSS variable
                                fontSize: `${Math.min(16 + word.votes * 2, 32)}px`,
                                // Initial position off-screen or handled by physics
                                top: 0,
                                left: 0,
                                position: 'absolute',
                                willChange: 'transform'
                            } as React.CSSProperties}
                            title={`Votes: ${word.votes}`}
                        >
                            {word.text}
                        </div>
                    );
                })}
            </div>

            <div className="controls">
                <div 
                    onClick={handleClose}
                    style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        cursor: 'pointer',
                        background: '#4A1C52',
                        border: '2px solid #D4AF37',
                        boxSizing: 'border-box',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#D4AF37',
                        fontSize: '18px',
                        fontWeight: 'bold',
                        flexShrink: 0,
                        transition: 'transform 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                    ←
                </div>
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Drop a word..."
                    onKeyDown={(e) => e.key === 'Enter' && handleAddWord()}
                />
                <button onClick={handleAddWord}>Drop</button>
            </div>
        </div>
    );
}

export default App;
