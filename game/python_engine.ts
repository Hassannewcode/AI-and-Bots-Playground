import { Sprite, ExecutionResult, Problem, ExecutionStep, FileSystemTree } from './types';
import { nanoid } from 'nanoid';

let pyodideDirectPromise: Promise<any> | null = null;
let pyodideViaPyScriptPromise: Promise<any> | null = null;

function loadScript(url: string, id: string): Promise<void> {
    return new Promise((resolve, reject) => {
        if (document.getElementById(id)) {
            resolve();
            return;
        }
        const script = document.createElement('script');
        script.src = url;
        script.id = id;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load script: ${url}`));
        document.head.appendChild(script);
    });
}

async function getPyodideDirectly() {
    if (pyodideDirectPromise) return pyodideDirectPromise;

    pyodideDirectPromise = (async () => {
        await loadScript('https://cdn.jsdelivr.net/pyodide/v0.26.1/full/pyodide.js', 'pyodide-script');
        // @ts-ignore
        console.log("Loading Pyodide directly...");
        // @ts-ignore
        const pyodide = await window.loadPyodide();
        console.log("Pyodide loaded directly.");
        return pyodide;
    })();
    return pyodideDirectPromise;
}

async function getPyodideViaPyScript() {
    if (pyodideViaPyScriptPromise) return pyodideViaPyScriptPromise;

    pyodideViaPyScriptPromise = (async () => {
        await loadScript('https://pyscript.net/releases/2024.1.1/core.js', 'pyscript-script');
        
        console.log("Loading Pyodide via PyScript...");
        // Poll for pyscript to be ready
        await new Promise<void>(resolve => {
            const interval = setInterval(() => {
                // @ts-ignore
                if (window.pyscript?.interpreter) {
                    clearInterval(interval);
                    resolve();
                }
            }, 100);
        });
        
        // @ts-ignore
        await window.pyscript.interpreter.ready;
        console.log("Pyodide loaded via PyScript.");
        // @ts-ignore
        return window.pyscript.interpreter.pyodide;
    })();
    return pyodideViaPyScriptPromise;
}

// Helper to convert PyProxy kwargs to a JS object
function kwargsToJs(kwargs: any): Record<string, any> {
    if (!kwargs || typeof kwargs.toJs !== 'function') return {};
    return kwargs.toJs({ dict_converter: Object.fromEntries });
}

export async function executePythonCode(code: string, fileSystem: FileSystemTree, fileId: string, engine: 'pyodide' | 'pyscript'): Promise<Omit<ExecutionResult, 'newState'>> {
    const logs: string[] = [];
    const problems: Problem[] = [];
    const steps: ExecutionStep[] = [];
    
    try {
        const pyodide = engine === 'pyodide' 
           ? await getPyodideDirectly() 
           : await getPyodideViaPyScript();

        if (!pyodide) {
            throw new Error("Python interpreter (Pyodide) failed to initialize.");
        }

        const spriteNames = new Set<string>();

        class PythonSprite {
            public id: string;
            public name: string;
            public x: number;
            public y: number;
            public rotation: number;

            constructor(id: string, name: string, x: number, y: number) {
                this.id = id;
                this.name = name;
                this.x = x;
                this.y = y;
                this.rotation = 0;
            }

            say(kwargs: any) {
                const args = kwargsToJs(kwargs);
                const duration = (args.duration ?? 2) * 1000;
                steps.push({ type: 'SAY', spriteId: this.id, message: args.message ?? '', duration: 0 });
                steps.push({ type: 'WAIT', duration });
                steps.push({ type: 'CLEAR_MESSAGE', spriteId: this.id, duration: 0 });
            }

            go_to(kwargs: any) {
                const args = kwargsToJs(kwargs);
                const speed = (args.speed ?? 2) * 1000;
                this.x = args.x;
                this.y = args.y;
                steps.push({ type: 'GO_TO', spriteId: this.id, x: args.x, y: args.y, duration: speed });
            }
            
            move_to(kwargs: any) {
                const args = kwargsToJs(kwargs);
                const speed = (args.speed ?? 1) * 1000;
                this.x = args.x;
                this.y = args.y;
                steps.push({ type: 'MOVE_TO', spriteId: this.id, x: args.x, y: args.y, duration: speed });
            }

            rotate_to(kwargs: any) {
                const args = kwargsToJs(kwargs);
                const speed = (args.speed ?? 1) * 1000;
                this.rotation = args.angle;
                steps.push({ type: 'ROTATE_TO', spriteId: this.id, angle: args.angle, duration: speed });
            }

            look_at(kwargs: any) {
                const args = kwargsToJs(kwargs);
                const speed = (args.speed ?? 0.5) * 1000;
                const dx = args.x - this.x;
                const dy = args.y - this.y;
                const angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
                this.rotation = angle;
                steps.push({ type: 'LOOK_AT', spriteId: this.id, x: args.x, y: args.y, duration: speed });
            }
            
            chat(kwargs: any) {
                const args = kwargsToJs(kwargs);
                steps.push({ type: 'AI_CHAT_REQUEST', spriteId: this.id, message: args.message ?? '', duration: 0 });
            }

            create_network() {
                steps.push({ type: 'SPRITE_CREATE_NETWORK', spriteId: this.id, duration: 0 });
            }

            reward(kwargs: any) {
                const args = kwargsToJs(kwargs);
                steps.push({ type: 'SPRITE_REWARD', spriteId: this.id, value: args.value ?? 1, duration: 0 });
            }
        }

        const apiBridge = {
            Sprite: (kwargs: any) => {
                const args = kwargsToJs(kwargs);
                if (!args.name) throw new Error("Sprite() requires a 'name' argument.");
                if (spriteNames.has(args.name)) throw new Error(`A sprite named '${args.name}' already exists.`);
                
                const id = nanoid(8);
                const name = args.name;
                const shape = args.shape || 'cube';
                const x = args.x ?? 50;
                const y = args.y ?? 50;
                
                const newSprite: Sprite = {
                    id, name, shape, x, y, vx: 0, vy: 0, rotation: 0, styles: {}, data: {},
                };
                steps.push({ type: 'CREATE_SPRITE', sprite: newSprite, duration: 0 });
                spriteNames.add(name);

                return new PythonSprite(id, name, x, y);
            },
            wait: (seconds: number) => {
                if (typeof seconds !== 'number') throw new Error("ai.wait() requires a numeric argument for seconds.");
                steps.push({ type: 'WAIT', duration: seconds * 1000 });
            },
        };

        const worldBridge = {
             set_background: (kwargs: any) => {
                const args = kwargsToJs(kwargs);
                steps.push({ type: 'SET_BACKGROUND', color: args.color || '#000', duration: 0 });
            },
        };
        
        const physicsBridge = {
             set_gravity: (kwargs: any) => {
                const args = kwargsToJs(kwargs);
                steps.push({ type: 'SET_GRAVITY', strength: args.strength ?? 0, duration: 0 });
            },
        };

        const soundBridge = {
            play: (kwargs: any) => {
                const args = kwargsToJs(kwargs);
                steps.push({ type: 'PLAY_SOUND', x: args.x ?? 50, y: args.y ?? 50, duration: 0 });
            }
        };

        pyodide.globals.set('ai', apiBridge);
        pyodide.globals.set('world', worldBridge);
        pyodide.globals.set('sound', soundBridge);
        pyodide.globals.set('physics', physicsBridge); 
        pyodide.globals.set('print', (...args: any[]) => {
            const message = args.map(a => a?.toString() ?? 'None').join(' ');
            logs.push(message);
        });

        await pyodide.runPythonAsync(code);
        logs.push(`Execution successful. ${steps.length} steps generated.`);

    } catch (e: any) {
        const errorMessage = e.message || "An unknown Python error occurred.";
        const tracebackRegex = /File "<exec>", line (\d+)/;
        const match = errorMessage.match(tracebackRegex);
        const line = match ? parseInt(match[1], 10) : 0;
        
        problems.push({ fileId, line, message: errorMessage, code, language: 'py' });
        logs.push(`Execution failed.`);
    }

    return { logs, problems, steps, executedLines: code.split('\n').length };
}