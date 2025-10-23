
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { produce } from 'immer';
import { nanoid } from 'nanoid';

import { parseCode } from './game/engine';
import { getGeminiResponse } from './game/gemini';
import type { GameState, Problem, ExecutionStep, FileSystemTree, FileSystemNode, Sprite, Prop, Zone } from './game/types';
import { toggleFullscreen, shareCode } from './controls/gameControls';

// Components
import { PrimaryDisplayPanel } from './components/panels/PrimaryDisplayPanel';
import { InfoCardListPanel } from './components/panels/InfoCardListPanel';
import { TabbedOutputPanel } from './components/panels/TabbedOutputPanel';
import { EditorPanel } from './components/panels/EditorPanel';
import { UserDetailsPanel } from './components/panels/UserDetailsPanel';
import { ActionButtonsPanel } from './components/panels/ActionButtonsPanel';
import HelpModal from './components/modals/HelpModal';
import SettingsModal from './components/modals/SettingsModal';
import NewItemModal from './components/modals/NewItemModal';

// Icons
import { 
    PlayIcon, PauseIcon, ChevronRightIcon, ArrowPathIcon, Cog6ToothIcon, 
    StarIcon, UserCircleIcon, TerminalIcon, ExclamationCircleIcon, BookOpenIcon, StopIcon
} from './components/icons';
import { getIconForShape } from './components/icons';

// FIX: Changed template literals to an array of strings joined by newline characters
// to avoid TypeScript parser errors on the string content.
const initialFiles: FileSystemTree = {
  'root': { id: 'root', name: 'root', type: 'folder', children: ['main_py', 'readme_md'] },
  'main_py': { 
    id: 'main_py', 
    name: 'main.py', 
    type: 'file', 
    parentId: 'root',
    code: [
      '# Welcome to the Universal Playground!',
      '# This engine uses a common API across all languages.',
      '# Libraries must be imported before use.',
      'import ai, world, physics, sound, neurons',
      '',
      '# --- World Setup ---',
      'world.set_background(color="#334155")',
      'world.create_zone(name="goal", x=80, y=85, width=10, height=10, color="#16a34a")',
      '',
      '# --- Physics & Props ---',
      'physics.set_gravity(strength=0.005)',
      'ai.create_prop(shape="wall", x=50, y=98, width=100, height=4, color="#475569")',
      '',
      '# --- Sprites ---',
      'bot = ai.Sprite(name="UniversalBot", shape="user", x=10, y=10)',
      'neurons.create_network(sprite=bot)',
      'target = ai.Sprite(name="Beacon", shape="cube", x=80, y=85)',
      '',
      '# --- Actions ---',
      'bot.go_to(x=target.x, y=target.y)',
      'print(f"{bot.name} is moving towards {target.name}.")',
      '',
      'ai.wait(3)',
      '',
      'sound.play(x=bot.x, y=bot.y)',
      'bot.say(message="Landed!")',
      '',
      'neurons.reward(sprite=bot, value=1)',
      'print(f"{bot.name} was rewarded for reaching the goal zone.")',
      '',
      'ai.wait(1)',
      'target.rotate_to(angle=90, speed=1)',
      'sound.play(x=target.x, y=target.y)',
      'target.say(message="Objective complete.")',
      '',
      '# --- Gemini Integration ---',
      'bot.chat(message="What\'s the next objective?")'
    ].join('\n')
  },
  'readme_md': {
      id: 'readme_md',
      name: 'README.md',
      type: 'file',
      parentId: 'root',
      code: [
        '# Universal Sprite IDE',
        '',
        'Welcome! This IDE features a language-agnostic engine. You can write your simulation logic in Python, JavaScript, Lua, or any language you prefer, and the engine will understand it.',
        '',
        '## Key Features',
        '',
        '*   **Universal API**: A single set of commands works across all languages. The engine parses the structure of the commands, not the language syntax itself.',
        '*   **Mandatory Imports**: Just like real-world coding, you must `import` libraries like `ai`, `world`, etc., before using them.',
        '*   **Live Preview**: Sprites and props appear instantly as you code.',
        '*   **Full Creative Suite**:',
        '    *   **`world`**: Set backgrounds and create interactive zones.',
        '    *   **`physics`**: Add universal forces like gravity.',
        '    *   **`sound`**: Create visual sound wave effects.',
        '    *   **`neurons`**: Reward sprites to enable machine learning simulations.',
        '    *   **`ai`**: Create sprites, make them talk, pathfind, and even chat using Gemini.',
        '',
        '## How to Run',
        '',
        '1.  **Import** the libraries you need at the top of your file (e.g., `import ai, world`).',
        '2.  Write your code in any file (e.g., `main.py`, `main.js`).',
        '3.  Use the commands listed in the **Guide** tab.',
        '4.  Click **Compile & Run** to execute the simulation.'
      ].join('\n')
  },
};

