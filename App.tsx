


import React, { useState, useEffect, useRef, useCallback } from 'react';
import { produce } from 'immer';
import { nanoid } from 'nanoid';
import { GoogleGenAI, Type, FunctionDeclaration, Content, FunctionCall, Part } from '@google/genai';

import { parseCode } from './game/engine';
import { getGeminiResponse, getAiThought } from './game/gemini';
import type { GameState, Problem, ExecutionStep, FileSystemTree, FileSystemNode, PanelLayout, PanelComponentKey } from './game/types';
import type { AIStateStatus } from './ai/types';
import { runAssistantTurn } from './ai/assistant';
import { toggleFullscreen, shareCode } from './controls/gameControls';

// Components
import { PrimaryDisplayPanel } from './components/panels/PrimaryDisplayPanel';
import { InfoCardListPanel } from './components/panels/InfoCardListPanel';
import { TabbedOutputPanel } from './components/panels/TabbedOutputPanel';
import { EditorPanel } from './components/panels/EditorPanel';
import { UserDetailsPanel } from './components/panels/UserDetailsPanel';
import { ActionButtonsPanel } from './components/panels/ActionButtonsPanel';
import { CombinedSidebarPanel } from './components/panels/CombinedSidebarPanel';
import HelpModal from './components/modals/HelpModal';
import SettingsModal from './components/modals/SettingsModal';
import NewItemModal from './components/modals/NewItemModal';
import LayoutCustomizer from './components/modals/LayoutCustomizer';
import ConfirmationModal from './components/modals/ConfirmationModal';


// Icons
import { 
    PlayIcon, ChevronRightIcon, ArrowPathIcon, Cog6ToothIcon, 
    StarIcon, UserCircleIcon, TerminalIcon, ExclamationCircleIcon, BookOpenIcon, StopIcon, PauseIcon, CpuChipIcon
} from './components/icons';
import { getIconForShape } from './components/icons';

