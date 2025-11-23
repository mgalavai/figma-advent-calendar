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

        // Walls
        const wallOptions = { isStatic: true, render: { visible: false } };
        const ground = Bodies.rectangle(200, 710, 400, 20, wallOptions);
        const leftWall = Bodies.rectangle(-10, 350, 20, 700, wallOptions);
        const rightWall = Bodies.rectangle(410, 350, 20, 700, wallOptions);
        // Removed ceiling to allow falling in from top if needed, but kept for containment if they spawn inside
        // Actually, let's keep ceiling but make it higher so they can spawn below it or fall in? 
        // User said "fall into the well on load". Let's spawn them high up.
        // For now, keep ceiling as is to prevent flying out, but maybe move it up?
        // Let's just keep the container closed for now as they spawn inside.
        const ceiling = Bodies.rectangle(200, -200, 400, 20, wallOptions);

        Composite.add(engine.world, [ground, leftWall, rightWall, ceiling]);

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

        // Custom Render Loop for DOM elements
        const updateLoop = () => {
            bodiesRef.current.forEach((body, id) => {
                const element = document.getElementById(id);
                if (element) {
                    const { x, y } = body.position;
                    const angle = body.angle;
                    element.style.transform = `translate(${x - body.circleRadius!}px, ${y - body.circleRadius!}px) rotate(${angle}rad)`;
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
                    Matter.Body.scale(body, newRadius / currentRadius, newRadius / currentRadius);
                    (body as any).circleRadius = newRadius;
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
            <div style={{
                position: 'absolute',
                top: 20,
                right: 20,
                cursor: 'pointer',
                background: 'rgba(255,255,255,0.1)',
                padding: '8px 12px',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '12px',
                zIndex: 1000
            }} onClick={handleClose}>
                Close UI
            </div>

            <div ref={sceneRef} className="scene" style={{ position: 'relative', width: '400px', height: '700px', overflow: 'hidden' }}>
                {/* Render Canvas (hidden by CSS usually, but we keep it for mouse events) */}

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
