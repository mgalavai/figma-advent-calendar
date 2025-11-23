const { AutoLayout, Text: WidgetText, useSyncedState } = figma.widget;
import * as React from 'react';

// @ts-ignore
import html from '../../dist/index.html';
import { gridBackground } from './assets';

interface Word {
    id: string;
    text: string;
    votes: number;
    color: string;
}

let activeUICleanup: (() => void) | null = null;

figma.on('close', () => {
    if (activeUICleanup) {
        activeUICleanup();
    }
});

function AdventCalendar() {
    // State for the calendar grid
    const [openDays, setOpenDays] = useSyncedState<number[]>('openDays', []);
    const [view, setView] = useSyncedState<string>('view', 'GRID'); // 'GRID' or 'EXPERIMENT'
    const [activeDay, setActiveDay] = useSyncedState<number | null>('activeDay', null);

    // Sidebar State
    const [isSidebarOpen, setSidebarOpen] = useSyncedState<boolean>('isSidebarOpen', false);

    // State for Word Well
    const [words, setWords] = useSyncedState<Word[]>('words', []);
    const [sidebarSnapshot, setSidebarSnapshot] = useSyncedState<string | null>('sidebarSnapshot', null);

    // 24 Days Configuration
    const days = Array.from({ length: 24 }, (_, i) => i + 1);

    // Keep-alive resolver for the current UI session
    const waitForTask = figma.widget.waitForTask;

    const handleDayClick = (day: number) => {
        if (!openDays.includes(day)) {
            setOpenDays([...openDays, day]);
        }
        setActiveDay(day);
    };

    // ...

    const openWordWell = () => {
        if (activeUICleanup) {
            return;
        }

        figma.widget.waitForTask(
            new Promise<void>((resolve) => {
                console.log('Opening Word Well UI...');

                let resolved = false;
                const cleanup = () => {
                    if (resolved) {
                        return;
                    }
                    resolved = true;
                    if (activeUICleanup === cleanup) {
                        activeUICleanup = null;
                    }
                    figma.ui.onmessage = null;
                    resolve();
                };

                activeUICleanup = cleanup;

                figma.ui.onmessage = (msg: any) => {
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
                            const updatedWords = prev.map((w: Word) => w.id === msg.id ? { ...w, votes: w.votes + 1 } : w);
                            figma.ui.postMessage({ type: 'UPDATE_WORDS', words: updatedWords });
                            return updatedWords;
                        });
                    } else if (msg.type === 'SAVE_SNAPSHOT') {
                        console.log('Widget received SAVE_SNAPSHOT');
                        setSidebarSnapshot(msg.imageData);
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




    // ...

    return (
        <AutoLayout
            direction="horizontal"
            padding={0}
            fill="#1E1E1E"
            /*
            fill={{
                type: 'image',
                src: gridBackground,
                scaleMode: 'FILL',
            }}
            */
            cornerRadius={24}
            spacing={0}
            effect={{
                type: 'drop-shadow',
                color: { r: 0, g: 0, b: 0, a: 0.3 },
                offset: { x: 0, y: 10 },
                blur: 20,
            }}
            stroke="#333"
            strokeWidth={1}
        >
            {/* MAIN GRID AREA */}
            <AutoLayout
                direction="vertical"
                padding={40}
                spacing={32}
                width={680}
            >
                <WidgetText
                    fill="#FFF"
                    fontSize={42}
                    fontWeight="bold"
                    fontFamily="Inter"
                    horizontalAlignText="center"
                    width="fill-parent"
                >
                    Advent Calendar
                </WidgetText>

                <AutoLayout
                    direction="horizontal"
                    wrap={true}
                    spacing={40}
                    width="fill-parent"
                    horizontalAlignItems="center"
                >
                    {days.map((day) => {
                        const isOpen = openDays.includes(day);
                        return (
                            <AutoLayout
                                key={day}
                                width={120}
                                height={120}
                                fill={isOpen ? '#4A90E2' : '#2C2C2C'}
                                cornerRadius={16}
                                horizontalAlignItems="center"
                                verticalAlignItems="center"
                                onClick={() => handleDayClick(day)}
                                hoverStyle={{ fill: isOpen ? '#357ABD' : '#3D3D3D' }}
                                stroke={isOpen ? '#4A90E2' : '#444'}
                                strokeWidth={1}
                            >
                                <WidgetText
                                    fill={isOpen ? '#FFF' : '#888'}
                                    fontSize={40}
                                    fontWeight="bold"
                                >
                                    {day}
                                </WidgetText>
                            </AutoLayout>
                        );
                    })}
                </AutoLayout>
            </AutoLayout>

            {/* SIDEBAR DIVIDER */}
            <AutoLayout
                width={1}
                height="fill-parent"
                fill="#333"
            />

            {/* SIDEBAR */}
            <AutoLayout
                direction="vertical"
                width={400}
                height="fill-parent"
                fill="#2D3436"
                padding={32}
                horizontalAlignItems="center"
                verticalAlignItems="start"
                spacing={32}
            >
                <WidgetText fill="#4A90E2" fontSize={36} fontWeight="bold">Word Well</WidgetText>

                {/* Conditional Rendering based on Snapshot */}
                {sidebarSnapshot ? (
                    <AutoLayout
                        direction="vertical"
                        width="fill-parent"
                        height={400} // Fixed height for snapshot area
                        cornerRadius={16}
                        fill={{
                            type: 'image',
                            src: sidebarSnapshot,
                            scaleMode: 'FILL',
                        }}
                        onClick={openWordWell}
                        hoverStyle={{
                            stroke: '#4A90E2',
                            strokeWidth: 4
                        }}
                        horizontalAlignItems="center"
                        verticalAlignItems="center"
                    >
                        <AutoLayout
                            padding={{ horizontal: 16, vertical: 8 }}
                            fill="rgba(0, 0, 0, 0.6)"
                            cornerRadius={8}
                        >
                            <WidgetText fill="#FFF" fontSize={16} fontWeight="bold">Click to Open</WidgetText>
                        </AutoLayout>
                    </AutoLayout>
                ) : (
                    <>
                        <WidgetText
                            fill="#AAA"
                            fontSize={18}
                            horizontalAlignText="left"
                            width="fill-parent"
                        >
                            The Word Well is a space for your team to share thoughts and feelings.
                        </WidgetText>

                        <WidgetText
                            fill="#AAA"
                            fontSize={18}
                            horizontalAlignText="left"
                            width="fill-parent"
                        >
                            Click the button below to open the visualizer, drop your words, and vote on others!
                        </WidgetText>

                        <AutoLayout
                            onClick={openWordWell}
                            padding={{ horizontal: 32, vertical: 24 }}
                            fill="#4A90E2"
                            cornerRadius={100}
                            width="fill-parent"
                            horizontalAlignItems="center"
                            hoverStyle={{ fill: '#357ABD' }}
                            effect={{
                                type: 'drop-shadow',
                                color: { r: 0, g: 0, b: 0, a: 0.2 },
                                offset: { x: 0, y: 4 },
                                blur: 4,
                            }}
                        >
                            <WidgetText fill="#FFF" fontSize={24} fontWeight="bold">
                                Open Visualizer
                            </WidgetText>
                        </AutoLayout>
                    </>
                )}
            </AutoLayout>
        </AutoLayout>
    );
}

figma.widget.register(AdventCalendar);