const CustomStyles = () => (
    <style>{`
        html, body {
            font-family: 'Roboto', sans-serif;
        }
        .font-mono {
            font-family: 'Roboto Mono', monospace;
        }
        @keyframes fadeInOut {
            0%, 100% { opacity: 0; transform: translateY(10px); }
            10%, 90% { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-out {
            animation: fadeInOut 4s ease-in-out forwards;
        }

        /* Editor Styles */
        .editor-textarea, .editor-highlight {
            position: absolute; top: 0; left: 0; width: 100%; height: 100%;
            padding: 0; margin: 0; border: 0;
            font-family: 'Roboto Mono', monospace; font-size: 0.875rem; line-height: 1.25rem;
            white-space: pre; word-wrap: normal; overflow: auto; background: transparent;
            -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;
        }
        .editor-textarea { z-index: 1; color: transparent; caret-color: white; resize: none; outline: none; }
        .editor-highlight { z-index: 0; pointer-events: none; color: #d1d5db; }

        /* Syntax Highlighting Tokens */
        .token-comment { color: #6b7280; } /* gray-500 */
        .token-keyword { color: #c084fc; font-weight: 500; } /* purple-400 */
        .token-string { color: #4ade80; } /* green-400 */
        .token-number { color: #a78bfa; } /* violet-400 */
        .token-method { color: #60a5fa; } /* blue-400 */
        .token-variable { color: #facc15; } /* yellow-400 */
        .token-parameter { color: #9ca3af; } /* gray-400 */
        .token-tag { color: #f87171; } /* red-400 */
        .token-attr-name { color: #fb923c; } /* orange-400 */
        .token-attr-value { color: #4ade80; } /* green-400 */
        .token-function { color: #60a5fa; } /* blue-400 */
        
        @keyframes reward-flash {
            0%, 100% { box-shadow: 0 0 0 0 rgba(250, 204, 21, 0); }
            50% { box-shadow: 0 0 20px 10px rgba(250, 204, 21, 0.7); }
        }
        .reward-flash-animation {
            animation: reward-flash 0.8s ease-out;
        }
    `}</style>
);

const useDebouncedCallback = (callback: (...args: any[]) => void, delay: number) => {
  const timeoutRef = useRef<number | null>(null);
  return useCallback((...args: any[]) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = window.setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay]);
};