const initialFiles: FileSystemTree = {
  'root': { id: 'root', name: 'root', type: 'folder', children: ['main_py', 'world_html', 'readme_md'] },
  'main_py': { 
    id: 'main_py', 
    name: 'main.py', 
    type: 'file', 
    parentId: 'root',
    code: [
      '# Welcome to the Universal Playground!',
      '# Your world is now defined in world.html!',
      '',
      '# Create a sprite and give it a brain',
      'bot = ai.Sprite(name="PythonBot", shape="user", x=10, y=85)',
      'bot.create_network()',
      '',
      '# Make it move and talk',
      'bot.go_to(x=80, y=20)',
      'sound.play(x=bot.x, y=bot.y)',
      'bot.say(message="Real Python in control!")',
      'bot.reward(value=1) # Give a positive reward!',
      '',
      'print(f"Python bot {bot.name} is ready!")'
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
        'This IDE now has several major upgrades:',
        '',
        '## Key Features',
        '',
        '*   **Declarative Worlds**: Define your static props (walls, rocks) in `world.html`. The engine parses this file automatically when you run your code.',
        '*   **AI Error Fixes**: When your code fails, an error appears in the **Problems** tab. Click the ✨ button to get an AI-powered explanation and a suggested fix from Gemini.',
        '*   **Integrated Sprite AI**: The `neurons` library has been merged into sprites. You can now call `your_sprite.create_network()` and `your_sprite.reward()` directly.',
        '*   **Real Execution**: Your Python and JavaScript code run in real, sandboxed environments. Other languages are for syntax highlighting only.',
        '',
        '## How to Run',
        '',
        '1.  Edit `world.html` to design your level.',
        '2.  Select a `.py` or `.js` file to script your sprites.',
        '3.  Click **Run This File** to execute.'
      ].join('\n')
  },
  'world_html': {
    id: 'world_html',
    name: 'world.html',
    type: 'file',
    parentId: 'root',
    code: [
        '<!-- Define static props for your world here. -->',
        '<!-- The engine will parse these elements when you run your code. -->',
        '<!-- Use `data-shape` for the type and inline styles for position/size. -->',
        '',
        '<div class="prop" data-shape="wall" style="left: 50%; top: 98%; width: 100%; height: 4%; background-color: #475569;"></div>',
        '<div class="prop" data-shape="wall" style="left: 98%; top: 50%; width: 4%; height: 100%; background-color: #475569;"></div>',
        '<div class="prop" data-shape="rock" style="left: 70%; top: 60%; width: 10%; height: 15%; background-color: #64748b;"></div>',
    ].join('\n')
  }
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

const DELETION_PERIOD_MS = 3 * 60 * 60 * 1000; // 3 hours

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(initialGameState);
  const [logs, setLogs] = useState<string[]>(['Welcome! Your environment will build live as you code.']);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [activeOutputTabId, setActiveOutputTabId] = useState('console');

  const [fileSystem, setFileSystem] = useState<FileSystemTree>(initialFiles);
  const [openTabs, setOpenTabs] = useState<string[]>(['main_py', 'world_html', 'readme_md']);
  const [activeTabId, setActiveTabId] = useState<string>('main_py');

  const executionStepsRef = useRef<ExecutionStep[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false); // For compilation/parsing
  const runnerTimeoutRef = useRef<number | null>(null);

  const [isHelpOpen, setHelpOpen] = useState(false);
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [newItemModal, setNewItemModal] = useState<{ type: 'file' | 'folder', parentId: string } | null>(null);
  const [isMuted, setMuted] = useState(false);
  const [isLayoutCustomizationActive, setLayoutCustomizationActive] = useState(false);
  
  // AI Assistant State
  const [aiChatHistory, setAiChatHistory] = useState<Content[]>([
    { role: 'model', parts: [{ text: "Hello! I'm Coder, your AI assistant. I can see your screen, files, and console. How can I help?" }]}
  ]);
  const [aiAssistantState, setAiAssistantState] = useState<AIStateStatus>({ state: 'idle' });
  const [confirmation, setConfirmation] = useState<{ message: string; onConfirm: () => void; onCancel: () => void } | null>(null);

  const defaultLayout: PanelLayout = {
    left: ['CombinedSidebarPanel'],
    middle: ['EditorPanel', 'TabbedOutputPanel'],
    right: ['PrimaryDisplayPanel', 'InfoCardListPanel', 'UserDetailsPanel', 'ActionButtonsPanel']
  };

  const [settings, setSettings] = useState({
    pythonEngine: 'pyodide' as 'pyodide' | 'pyscript',
    layout: 'default' as 'default' | 'code-focused' | 'preview-focused' | 'custom',
    customLayout: defaultLayout,
    keybindings: {
        acceptSuggestion: 'Tab',
        acceptAiCompletion: 'Tab',
        cycleAiCompletionDown: 'Control+ArrowDown',
        cycleAiCompletionUp: 'Control+ArrowUp',
    }
  });
  
  const activeFile = fileSystem[activeTabId];
  const code = (activeFile?.type === 'file' ? activeFile.code : '') || '';
  const activeLanguage = activeFile?.name.split('.').pop() || 'txt';

  const processStep = useCallback(async (step: ExecutionStep) => {
      // Synchronous state updates
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
          case 'SPRITE_CREATE_NETWORK': if (sprite) sprite.brain = { rewards: 0 }; break;
          case 'SPRITE_REWARD':
            if (sprite) {
                if (!sprite.brain) sprite.brain = { rewards: 0 };
                sprite.brain.rewards += step.value;
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

        // Asynchronous operations that update state again
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
                    setProblems(prev => [...prev, { fileId: activeTabId, line: 0, message: `Gemini API Error: ${errorMessage}`, code: code, language: activeLanguage }]);
                    if (activeOutputTabId !== 'guide') setActiveOutputTabId('problems');
                }
            }
        }

        if (step.type === 'SPRITE_REWARD') {
            const sprite = gameState.sprites.find(s => s.id === step.spriteId);
            if (sprite?.brain) { // Check if brain exists
                try {
                    const thought = await getAiThought(sprite.name, step.value);
                    setGameState(produce(draft => {
                        const targetSprite = draft.sprites.find(s => s.id === step.spriteId);
                        if (targetSprite?.brain) {
                            targetSprite.brain.lastThought = thought;
                        }
                    }));
                } catch (e) {
                    // Log error but don't stop the simulation
                    console.error("Failed to generate AI thought:", e);
                    setLogs(prev => [...prev, `[System] Error generating thought for ${sprite.name}`]);
                }
            }
        }

  }, [gameState, currentStep, activeOutputTabId, code, activeLanguage, activeTabId]);

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
  
    // A new function to set up the initial state of a simulation without running it.
    const prepareForReplay = useCallback(() => {
        setIsRunning(false);
        if (runnerTimeoutRef.current) clearTimeout(runnerTimeoutRef.current);
        
        setCurrentStep(0);

        if (executionStepsRef.current.length === 0) {
            setGameState(initialGameState); // Reset to a blank state
            setLogs(prev => [...prev, 'No replay available. Run code to create one.']);
            return;
        }

        // Set the initial state from all CREATE_* steps
        const previewState = produce(initialGameState, draft => {
            for (const step of executionStepsRef.current) {
                // Apply only the initial setup steps
                if (step.type === 'CREATE_SPRITE') draft.sprites.push(step.sprite);
                if (step.type === 'CREATE_PROP') draft.props.push(step.prop);
                if (step.type === 'SET_BACKGROUND') draft.worldState.backgroundColor = step.color;
            }
        });
        setGameState(previewState);
        setLogs(['Replay is ready. Press play to start.']);
    }, []);

    const handleRun = async (runCode: string, lang: string, fileId: string) => {
        setIsExecuting(true);
        // Stop any current replay
        setIsRunning(false);
        if (runnerTimeoutRef.current) clearTimeout(runnerTimeoutRef.current);
        
        setLogs([`Preparing to run ${lang} code...`]);
        setProblems([]); // Clear old problems
        setActiveOutputTabId('console');

        try {
            const { steps, problems: compileProblems, logs: compileLogs } = await parseCode(runCode, fileSystem, lang, fileId, settings.pythonEngine, (logMessage) => setLogs(prev => [...prev, logMessage]));
            
            const problemsWithCodeContext = compileProblems.map(p => ({ ...p, code: runCode, language: lang }));
            setProblems(problemsWithCodeContext);
            setLogs(prev => [...prev, ...compileLogs]);

            if (compileProblems.length > 0) {
                if (activeOutputTabId !== 'guide') setActiveOutputTabId('problems');
                setLogs(prev => [...prev, 'Execution failed. Cannot create replay.']);
                executionStepsRef.current = []; // Clear steps on failure
            } else {
                setLogs(prev => [...prev, 'Execution successful. Replay is ready.']);
                executionStepsRef.current = steps;
            }
            
            // This will set up the preview or clear the board if compilation failed
            prepareForReplay();

        } catch(e) {
            const errorMessage = e instanceof Error ? e.message : "An unknown execution error occurred.";
            setProblems(prev => [...prev, { fileId, line: 0, message: `Fatal Execution Error: ${errorMessage}`, code: runCode, language: lang }]);
            if (activeOutputTabId !== 'guide') setActiveOutputTabId('problems');
            executionStepsRef.current = [];
            prepareForReplay();
        } finally {
            setIsExecuting(false);
        }
    };
  
  const handleRunCurrentFile = () => {
    if (activeFile?.type !== 'file' || isExecuting || activeFile?.status === 'deleted') return;
    handleRun(activeFile.code, activeLanguage, activeTabId);
  };

  const handleRunAllOpenFiles = () => {
      if (isExecuting) return;
      const runnableTabs = openTabs
        .map(id => fileSystem[id])
        .filter((node): node is Extract<FileSystemNode, {type: 'file'}> => !!node && node.type === 'file' && (node.name.endsWith('.js') || node.name.endsWith('.jsx') || node.name.endsWith('.ts') || node.name.endsWith('.tsx') || node.name.endsWith('.py')) && node.status !== 'deleted');

      if (runnableTabs.length === 0) {
          setLogs(prev => [...prev, 'No runnable files (.js, .jsx, .ts, .tsx, .py) are open.']);
          return;
      }
      
      const combinedCode = runnableTabs.map(node => node.code).join('\n\n');
      // Use the language and fileId of the active tab as the primary context
      handleRun(combinedCode, activeLanguage, activeTabId);
  };

    const handleToggleReplay = () => {
        if (isExecuting || executionStepsRef.current.length === 0) {
            if (!isExecuting) {
                setLogs(prev => [...prev, 'No simulation has been run yet. Click "Run This File" first.']);
            }
            return;
        }

        if (isRunning) {
            // Pause
            setIsRunning(false);
        } else {
            // Play/Resume
            // If the replay was finished, reset it before playing again.
            if (currentStep >= executionStepsRef.current.length) {
                // Re-call prepareForReplay to reset the visual state to frame 0
                prepareForReplay();
                // Use a timeout to ensure React has processed the state update from prepareForReplay
                // before we set isRunning to true and trigger the animation loop.
                setTimeout(() => setIsRunning(true), 50);
            } else {
                // Otherwise, just resume from the current step
                setIsRunning(true);
            }
        }
    };

    const handleStopReplay = () => {
        if (isExecuting) return;
        // Stop and rewind to frame 0.
        prepareForReplay();
    };

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
        // Since live validation is disabled, clear problems for the current file
        // when the user edits it. They will reappear on the next run if they persist.
        setProblems(prev => prev.filter(p => p.fileId !== activeTabId));
    }
  };

  const handleApplyCodeFix = (fileId: string, startLine: number, endLine: number, newCode: string) => {
    setFileSystem(produce(draft => {
        const file = draft[fileId] as Extract<FileSystemNode, {type: 'file'}>;
        if (!file) {
            console.error(`Attempted to apply fix to non-existent file ID: ${fileId}`);
            return;
        }
        const lines = file.code.split('\n');
        const numLinesToDelete = endLine - startLine + 1;

        // Replace the block of erroneous lines with the new code, which might be multi-line
        lines.splice(startLine - 1, numLinesToDelete, ...newCode.split('\n'));
        file.code = lines.join('\n');
    }));

    // Remove the problem that was clicked on to be fixed.
    // The user can re-run the code to get an updated list of problems.
    setProblems(prev => prev.filter(p => !(p.fileId === fileId && p.line >= startLine && p.line <= endLine)));
  };
  
  const handleNewItem = (type: 'file' | 'folder', parentId: string) => {
    setNewItemModal({ type, parentId });
  };


  const handleCreateItem = (name: string, parentId: string, type: 'file' | 'folder') => {
      const newId = nanoid(8);
      let newCode = `# New file: ${name}`;

      setFileSystem(produce(draft => {
        const parent = draft[parentId] as Extract<FileSystemNode, {type: 'folder'}>;
        if (!parent || parent.type !== 'folder') return;
        
        let newName = name;
        const nameExists = parent.children.some(id => draft[id].name === newName);
        if (nameExists) return;
        
        const newNode: FileSystemNode = type === 'file'
            ? { id: newId, name: newName, type: 'file', parentId, code: newCode, status: 'active' }
            : { id: newId, name: newName, type: 'folder', parentId, children: [], status: 'active' };
        
        draft[newId] = newNode;
        parent.children.push(newId);
      }));
      setNewItemModal(null);

      if (type === 'file') {
        setOpenTabs(tabs => [...tabs, newId]);
        setActiveTabId(newId);
      }
  };

  const handleSoftDelete = useCallback((itemId: string) => {
    setFileSystem(produce(draft => {
        const item = draft[itemId];
        if (item) {
            item.status = 'deleted';
            item.deletionTime = Date.now();
        }
    }));

    // Use functional updates to avoid stale state
    setOpenTabs(currentOpenTabs => {
      const newTabs = currentOpenTabs.filter(t => t !== itemId);

      setActiveTabId(currentActiveTabId => {
        if (currentActiveTabId === itemId) {
          if (newTabs.length > 0) {
            const tabIndex = currentOpenTabs.indexOf(itemId);
            return newTabs[Math.max(0, tabIndex - 1)];
          }
          return '';
        }
        return currentActiveTabId;
      });

      return newTabs;
    });
  }, []);

  const handlePermanentDelete = useCallback((itemId: string) => {
      const allIdsToDelete = new Set<string>();
      const queue = [itemId];
      while (queue.length > 0) {
        const currentId = queue.shift()!;
        if (allIdsToDelete.has(currentId)) continue;
        allIdsToDelete.add(currentId);
        const node = fileSystem[currentId];
        if (node?.type === 'folder') {
          node.children.forEach(childId => queue.push(childId));
        }
      }

      setFileSystem(produce(draft => {
        const item = draft[itemId];
        if (item?.parentId) {
            const parent = draft[item.parentId] as Extract<FileSystemNode, { type: 'folder' }>;
            if (parent?.children) {
                parent.children = parent.children.filter(id => id !== itemId);
            }
        }
        allIdsToDelete.forEach(id => {
          delete draft[id];
        });
      }));
      
      const idsToDeleteArray = Array.from(allIdsToDelete);

      setOpenTabs(currentOpenTabs => {
        const newTabs = currentOpenTabs.filter(t => !idsToDeleteArray.includes(t));
        setActiveTabId(currentActiveTabId => {
          if (idsToDeleteArray.includes(currentActiveTabId)) {
            return newTabs[0] || '';
          }
          return currentActiveTabId;
        });
        return newTabs;
      });
  }, [fileSystem]);

  const handleRestore = useCallback((itemId: string) => {
    setFileSystem(produce(draft => {
        const queue = [itemId];
        while (queue.length > 0) {
            const currentId = queue.shift()!;
            const item = draft[currentId];
            if (item) {
                item.status = 'active';
                delete item.deletionTime;
                if (item.type === 'folder') {
                    queue.push(...item.children);
                }
            }
        }
    }));
  }, []);

  useEffect(() => {
    const purgeInterval = setInterval(() => {
        const now = Date.now();
        const expiredIds: string[] = [];
        for (const id in fileSystem) {
            const node = fileSystem[id];
            if (node.status === 'deleted' && node.deletionTime && (now - node.deletionTime > DELETION_PERIOD_MS)) {
                expiredIds.push(id);
            }
        }
        if (expiredIds.length > 0) {
            expiredIds.forEach(id => handlePermanentDelete(id));
        }
    }, 60 * 1000); // Check every minute

    return () => clearInterval(purgeInterval);
  }, [fileSystem, handlePermanentDelete]);
    
    const handleSendAiChatMessage = async (message: string) => {
        const userContent: Content = { role: 'user', parts: [{ text: message }] };
        setAiChatHistory(prev => [...prev, userContent]);

        await runAssistantTurn({
            message,
            history: [...aiChatHistory, userContent],
            appState: {
                fileSystem,
                openTabs,
                activeTabId,
                logs,
                problems,
            },
            callbacks: {
                onStateChange: setAiAssistantState,
                onHistoryChange: setAiChatHistory,
                onFileSystemChange: (updater) => setFileSystem(produce(updater)),
                setOpenTabs,
                setActiveTabId,
                onConfirm: (confirmationMessage: string) => {
                    return new Promise(resolve => {
                        setConfirmation({
                            message: confirmationMessage,
                            onConfirm: () => { setConfirmation(null); resolve(true); },
                            onCancel: () => { setConfirmation(null); resolve(false); }
                        });
                    });
                }
            }
        });
    };


  const primaryDisplayControls = [
// FIX: Added w-6 h-6 to ArrowPathIcon to ensure it has a size and matches the other icons in this control group.
    { id: 'play', icon: isRunning ? <PauseIcon /> : (isExecuting ? <ArrowPathIcon className="w-6 h-6 animate-spin" /> : <PlayIcon />), onClick: handleToggleReplay, isPrimary: true, disabled: isExecuting || executionStepsRef.current.length === 0 },
    { id: 'step', icon: <ChevronRightIcon />, onClick: handleStepForward, disabled: isExecuting || isRunning || currentStep >= executionStepsRef.current.length },
    { id: 'stop', icon: <StopIcon />, onClick: handleStopReplay, disabled: isExecuting || executionStepsRef.current.length === 0 },
  ];

  const infoCardsData = gameState.sprites.map(sprite => ({
    id: sprite.id, title: sprite.name, icon: getIconForShape(sprite.shape),
    stats: [
        ...Object.entries(sprite.data).map(([key, value]) => ({ id: key, value: `${key}: ${value}` })),
        ...(sprite.brain ? [{ id: 'rewards', value: `Rewards: ${sprite.brain.rewards}`}] : []),
        ...(sprite.brain?.lastThought ? [{ id: 'thought', value: `"${sprite.brain.lastThought}"` }] : [])
    ],
  }));

  const ideToolTabs = [
    { id: 'console', title: 'Console', icon: <TerminalIcon /> },
    { id: 'problems', title: 'Problems', count: problems.length, icon: <ExclamationCircleIcon /> },
    { id: 'guide', title: 'Guide', icon: <BookOpenIcon /> },
  ];

  const editorActions = [ {id: 'settings', icon: <Cog6ToothIcon />, onClick: () => setSettingsOpen(true)} ];
  const currentUser = { name: 'Current User', avatar: <UserCircleIcon className="w-full h-full text-gray-500" />, status: 'ONLINE', rank: 'N/A', rankIcon: <StarIcon /> };
  
