
import { Sprite, Prop, ExecutionResult, Problem, ExecutionStep, FileSystemTree, Zone } from './types';
import { nanoid } from 'nanoid';

class JavaScriptSprite {
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
}

export async function executeJavaScriptCode(code: string, fileSystem: FileSystemTree, fileId: string): Promise<Omit<ExecutionResult, 'newState'>> {
    const logs: string[] = [];
    const problems: Problem[] = [];
    const steps: ExecutionStep[] = [];
    const spriteInstances = new Map<string, JavaScriptSprite>();
    const spriteNames = new Set<string>();
    
    const customConsole = {
        log: (...args: any[]) => {
            logs.push(args.map(a => {
                try {
                    return typeof a === 'object' ? JSON.stringify(a) : String(a);
                } catch {
                    return '[Circular Object]';
                }
            }).join(' '));
        }
    };

    const createApiBridge = () => ({
        ai: {
            Sprite: (args: { name: string, shape?: Sprite['shape'], x?: number, y?: number }): JavaScriptSprite => {
                if (!args || !args.name) throw new Error("ai.Sprite() requires an object with a 'name' property.");
                if (spriteNames.has(args.name)) throw new Error(`A sprite named '${args.name}' already exists.`);
                
                const id = nanoid(8);
                const x = args.x ?? 50;
                const y = args.y ?? 50;
                const sprite = new JavaScriptSprite(id, args.name, x, y);
                
                const newSprite: Sprite = {
                    id, name: args.name, shape: args.shape || 'cube', x, y,
                    vx: 0, vy: 0, rotation: 0, styles: {}, data: {}
                };
                steps.push({ type: 'CREATE_SPRITE', sprite: newSprite, duration: 0 });
                spriteInstances.set(id, sprite);
                spriteNames.add(args.name);
                
                // Return a proxy to intercept method calls and property access
                return new Proxy(sprite, {
                    get(target, prop) {
                        if (prop in target) {
                            return (target as any)[prop];
                        }

                        // Intercept method calls
                        return (methodArgs: any = {}) => {
                             if (prop === 'say') {
                                const duration = (methodArgs.duration ?? 2) * 1000;
                                steps.push({ type: 'SAY', spriteId: id, message: methodArgs.message ?? '', duration: 0 });
                                steps.push({ type: 'WAIT', duration });
                                steps.push({ type: 'CLEAR_MESSAGE', spriteId: id, duration: 0 });
                            } else if (prop === 'go_to') {
                                const speed = (methodArgs.speed ?? 2) * 1000;
                                target.x = methodArgs.x;
                                target.y = methodArgs.y;
                                steps.push({ type: 'GO_TO', spriteId: id, x: methodArgs.x, y: methodArgs.y, duration: speed });
                            } else if (prop === 'move_to') {
                                const speed = (methodArgs.speed ?? 1) * 1000;
                                target.x = methodArgs.x;
                                target.y = methodArgs.y;
                                steps.push({ type: 'MOVE_TO', spriteId: id, x: methodArgs.x, y: methodArgs.y, duration: speed });
                            } else if (prop === 'rotate_to') {
                                const speed = (methodArgs.speed ?? 1) * 1000;
                                target.rotation = methodArgs.angle;
                                steps.push({ type: 'ROTATE_TO', spriteId: id, angle: methodArgs.angle, duration: speed });
                            } else if (prop === 'look_at') {
                                const speed = (methodArgs.speed ?? 0.5) * 1000;
                                const dx = methodArgs.x - target.x;
                                const dy = methodArgs.y - target.y;
                                const angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
                                target.rotation = angle;
                                steps.push({ type: 'LOOK_AT', spriteId: id, x: methodArgs.x, y: methodArgs.y, duration: speed });
                            } else if (prop === 'chat') {
                                steps.push({ type: 'AI_CHAT_REQUEST', spriteId: id, message: methodArgs.message ?? '', duration: 0 });
                            } else if (prop === 'create_network') {
                                steps.push({ type: 'SPRITE_CREATE_NETWORK', spriteId: id, duration: 0 });
                            } else if (prop === 'reward') {
                                steps.push({ type: 'SPRITE_REWARD', spriteId: id, value: methodArgs.value ?? 1, duration: 0 });
                            }
                        }
                    },
                    set(target, prop, value) {
                        // Handle direct property assignment for rendering updates
                        if (prop === 'x' || prop === 'y' || prop === 'rotation') {
                            if (typeof value !== 'number') {
                                customConsole.log(`Warning: Sprite property '${String(prop)}' must be a number.`);
                                return true;
                            }
                            
                            (target as any)[prop] = value;

                            if (prop === 'x' || prop === 'y') {
                                // Create an instantaneous move step to update the renderer
                                steps.push({ type: 'MOVE_TO', spriteId: id, x: target.x, y: target.y, duration: 0 });
                            } else { // prop === 'rotation'
                                steps.push({ type: 'ROTATE_TO', spriteId: id, angle: target.rotation, duration: 0 });
                            }
                            return true;
                        }
                        
                        // Prevent changing immutable properties or adding new ones
                        if (prop === 'id' || prop === 'name') {
                             customConsole.log(`Warning: Cannot change immutable property '${String(prop)}' of sprite '${target.name}'.`);
                        } else {
                             customConsole.log(`Warning: Cannot set unknown property '${String(prop)}' on sprite '${target.name}'.`);
                        }
                        return true; // Return true to avoid throwing an error in strict mode
                    }
                });
            },
            wait: (seconds: number) => {
                if (typeof seconds !== 'number') throw new Error("ai.wait() requires a numeric argument for seconds.");
                steps.push({ type: 'WAIT', duration: seconds * 1000 });
            },
        },
        world: {
            set_background: (args: { color: string }) => {
                steps.push({ type: 'SET_BACKGROUND', color: args.color || '#000', duration: 0 });
            }
        },
        sound: {
            play: (args: { x: number, y: number }) => {
                 steps.push({ type: 'PLAY_SOUND', x: args.x ?? 50, y: args.y ?? 50, duration: 0 });
            }
        },
        physics: {
            set_gravity: (args: { strength: number }) => {
                if (!args || typeof args.strength !== 'number') throw new Error("physics.set_gravity() requires an object with a numeric 'strength' property.");
                steps.push({ type: 'SET_GRAVITY', strength: args.strength, duration: 0 });
            }
        },
    });

    try {
        const bridge = createApiBridge();
        
        // Use the AsyncFunction constructor to properly handle top-level await and promises
        const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;

        const sandboxedExecutor = new AsyncFunction(
            'ai', 'world', 'sound', 'physics', 'console',
            `"use strict";\n${code}`
        );
        
        await sandboxedExecutor(
            bridge.ai, bridge.world, bridge.sound, bridge.physics, customConsole
        );
        logs.push(`Execution successful. ${steps.length} steps generated.`);
    } catch (e) {
        const error = e as Error;
        const message = error.message || "An unknown JavaScript error occurred.";
        
        const stackLine = error.stack?.split('\n')[1] || '';
        const lineMatch = stackLine.match(/<anonymous>:(\d+):(\d+)/);
        // Adjust line number for the prepended "use strict" line.
        const line = lineMatch ? parseInt(lineMatch[1], 10) - 1 : 0; 

        problems.push({ fileId, line: Math.max(0, line), message, code, language: 'js' });
        logs.push(`Execution failed.`);
    }

    return { logs, problems, steps, executedLines: code.split('\n').length };
}