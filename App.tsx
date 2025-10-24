import React, { useState, useEffect, useRef, useCallback } from 'react';
import { produce } from 'immer';
import { nanoid } from 'nanoid';

import { parseCode } from './game/engine';
import { getGeminiResponse } from './game/gemini';
import type { GameState, Problem, ExecutionStep, FileSystemTree, FileSystemNode } from './game/types';
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
import { FileTreePanel } from './components/panels/FileTreePanel';

// Icons
import { 
    PlayIcon, ChevronRightIcon, ArrowPathIcon, Cog6ToothIcon, 
    StarIcon, UserCircleIcon, TerminalIcon, ExclamationCircleIcon, BookOpenIcon, StopIcon, PauseIcon
} from './components/icons';
import { getIconForShape } from './components/icons';

const initialFiles: FileSystemTree = {
  'root': { id: 'root', name: 'root', type: 'folder', children: ['readme_md', 'main_py', 'world_html'] },
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

const useDebouncedAsyncCallback = (callback: (...args: any[]) => Promise<void>, delay: number) => {
  const timeoutRef = useRef<number | null>(null);
  return useCallback((...args: any[]) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = window.setTimeout(async () => {
      await callback(...args);
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

const DELETION_PERIOD_MS = 3 * 60 * 60 * 1000; // 3 hours

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(initialGameState);
  const [logs, setLogs] = useState<string[]>(['Welcome! Your environment will build live as you code.']);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [activeOutputTabId, setActiveOutputTabId] = useState('console');

  const [fileSystem, setFileSystem] = useState<FileSystemTree>(initialFiles);
  const [openTabs, setOpenTabs] = useState<string[]>(['readme_md', 'main_py', 'world_html']);
  const [activeTabId, setActiveTabId] = useState<string>('readme_md');

  const executionStepsRef = useRef<ExecutionStep[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false); // For compilation/parsing
  const runnerTimeoutRef = useRef<number | null>(null);

  const [isHelpOpen, setHelpOpen] = useState(false);
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [newItemModal, setNewItemModal] = useState<{ type: 'file' | 'folder', parentId: string } | null>(null);
  const [isMuted, setMuted] = useState(false);

  const [settings, setSettings] = useState({
    pythonEngine: 'pyodide' as 'pyodide' | 'pyscript',
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
  
  const updatePreview = useDebouncedAsyncCallback(async (codeToParse: string, fs: FileSystemTree, lang: string, fileId: string) => {
      setIsExecuting(true);
      try {
        const { steps, problems: compileProblems, logs: compileLogs } = await parseCode(codeToParse, fs, lang, fileId, settings.pythonEngine);
        
        const problemsWithCodeContext = compileProblems.map(p => ({ ...p, code: codeToParse, language: lang }));
        setProblems(problemsWithCodeContext);
        executionStepsRef.current = steps;

        const previewState = produce(initialGameState, draft => {
          for (const step of steps) {
              if (step.type === 'CREATE_SPRITE') draft.sprites.push(step.sprite);
              if (step.type === 'CREATE_PROP') draft.props.push(step.prop);
              if (step.type === 'SET_BACKGROUND') draft.worldState.backgroundColor = step.color;
              if (step.type === 'SPRITE_CREATE_NETWORK') {
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
          setProblems([{ fileId, line: 0, message: `Fatal Parser Error: ${errorMessage}`, code: codeToParse, language: lang }]);
          setGameState(initialGameState);
          executionStepsRef.current = [];
          if (activeOutputTabId !== 'guide') {
            setActiveOutputTabId('problems');
          }
      } finally {
          setIsExecuting(false);
      }
  }, 500);

  useEffect(() => {
    // Live preview for runnable files only
    if (activeFile?.type === 'file' && (activeFile.name.endsWith('.py') || activeFile.name.endsWith('.js'))) {
        updatePreview(activeFile.code, fileSystem, activeLanguage, activeTabId);
    } else {
        // For non-runnable files like HTML or MD, just clear problems and steps
        setProblems([]);
        executionStepsRef.current = [];
        // Optional: you could have a separate "live preview" for HTML files here
    }
  }, [activeFile?.code, fileSystem, activeLanguage, activeTabId, updatePreview, settings.pythonEngine]);

  const resetSimulation = async () => {
    setIsRunning(false);
    if (runnerTimeoutRef.current) clearTimeout(runnerTimeoutRef.current);
    
     // We need to re-parse to get the initial state from world.html etc.
    const { steps, problems: compileProblems } = await parseCode(code, fileSystem, activeLanguage, activeTabId, settings.pythonEngine);
    if (compileProblems.length > 0) {
        setGameState(initialGameState);
    } else {
        const previewState = produce(initialGameState, draft => {
            for (const step of steps) {
                if (step.type === 'CREATE_SPRITE') draft.sprites.push(step.sprite);
                if (step.type === 'CREATE_PROP') draft.props.push(step.prop);
                if (step.type === 'SET_BACKGROUND') draft.worldState.backgroundColor = step.color;
            }
        });
        setGameState(previewState);
    }

    setLogs(['Simulation reset.']);
    setCurrentStep(0);
  };
  
  const startSimulation = () => {
    resetSimulation().then(() => {
        setLogs(['Running simulation...']);
        setCurrentStep(0);
        setActiveOutputTabId('console');
        setIsRunning(true);
    });
  };

  const handleRun = async (runCode: string, lang: string, fileId: string) => {
    setIsExecuting(true);
    setLogs([`Executing ${lang} code...`]);
    try {
        const { steps, problems: compileProblems, logs: compileLogs } = await parseCode(runCode, fileSystem, lang, fileId, settings.pythonEngine);
        
        const problemsWithCodeContext = compileProblems.map(p => ({ ...p, code: runCode, language: lang }));
        setProblems(problemsWithCodeContext);
        setLogs(prev => [...prev, ...compileLogs]);

        if (compileProblems.length > 0) {
            if (activeOutputTabId !== 'guide') setActiveOutputTabId('problems');
            setLogs(prev => [...prev, 'Cannot run due to errors.']);
            return;
        }
        executionStepsRef.current = steps;
        startSimulation();
    } catch(e) {
        const errorMessage = e instanceof Error ? e.message : "An unknown execution error occurred.";
        setProblems(prev => [...prev, { fileId, line: 0, message: `Fatal Execution Error: ${errorMessage}`, code: runCode, language: lang }]);
        if (activeOutputTabId !== 'guide') setActiveOutputTabId('problems');
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
        .filter(node => node?.type === 'file' && (node.name.endsWith('.js') || node.name.endsWith('.py')) && node.status !== 'deleted');

      if (runnableTabs.length === 0) {
          setLogs(prev => [...prev, 'No runnable files (.js, .py) are open.']);
          return;
      }
      
      const combinedCode = runnableTabs.map(node => (node as any).code).join('\n\n');
      // Use the language and fileId of the active tab as the primary context
      handleRun(combinedCode, activeLanguage, activeTabId);
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

    const newTabs = openTabs.filter(t => t !== itemId);
    setOpenTabs(newTabs);
    if (activeTabId === itemId) {
        if (newTabs.length > 0) {
            const tabIndex = openTabs.indexOf(itemId);
            setActiveTabId(newTabs[Math.max(0, tabIndex - 1)]);
        } else {
            setActiveTabId('');
        }
    }
  }, [openTabs, activeTabId]);

  const handlePermanentDelete = useCallback((itemId: string) => {
    let allIdsToDelete: string[] = [];

    setFileSystem(produce(draft => {
        const queue = [itemId];
        const visited = new Set<string>();

        while (queue.length > 0) {
            const currentId = queue.shift()!;
            if (visited.has(currentId)) continue;
            visited.add(currentId);
            allIdsToDelete.push(currentId);

            const currentNode = draft[currentId];
            if (currentNode.type === 'folder') {
                queue.push(...currentNode.children);
            }

            if (currentNode.parentId) {
                const parent = draft[currentNode.parentId] as Extract<FileSystemNode, { type: 'folder' }>;
                if (parent) {
                    parent.children = parent.children.filter(id => id !== currentId);
                }
            }
        }
        
        for (const id of allIdsToDelete) {
            delete draft[id];
        }
    }));

    setOpenTabs(tabs => tabs.filter(t => !allIdsToDelete.includes(t)));
    if (allIdsToDelete.includes(activeTabId)) {
        const newTabs = openTabs.filter(t => !allIdsToDelete.includes(t));
        setActiveTabId(newTabs[0] || '');
    }
  }, [activeTabId, openTabs]);

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


  const primaryDisplayControls = [
    { id: 'play', icon: isRunning ? <PauseIcon /> : (isExecuting ? <ArrowPathIcon className="animate-spin" /> : <PlayIcon />), onClick: isRunning ? handlePause : handleRunCurrentFile, isPrimary: true, disabled: isExecuting || (activeLanguage !== 'py' && activeLanguage !== 'js') },
    { id: 'step', icon: <ChevronRightIcon />, onClick: handleStepForward, disabled: isExecuting || isRunning || currentStep >= executionStepsRef.current.length },
    { id: 'stop', icon: <StopIcon />, onClick: handleStop, disabled: isExecuting || executionStepsRef.current.length === 0 },
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
    { id: 'primary', text: 'Run This File', icon: <PlayIcon />, onClick: handleRunCurrentFile, style: 'primary' },
    { id: 'secondary', text: 'Run All Open Files', icon: <PlayIcon />, onClick: handleRunAllOpenFiles, style: 'secondary' },
  ];

  return (
    <>
      {isHelpOpen && <HelpModal onClose={() => setHelpOpen(false)} />}
      {isSettingsOpen && <SettingsModal 
          settings={settings}
          setSettings={setSettings}
          onClose={() => setSettingsOpen(false)} 
      />}
      {newItemModal && <NewItemModal 
          type={newItemModal.type} 
          parentId={newItemModal.parentId}
          onClose={() => setNewItemModal(null)}
          onCreate={handleCreateItem}
          fileSystem={fileSystem}
      />}
      <div className="h-screen w-screen flex flex-col font-sans text-sm">
        <main className="flex-grow p-2 flex space-x-2 overflow-hidden">
          
          <FileTreePanel 
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
          />
          
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
                    activeLanguage={activeLanguage}
                    onApplyFix={handleApplyCodeFix}
                />
            </div>
          </div>
          
          <div className="flex flex-col space-y-2 min-h-0" style={{flex: '3 1 0%'}}>
              <EditorPanel 
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
              />
              <div className="flex-shrink-0 flex space-x-2 h-[220px]">
                  <InfoCardListPanel cards={infoCardsData} />
                  <UserDetailsPanel user={currentUser} onDeleteClick={() => alert('Delete user clicked!')} />
                  <ActionButtonsPanel 
                      title="Actions" 
                      buttons={actionButtons} 
                      onHelpClick={() => setHelpOpen(true)}
                      isExecuting={isExecuting}
                  />
              </div>
          </div>

        </main>
      </div>
    </>
  );
};

export default App;