// FIX: Defined a specific type for the action buttons to prevent TypeScript from widening the 'style' property to a generic 'string'.
  type ActionButton = {
    id: string;
    text: string;
    icon: React.ReactNode;
    onClick: () => void;
    style: 'primary' | 'secondary';
  };

  const actionButtons: ActionButton[] = [
    { id: 'primary', text: 'Run This File', icon: <PlayIcon />, onClick: handleRunCurrentFile, style: 'primary' },
    { id: 'secondary', text: 'Run All Open Files', icon: <PlayIcon />, onClick: handleRunAllOpenFiles, style: 'secondary' },
  ];
  
  const renderLayout = () => {
    const panelComponentMap: Record<PanelComponentKey, React.ReactElement | null> = {
      CombinedSidebarPanel: <CombinedSidebarPanel
        // FileTreePanel Props
        fileSystem={fileSystem}
        setFileSystem={setFileSystem}
        openTabs={openTabs}
        setOpenTabs={setOpenTabs}
        activeTabId={activeTabId}
        setActiveTabId={setActiveTabId}
        onNewItem={handleNewItem}
        onSoftDelete={handleSoftDelete}
        onPermanentDelete={handlePermanentDelete}
        onRestore={handleRestore}
        // AIChatPanel Props
        messages={aiChatHistory}
        onSendMessage={handleSendAiChatMessage}
        aiState={aiAssistantState}
      />,
      EditorPanel: <EditorPanel 
        actions={editorActions}
        activeTabId={activeTabId}
        openTabs={openTabs}
        fileSystem={fileSystem}
        problems={problems}
        settings={settings}
        onTabClick={setActiveTabId}
        onTabsReorder={setOpenTabs}
        onTabClose={handleSoftDelete}
        onCodeChange={updateCode}
        onNewFileClick={() => handleNewItem('file', 'root')}
      />,
      TabbedOutputPanel: <div className="flex-shrink-0 h-[250px]"><TabbedOutputPanel 
        tabs={ideToolTabs} 
        activeTabId={activeOutputTabId} 
        onTabClick={setActiveOutputTabId} 
        logs={logs}
        problems={problems}
        activeLanguage={activeLanguage}
        onApplyFix={handleApplyCodeFix}
      /></div>,
      PrimaryDisplayPanel: <PrimaryDisplayPanel 
        controls={primaryDisplayControls} 
        currentFrame={currentStep} 
        totalFrames={executionStepsRef.current.length} 
        gameState={gameState}
        onMuteToggle={() => setMuted(!isMuted)}
        isMuted={isMuted}
        onShare={() => shareCode(code)}
        onFullscreen={() => toggleFullscreen('game-panel')}
      />,
      InfoCardListPanel: <InfoCardListPanel cards={infoCardsData} />,
      UserDetailsPanel: <UserDetailsPanel user={currentUser} onDeleteClick={() => alert('Delete user clicked!')} />,
      ActionButtonsPanel: <ActionButtonsPanel 
        title="Actions" 
        buttons={actionButtons} 
        onHelpClick={() => setHelpOpen(true)}
        isExecuting={isExecuting}
      />,
      // These are now part of CombinedSidebarPanel and should not be rendered directly
      FileTreePanel: null,
      AIChatPanel: null,
    };

    const codeFocusedLayout: PanelLayout = {
      left: ['PrimaryDisplayPanel', 'InfoCardListPanel', 'UserDetailsPanel', 'ActionButtonsPanel'],
      middle: ['EditorPanel', 'TabbedOutputPanel'],
      right: ['CombinedSidebarPanel']
    };

    const previewFocusedLayout: PanelLayout = {
      left: ['EditorPanel', 'TabbedOutputPanel'],
      middle: ['PrimaryDisplayPanel', 'InfoCardListPanel', 'UserDetailsPanel', 'ActionButtonsPanel'],
      right: ['CombinedSidebarPanel']
    };

    let currentLayout: PanelLayout;
    switch (settings.layout) {
      case 'code-focused':
        currentLayout = codeFocusedLayout;
        break;
      case 'preview-focused':
        currentLayout = previewFocusedLayout;
        break;
      case 'custom':
        currentLayout = settings.customLayout;
        break;
      case 'default':
      default:
        currentLayout = defaultLayout;
        break;
    }

    const renderColumn = (panels: PanelComponentKey[], flex: string, key: string) => {
      const renderedPanels: React.ReactNode[] = [];
      let i = 0;
      while (i < panels.length) {
        const panelKey = panels[i];
        const panelComponent = panelComponentMap[panelKey];
        if (!panelComponent) {
            i++;
            continue;
        }

        const isSidePanel = ['InfoCardListPanel', 'UserDetailsPanel', 'ActionButtonsPanel'].includes(panelKey);

        if (isSidePanel) {
          const group: React.ReactNode[] = [];
          while (i < panels.length && ['InfoCardListPanel', 'UserDetailsPanel', 'ActionButtonsPanel'].includes(panels[i])) {
            const currentPanelKey = panels[i];
            const currentPanelComponent = panelComponentMap[currentPanelKey];
            if (currentPanelComponent) {
                 group.push(React.cloneElement(currentPanelComponent, { key: currentPanelKey }));
            }
            i++;
          }
          renderedPanels.push(<div key={`side-panel-group-${i}`} className="flex-shrink-0 flex space-x-2 h-[220px]">{group}</div>);
        } else {
          renderedPanels.push(React.cloneElement(panelComponent, { key: panelKey }));
          i++;
        }
      }
      return <div key={key} className="flex flex-col space-y-2 min-h-0" style={{ flex }}>{renderedPanels}</div>
    };
    
    return [
      renderColumn(currentLayout.left, '1 1 200px', 'left-column'),
      renderColumn(currentLayout.middle, '3 1 500px', 'middle-column'),
      renderColumn(currentLayout.right, '2 1 300px', 'right-column'),
    ];
};


  return (
    <>
      {isHelpOpen && <HelpModal onClose={() => setHelpOpen(false)} />}
      {isSettingsOpen && <SettingsModal 
          settings={settings}
          setSettings={setSettings}
          onClose={() => setSettingsOpen(false)} 
          onCustomizeLayout={() => {
              setSettingsOpen(false);
              setLayoutCustomizationActive(true);
          }}
      />}
       {isLayoutCustomizationActive && <LayoutCustomizer 
          initialLayout={settings.customLayout}
          onSave={(newLayout) => {
              setSettings(produce(draft => {
                  draft.customLayout = newLayout;
                  draft.layout = 'custom';
              }));
              setLayoutCustomizationActive(false);
          }}
          onClose={() => setLayoutCustomizationActive(false)}
      />}
      {newItemModal && <NewItemModal 
          type={newItemModal.type} 
          parentId={newItemModal.parentId}
          onClose={() => setNewItemModal(null)}
          onCreate={handleCreateItem}
          fileSystem={fileSystem}
      />}
       {confirmation && (
          <ConfirmationModal
              message={confirmation.message}
              onConfirm={confirmation.onConfirm}
              onCancel={confirmation.onCancel}
          />
      )}
      <div className="h-screen w-screen flex flex-col font-sans text-sm">
        <main className="flex-grow p-2 flex space-x-2 overflow-hidden">
          {renderLayout()}
        </main>
      </div>
    </>
  );
};

export default App;