const initialGameState: GameState = { 
    sprites: [], 
    props: [], 
    effects: [], 
    physics: { gravity: 0 },
    worldState: {
        backgroundColor: '#111827', // bg-gray-900
        zones: []
    }
};

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(initialGameState);
  const [logs, setLogs] = useState<string[]>(['Welcome! Your environment will build live as you code.']);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [activeOutputTabId, setActiveOutputTabId] = useState('console');

  const [fileSystem, setFileSystem] = useState<FileSystemTree>(initialFiles);
  const [openTabs, setOpenTabs] = useState<string[]>(['main_py', 'readme_md']);
  const [activeTabId, setActiveTabId] = useState<string>('main_py');

  const executionStepsRef = useRef<ExecutionStep[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const runnerTimeoutRef = useRef<number | null>(null);

  const [isHelpOpen, setHelpOpen] = useState(false);
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [newItemModal, setNewItemModal] = useState<{ type: 'file' | 'folder', parentId: string } | null>(null);
  const [isMuted, setMuted] = useState(false);
  
  const activeFile = fileSystem[activeTabId];
  const code = (activeFile?.type === 'file' ? activeFile.code : '') || '';

  const processStep = useCallback(async (step: ExecutionStep) => {
      await setGameState(produce(draft => {
        const sprite = 'spriteId' in step && step.spriteId ? draft.sprites.find(s => s.id === step.spriteId) : undefined;
        switch (step.type) {
          case 'CREATE_SPRITE': draft.sprites.push(step.sprite); break;
          case 'CREATE_PROP': draft.props.push(step.prop); break;
          case 'DELETE_SPRITE': draft.sprites = draft.sprites.filter(s => s.id !== step.spriteId); break;
          case 'SAY': if (sprite) sprite.message = { text: step.message, duration: step.duration }; break;
          case 'CLEAR_MESSAGE': if (sprite) sprite.message = undefined; break;
          case 'MOVE_TO': if (sprite) { sprite.x = step.x; sprite.y = step.y; } break;
          case 'GO_TO': if (sprite) { sprite.x = step.x; sprite.y = step.y; } break; // For now, same as MOVE_TO
          case 'SET_STYLE': if (sprite) sprite.styles[step.property] = step.value; break;
          case 'SET_DATA': if (sprite) sprite.data[step.key] = step.value; break;
          case 'AI_CHAT_REQUEST':
             if (sprite) {
                if(!sprite.chatHistory) sprite.chatHistory = [];
                sprite.chatHistory.push({ role: 'user', parts: [{ text: step.message }] });
             }
            break;
          case 'SET_GRAVITY': draft.physics.gravity = step.strength; break;
          case 'ROTATE_TO': if (sprite) sprite.rotation = step.angle; break;
          case 'LOOK_AT':
            if (sprite) {
                const dx = step.x - sprite.x;
                const dy = step.y - sprite.y;
                const angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
                sprite.rotation = angle;
            }
            break;
          case 'PLAY_SOUND':
            draft.effects.push({
                id: nanoid(6), type: 'soundwave', x: step.x, y: step.y,
                creationTime: Date.now(), duration: 1000, maxRadius: 15,
            });
            break;
          case 'SET_BACKGROUND': draft.worldState.backgroundColor = step.color; break;
          case 'CREATE_ZONE': draft.worldState.zones.push(step.zone); break;
          case 'CREATE_NETWORK': if (sprite) sprite.brain = { rewards: 0 }; break;
          case 'REWARD_SPRITE':
            if (sprite) {
                if (sprite.brain) sprite.brain.rewards += step.value;
                 draft.effects.push({
                    id: nanoid(6), type: 'rewardflash', spriteId: step.spriteId,
                    creationTime: Date.now(), duration: 800
                });
            }
            break;
        }
      }));
       if (step.type === 'LOG') setLogs(prev => [...prev, step.message]);
       if (step.type === 'CLEAR_LOG') setLogs([]);

        if (step.type === 'AI_CHAT_REQUEST') {
            const senderSprite = gameState.sprites.find(s => s.id === step.spriteId);
            const otherSprites = gameState.sprites.filter(s => s.id !== step.spriteId);
            const receiverSprite = otherSprites[0];

            if (senderSprite && receiverSprite) {
                setLogs(prev => [...prev, `${senderSprite.name} says "${step.message}" to ${receiverSprite.name}...`]);
                setLogs(prev => [...prev, `${receiverSprite.name} is thinking...`]);
                
                try {
                    const systemInstruction = (receiverSprite.data?.system_instruction as string) || "You are a sprite in a virtual world.";
                    const responseText = await getGeminiResponse(receiverSprite.chatHistory || [], step.message, systemInstruction);

                    setGameState(produce(draft => {
                        const receiver = draft.sprites.find(s => s.id === receiverSprite.id);
                        if(receiver) {
                           if(!receiver.chatHistory) receiver.chatHistory = [];
                           receiver.chatHistory.push({ role: 'model', parts: [{ text: responseText }] });
                        }
                    }));
                    
                    const responseSteps: ExecutionStep[] = [
                        { type: 'SAY', spriteId: receiverSprite.id, message: responseText, duration: 0 },
                        { type: 'WAIT', duration: 4000 },
                        { type: 'CLEAR_MESSAGE', spriteId: receiverSprite.id, duration: 0 }
                    ];

                    executionStepsRef.current.splice(currentStep + 1, 0, ...responseSteps);
                    setLogs(prev => [...prev.slice(0, -1), `${receiverSprite.name} responds.`]);

                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
                    setLogs(prev => [...prev.slice(0, -1), `Error: Gemini API call failed for ${receiverSprite.name}: ${errorMessage}`]);
                    setProblems(prev => [...prev, { line: 0, message: `Gemini API Error: ${errorMessage}` }]);
                    if (activeOutputTabId !== 'guide') setActiveOutputTabId('problems');
                }
            }
        }

  }, [gameState, currentStep, activeOutputTabId]);

  const runNextStep = useCallback(async () => {
    if (currentStep >= executionStepsRef.current.length) {
      setIsRunning(false);
      return;
    }
    
    const now = Date.now();
    setGameState(produce(draft => {
        draft.effects = draft.effects.filter(effect => now - effect.creationTime < effect.duration);
        if (draft.physics.gravity !== 0) {
            for (const sprite of draft.sprites) {
                sprite.vy += draft.physics.gravity;
                sprite.x += sprite.vx;
                sprite.y += sprite.vy;
                if (sprite.y > 95) { sprite.y = 95; sprite.vy = 0; }
                if (sprite.y < 0) { sprite.y = 0; sprite.vy = 0; }
                if (sprite.x > 100) { sprite.x = 100; sprite.vx = 0; }
                if (sprite.x < 0) { sprite.x = 0; sprite.vx = 0; }
            }
        }
    }));
    
    const step = executionStepsRef.current[currentStep];
    await processStep(step);
    
    const nextStepIndex = currentStep + 1;
    setCurrentStep(nextStepIndex);

    if (nextStepIndex < executionStepsRef.current.length) {
      const currentStepDuration = 'duration' in step ? step.duration : 0;
      if (currentStepDuration > 0) {
        runnerTimeoutRef.current = window.setTimeout(runNextStep, currentStepDuration);
      } else {
        requestAnimationFrame(runNextStep);
      }
    } else {
      setIsRunning(false);
    }
  }, [currentStep, processStep]);

  useEffect(() => {
    if (isRunning) {
      runNextStep();
    }
    return () => {
      if (runnerTimeoutRef.current) clearTimeout(runnerTimeoutRef.current);
    };
  }, [isRunning, runNextStep]);
  
  const updatePreview = useDebouncedCallback((codeToParse: string, fs: FileSystemTree) => {
      if (!codeToParse) {
          setGameState(initialGameState);
          setProblems([]);
          executionStepsRef.current = [];
          return;
      }
      try {
        const { steps, problems: compileProblems } = parseCode(codeToParse, fs);
        
        setProblems(compileProblems);
        executionStepsRef.current = steps;

        const previewState = produce(initialGameState, draft => {
          for (const step of steps) {
              if (step.type === 'CREATE_SPRITE') draft.sprites.push(step.sprite);
              if (step.type === 'CREATE_PROP') draft.props.push(step.prop);
              if (step.type === 'SET_BACKGROUND') draft.worldState.backgroundColor = step.color;
              if (step.type === 'CREATE_ZONE') draft.worldState.zones.push(step.zone);
              if (step.type === 'CREATE_NETWORK') {
                  const sprite = draft.sprites.find(s => s.id === step.spriteId);
                  if (sprite) sprite.brain = { rewards: 0 };
              }
          }
        });
        setGameState(previewState);

        if (compileProblems.length > 0 && activeOutputTabId !== 'guide') {
          setActiveOutputTabId('problems');
        }
      } catch (e) {
          console.error("Critical error during code parsing:", e);
          const errorMessage = e instanceof Error ? e.message : "An unknown parsing error occurred.";
          setProblems([{ line: 0, message: `Fatal Parser Error: ${errorMessage}` }]);
          setGameState(initialGameState);
          executionStepsRef.current = [];
          if (activeOutputTabId !== 'guide') {
            setActiveOutputTabId('problems');
          }
      }
  }, 500);

  useEffect(() => {
    if (activeFile?.type === 'file') {
        updatePreview(activeFile.code, fileSystem);
    }
  }, [activeFile?.code, fileSystem, updatePreview]);

  const resetSimulation = (clearCode: boolean = false) => {
    setIsRunning(false);
    if (runnerTimeoutRef.current) clearTimeout(runnerTimeoutRef.current);
    
    const codeToParse = activeFile?.type === 'file' ? activeFile.code : '';
    const { steps } = parseCode(codeToParse, fileSystem);
    
    const previewState = produce(initialGameState, draft => {
        for (const step of steps) {
            if (step.type === 'CREATE_SPRITE') draft.sprites.push(step.sprite);
            if (step.type === 'CREATE_PROP') draft.props.push(step.prop);
            if (step.type === 'SET_BACKGROUND') draft.worldState.backgroundColor = step.color;
            if (step.type === 'CREATE_ZONE') draft.worldState.zones.push(step.zone);
        }
    });

    setGameState(previewState);
    setLogs(['Simulation reset.']);
    setCurrentStep(0);

     if(clearCode) {
        setFileSystem(initialFiles);
        setOpenTabs(['main_py', 'readme_md']);
        setActiveTabId('main_py');
     }
  };
  
  const handleCompileAndRun = () => {
    if (problems.length > 0) {
        if (activeOutputTabId !== 'guide') setActiveOutputTabId('problems');
        setLogs(prev => [...prev, 'Cannot run due to compilation errors.']);
        return;
    }
    
    setIsRunning(false);
    if (runnerTimeoutRef.current) clearTimeout(runnerTimeoutRef.current);
    
    const previewState = produce(initialGameState, draft => {
        for (const step of executionStepsRef.current) {
            if (step.type === 'CREATE_SPRITE') draft.sprites.push(step.sprite);
            if (step.type === 'CREATE_PROP') draft.props.push(step.prop);
            if (step.type === 'SET_BACKGROUND') draft.worldState.backgroundColor = step.color;
            if (step.type === 'CREATE_ZONE') draft.worldState.zones.push(step.zone);
        }
    });
    
    setGameState(previewState);
    setLogs(['Running simulation...']);
    setCurrentStep(0);
    setActiveOutputTabId('console');
    setIsRunning(true);
  };

  const handlePause = () => setIsRunning(false);
  const handleStop = () => resetSimulation();

  const handleStepForward = async () => {
    if (isRunning || currentStep >= executionStepsRef.current.length) return;
    const step = executionStepsRef.current[currentStep];
    await processStep(step);
    setCurrentStep(currentStep + 1);
  };
  
  const updateCode = (newCode: string) => {
    if(activeFile?.type === 'file') {
        setFileSystem(produce(draft => {
            const file = draft[activeTabId] as Extract<FileSystemNode, {type: 'file'}>;
            file.code = newCode;
        }));
    }
  };
  
  const handleNewItem = (type: 'file' | 'folder', parentId: string) => {
    setNewItemModal({ type, parentId });
  };


  const handleCreateItem = (name: string, parentId: string, type: 'file' | 'folder') => {
      const newId = nanoid(8);
      let newCode = `# New file: ${name}\n\n# This is a universal engine.\n# Use the Guide tab for API commands.\n`;

      setFileSystem(produce(draft => {
        const parent = draft[parentId] as Extract<FileSystemNode, {type: 'folder'}>;
        if (!parent || parent.type !== 'folder') return;
        
        let newName = name;
        const nameExists = parent.children.some(id => draft[id].name === newName);
        if (nameExists) return;
        
        const newNode: FileSystemNode = type === 'file'
            ? { id: newId, name: newName, type: 'file', parentId, code: newCode }
            : { id: newId, name: newName, type: 'folder', parentId, children: [] };
        
        draft[newId] = newNode;
        parent.children.push(newId);
      }));
      setNewItemModal(null);

      if (type === 'file') {
        setOpenTabs(tabs => [...tabs, newId]);
        setActiveTabId(newId);
      }
  };

  const primaryDisplayControls = [
    { id: 'play', icon: isRunning ? <PauseIcon /> : <PlayIcon />, onClick: isRunning ? handlePause : handleCompileAndRun, isPrimary: true, disabled: executionStepsRef.current.length === 0 || currentStep >= executionStepsRef.current.length },
    { id: 'step', icon: <ChevronRightIcon />, onClick: handleStepForward, disabled: isRunning || currentStep >= executionStepsRef.current.length },
    { id: 'stop', icon: <StopIcon />, onClick: handleStop, disabled: executionStepsRef.current.length === 0 },
  ];

  const infoCardsData = gameState.sprites.map(sprite => ({
    id: sprite.id, title: sprite.name, icon: getIconForShape(sprite.shape),
    stats: [
        ...Object.entries(sprite.data).map(([key, value]) => ({ id: key, value: `${key}: ${value}` })),
        ...(sprite.brain ? [{ id: 'rewards', value: `Rewards: ${sprite.brain.rewards}`}] : [])
    ],
  }));

  const ideToolTabs = [
    { id: 'console', title: 'Console', icon: <TerminalIcon /> },
    { id: 'problems', title: 'Problems', count: problems.length, icon: <ExclamationCircleIcon /> },
    { id: 'guide', title: 'Guide', icon: <BookOpenIcon /> },
  ];

  const editorActions = [ {id: 'settings', icon: <Cog6ToothIcon />, onClick: () => setSettingsOpen(true)} ];
  const currentUser = { name: 'Current User', avatar: <UserCircleIcon className="w-full h-full text-gray-500" />, status: 'ONLINE', rank: 'N/A', rankIcon: <StarIcon /> };
  const actionButtons = [
    { id: 'primary', text: 'Compile & Run', icon: <PlayIcon />, onClick: handleCompileAndRun, style: 'primary' },
    { id: 'secondary', text: 'Reset All', icon: <ArrowPathIcon />, onClick: () => resetSimulation(true), style: 'secondary' },
  ];

  return (
    <>
      <CustomStyles />
      {isHelpOpen && <HelpModal onClose={() => setHelpOpen(false)} />}
      {isSettingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
      {newItemModal && <NewItemModal 
          type={newItemModal.type} 
          parentId={newItemModal.parentId}
          onClose={() => setNewItemModal(null)}
          onCreate={handleCreateItem}
          fileSystem={fileSystem}
      />}
      <div className="h-screen w-screen flex flex-col bg-[#181a20] text-gray-300 font-sans text-sm">
        <main className="flex-grow p-2 flex space-x-2 overflow-hidden">
          
          <div className="flex flex-col space-y-2 min-h-0" style={{flex: '2 1 0%'}}>
            <PrimaryDisplayPanel 
                controls={primaryDisplayControls} 
                currentFrame={currentStep} 
                totalFrames={executionStepsRef.current.length} 
                gameState={gameState}
                onMuteToggle={() => setMuted(!isMuted)}
                isMuted={isMuted}
                onShare={() => shareCode(code)}
                onFullscreen={() => toggleFullscreen('game-panel')}
            />
            <div className="flex-shrink-0 h-[250px]">
                <TabbedOutputPanel 
                    tabs={ideToolTabs} 
                    activeTabId={activeOutputTabId} 
                    onTabClick={setActiveOutputTabId} 
                    logs={logs}
                    problems={problems}
                    fileSystem={fileSystem}
                    openTabs={openTabs}
                    activeEditorTabId={activeTabId}
                />
            </div>
          </div>
          
          <div className="flex flex-col space-y-2 min-h-0" style={{flex: '3 1 0%'}}>
              <EditorPanel 
                actions={editorActions}
                activeTabId={activeTabId}
                openTabs={openTabs}
                fileSystem={fileSystem}
                onTabClick={setActiveTabId}
                onTabClose={(tabId) => {
                  const tabIndex = openTabs.indexOf(tabId);
                  const newTabs = openTabs.filter(t => t !== tabId);
                  setOpenTabs(newTabs);
                  if (activeTabId === tabId) {
                      if (newTabs.length > 0) {
                          setActiveTabId(newTabs[Math.max(0, tabIndex - 1)]);
                      } else {
                          setActiveTabId('');
                      }
                  }
                }}
                onCodeChange={updateCode}
                onNewFileClick={() => handleNewItem('file', 'root')}
              />
              <div className="flex-shrink-0 flex space-x-2 h-[220px]">
                  <InfoCardListPanel cards={infoCardsData} />
                  <UserDetailsPanel user={currentUser} onDeleteClick={() => alert('Delete user clicked!')} />
                  <ActionButtonsPanel 
                      title="Actions" 
                      buttons={actionButtons} 
                      onHelpClick={() => setHelpOpen(true)}
                  />
              </div>
          </div>

        </main>
      </div>
    </>
  );
};

export default App;
