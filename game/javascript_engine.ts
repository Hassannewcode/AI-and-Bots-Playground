import { Sprite, Prop, ExecutionResult, Problem, ExecutionStep, FileSystemTree, Zone } from './types';
import { nanoid } from 'nanoid';

class JavaScriptSprite {
    public id: string;
    public name: string;
    public x: number;
    public y: number;
    
    constructor(id: string, name: string, x: number, y: number) {
        this.id = id;
        this.name = name;
        this.x = x;
        this.y = y;
    }
}

export function executeJavaScriptCode(code: string, fileSystem: FileSystemTree, fileId: string): Omit<ExecutionResult, 'newState'> {
    const logs: string[] = [];
    const problems: Problem[] = [];
    const steps: ExecutionStep[] = [];
    const spriteInstances = new Map<string, JavaScriptSprite>();
    const spriteNames = new Set<string>();

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
                
                // Return a proxy to intercept method calls
                return new Proxy(sprite, {
                    get(target, prop) {
                        if (prop in target) return (target as any)[prop];

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
                            } else if (prop === 'create_network') {
                                steps.push({ type: 'SPRITE_CREATE_NETWORK', spriteId: id, duration: 0 });
                            } else if (prop === 'reward') {
                                steps.push({ type: 'SPRITE_REWARD', spriteId: id, value: methodArgs.value ?? 1, duration: 0 });
                            }
                        }
                    }
                });
            },
            wait: (args: { seconds: number }) => {
                if (!args || typeof args.seconds !== 'number') throw new Error("ai.wait() requires an object with a numeric 'seconds' property.");
                steps.push({ type: 'WAIT', duration: args.seconds * 1000 });
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
        // Placeholders for other libraries
        physics: {},
    });

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

    try {
        const bridge = createApiBridge();
        const sandboxedExecutor = new Function(
            'ai', 'world', 'sound', 'physics', 'console',
            `"use strict";\n${code}`
        );
        
        sandboxedExecutor(
            bridge.ai, bridge.world, bridge.sound, bridge.physics, customConsole
        );
        logs.push(`Execution successful. ${steps.length} steps generated.`);
    } catch (e) {
        const error = e as Error;
        const message = error.message || "An unknown JavaScript error occurred.";
        
        const stackLine = error.stack?.split('\n')[1] || '';
        const lineMatch = stackLine.match(/<anonymous>:(\d+):(\d+)/);
        const line = lineMatch ? parseInt(lineMatch[1], 10) - 1 : 0; // -1 for the "use strict" line

        problems.push({ fileId, line, message, code, language: 'js' });
        logs.push(`Execution failed.`);
    }

    return { logs, problems, steps, executedLines: code.split('\n').length };
}
