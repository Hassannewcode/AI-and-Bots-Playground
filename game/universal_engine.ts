
import { Sprite, Prop, ExecutionResult, Problem, ExecutionStep, FileSystemTree, Zone } from './types';
import { nanoid } from 'nanoid';

// A proxy class to simulate the universal sprite object within our TS engine
class UniversalSprite {
    public id: string;
    public name: string;
    public shape: Sprite['shape'];
    public x: number;
    public y: number;
    public vx: number;
    public vy: number;
    public rotation: number;
    public data: Record<string, string | number>;
    private steps: ExecutionStep[];

    constructor(args: Record<string, string>, steps: ExecutionStep[]) {
        if (!args.name) throw new Error("Sprite() requires a 'name' argument.");
        
        this.id = nanoid(8);
        this.name = args.name.replace(/^["']|["']$/g, '');
        this.shape = (args.shape?.replace(/^["']|["']$/g, '') as Sprite['shape']) || 'cube';
        this.x = parseInt(args.x || '50', 10);
        this.y = parseInt(args.y || '50', 10);
        this.vx = 0;
        this.vy = 0;
        this.rotation = 0;
        this.data = {};
        this.steps = steps;

        const newSprite: Sprite = {
            id: this.id, name: this.name, shape: this.shape,
            x: this.x, y: this.y,
            vx: this.vx, vy: this.vy, rotation: this.rotation,
            styles: {}, data: {}, chatHistory: [],
        };
        this.steps.push({ type: 'CREATE_SPRITE', sprite: newSprite, duration: 0 });
    }

    say(args: Record<string, string>) {
        const message = args.message?.replace(/^["']|["']$/g, '') || '';
        const duration = parseFloat(args.duration || '2') * 1000;
        if (isNaN(duration)) throw new Error("Invalid duration for say().");
        this.steps.push({ type: 'SAY', spriteId: this.id, message, duration: 0 });
        this.steps.push({ type: 'WAIT', duration });
        this.steps.push({ type: 'CLEAR_MESSAGE', spriteId: this.id, duration: 0 });
    }
    
    chat(args: Record<string, string>) {
        const message = args.message?.replace(/^["']|["']$/g, '') || '';
        this.steps.push({ type: 'AI_CHAT_REQUEST', spriteId: this.id, message, duration: 0 });
    }

    move_to(args: Record<string, string>) {
        const newX = parseInt(args.x, 10);
        const newY = parseInt(args.y, 10);
        const speed = parseFloat(args.speed || '1') * 1000;
        if (isNaN(newX) || isNaN(newY)) throw new Error("move_to() requires numeric 'x' and 'y' arguments.");
        if (isNaN(speed)) throw new Error("Invalid speed for move_to().");
        this.steps.push({ type: 'MOVE_TO', spriteId: this.id, x: newX, y: newY, duration: speed });
        this.x = newX;
        this.y = newY;
    }
    
    go_to(args: Record<string, string>) {
        const newX = parseInt(args.x, 10);
        const newY = parseInt(args.y, 10);
        const speed = parseFloat(args.speed || '2') * 1000; // Pathfinding is slightly slower by default
        if (isNaN(newX) || isNaN(newY)) throw new Error("go_to() requires numeric 'x' and 'y' arguments.");
        if (isNaN(speed)) throw new Error("Invalid speed for go_to().");
        this.steps.push({ type: 'GO_TO', spriteId: this.id, x: newX, y: newY, duration: speed });
        this.x = newX;
        this.y = newY;
    }

    rotate_to(args: Record<string, string>) {
        const angle = parseInt(args.angle, 10);
        const speed = parseFloat(args.speed || '1') * 1000;
        if (isNaN(angle)) throw new Error("rotate_to() requires a numeric 'angle' argument.");
        if (isNaN(speed)) throw new Error("Invalid speed for rotate_to().");
        this.steps.push({ type: 'ROTATE_TO', spriteId: this.id, angle, duration: speed });
        this.rotation = angle;
    }

    look_at(args: Record<string, string>) {
        const targetX = parseInt(args.x, 10);
        const targetY = parseInt(args.y, 10);
        const speed = parseFloat(args.speed || '0.5') * 1000;
        if (isNaN(targetX) || isNaN(targetY)) throw new Error("look_at() requires numeric 'x' and 'y' arguments.");
        if (isNaN(speed)) throw new Error("Invalid speed for look_at().");
        this.steps.push({ type: 'LOOK_AT', spriteId: this.id, x: targetX, y: targetY, duration: speed });
    }

    set_style(args: Record<string, string>) {
        const speed = parseFloat(args.speed || '1') * 1000;
        if(isNaN(speed)) throw new Error("Invalid speed for set_style().");

        for(const [prop, value] of Object.entries(args)) {
            if(prop !== 'speed') {
                const cleanValue = value.replace(/^["']|["']$/g, '');
                this.steps.push({type: 'SET_STYLE', spriteId: this.id, property: prop, value: cleanValue, duration: speed});
            }
        }
    }
}

const validLibraries = new Set(['ai', 'world', 'physics', 'sound', 'neurons']);

const libraryHandlers = {
    world: {
        set_background: (args: Record<string, string>, steps: ExecutionStep[]) => {
            const color = args.color?.replace(/'|"/g, '');
            if (!color) throw new Error("world.set_background() requires a 'color' argument.");
            steps.push({ type: 'SET_BACKGROUND', color, duration: 0 });
        },
        create_zone: (args: Record<string, string>, steps: ExecutionStep[]) => {
            const zone: Zone = {
                id: nanoid(8), name: (args.name || 'zone').replace(/'|"/g, ''),
                x: parseInt(args.x || '0', 10), y: parseInt(args.y || '0', 10),
                width: parseInt(args.width || '10', 10), height: parseInt(args.height || '10', 10),
                color: (args.color || '#ffffff').replace(/'|"/g, ''),
            };
            if (isNaN(zone.x) || isNaN(zone.y) || isNaN(zone.width) || isNaN(zone.height)) {
                 throw new Error("world.create_zone() requires numeric dimensions (x, y, width, height).");
            }
            steps.push({ type: 'CREATE_ZONE', zone, duration: 0 });
        }
    },
    physics: {
        set_gravity: (args: Record<string, string>, steps: ExecutionStep[], rawArgs: string) => {
             const strength = parseFloat(args.strength ?? rawArgs);
            if (isNaN(strength)) throw new Error("physics.set_gravity() requires a numeric strength.");
            steps.push({ type: 'SET_GRAVITY', strength, duration: 0 });
        }
    },
    sound: {
        play: (args: Record<string, string>, steps: ExecutionStep[]) => {
            let x = parseInt(args.x || '50', 10);
            let y = parseInt(args.y || '50', 10);
            if (isNaN(x) || isNaN(y)) throw new Error("sound.play() requires numeric 'x' and 'y' coordinates.");
            steps.push({ type: 'PLAY_SOUND', x, y, duration: 0 });
        }
    },
    neurons: {
        create_network: (args: Record<string, string>, steps: ExecutionStep[], variables: Map<string, UniversalSprite>) => {
            const sprite = variables.get(args.sprite);
            if (!sprite) throw new Error(`neurons.create_network() requires a valid sprite variable.`);
            steps.push({ type: 'CREATE_NETWORK', spriteId: sprite.id, duration: 0 });
        },
        reward: (args: Record<string, string>, steps: ExecutionStep[], variables: Map<string, UniversalSprite>) => {
            const sprite = variables.get(args.sprite);
            const value = parseFloat(args.value || '1');
            if (!sprite) throw new Error(`neurons.reward() requires a valid sprite variable.`);
            if (isNaN(value)) throw new Error(`neurons.reward() requires a numeric value.`);
            steps.push({ type: 'REWARD_SPRITE', spriteId: sprite.id, value, duration: 0 });
        }
    },
    ai: {
        wait: (args: Record<string, string>, steps: ExecutionStep[], rawArgs: string) => {
            const duration = parseFloat(rawArgs) * 1000;
            if (isNaN(duration)) throw new Error("Invalid duration for ai.wait().");
            steps.push({ type: 'WAIT', duration });
        },
        create_prop: (args: Record<string, string>, steps: ExecutionStep[]) => {
             const prop: Prop = {
                id: nanoid(8),
                shape: (args.shape?.replace(/^["']|["']$/g, '') as Prop['shape']) || 'wall',
                x: parseInt(args.x || '50', 10),
                y: parseInt(args.y || '50', 10),
                width: parseInt(args.width || '10', 10),
                height: parseInt(args.height || '10', 10),
                styles: {},
                color: args.color?.replace(/'|"/g, ''),
            }
            if (isNaN(prop.x) || isNaN(prop.y) || isNaN(prop.width) || isNaN(prop.height)) {
                 throw new Error("ai.create_prop() requires numeric dimensions (x, y, width, height).");
            }
            steps.push({ type: 'CREATE_PROP', prop, duration: 0 });
        }
    }
};

function parseArgs(argsString: string): Record<string, string> {
    const args: Record<string, string> = {};
    const argRegex = /(\w+)\s*[:=]\s*(f?["'](?:[^"'\\]|\\.)*["']|[\d.-]+|True|False|\w+\.\w+)/g;
    let match;
    while ((match = argRegex.exec(argsString)) !== null) {
        args[match[1]] = match[2];
    }
    return args;
}


export function parseUniversalCode(code: string, fileSystem: FileSystemTree): Omit<ExecutionResult, 'newState'> {
    const logs: string[] = [`Compiling universal code...`];
    const problems: Problem[] = [];
    const steps: ExecutionStep[] = [];
    const variables = new Map<string, UniversalSprite>();
    const spriteNames = new Set<string>();
    const importedLibraries = new Set<string>();
    
    const lines = code.split('\n');

    for (let i = 0; i < lines.length; i++) {
        const lineNumber = i + 1;
        let trimmedLine = lines[i].trim();

        // Strip comments first
        trimmedLine = trimmedLine.replace(/(#|\/\/|--).*/, '').trim();
        if (trimmedLine === '') continue;
        
        try {
            // Match import statements first: import lib1, lib2
            const importMatch = trimmedLine.match(/^\s*import\s+([\w,\s]+);?$/);
            if (importMatch) {
                const libs = importMatch[1].split(',').map(s => s.trim());
                for (const lib of libs) {
                    if (validLibraries.has(lib)) {
                        importedLibraries.add(lib);
                    } else {
                        throw new Error(`Unknown library '${lib}'. Available: ${[...validLibraries].join(', ')}.`);
                    }
                }
                logs.push(`Compiled: Imported libraries: ${libs.join(', ')}.`);
                continue;
            }

            // Match sprite creation: bot = ai.Sprite(...)
            const creationMatch = trimmedLine.match(/^(\w+)\s*=\s*ai\.Sprite\((.*)\)$/);
            if (creationMatch) {
                 if (!importedLibraries.has('ai')) {
                    throw new Error("Library 'ai' not imported. Add 'import ai' to the top of your file.");
                }
                const [, varName, argsString] = creationMatch;
                const args = parseArgs(argsString);
                const sprite = new UniversalSprite(args, steps);
                if (variables.has(varName)) throw new Error(`Variable '${varName}' is already defined.`);
                if (spriteNames.has(sprite.name)) throw new Error(`A sprite named '${sprite.name}' already exists.`);
                variables.set(varName, sprite);
                spriteNames.add(sprite.name);
                logs.push(`Compiled: Created sprite '${sprite.name}' as '${varName}'.`);
                continue;
            }

            // Match print statements: print(...) / console.log(...)
            const printMatch = trimmedLine.match(/^(?:print|console\.log)\((.*)\)$/);
            if(printMatch) {
                let message = printMatch[1];
                // This new regex handles both ${js} and {python} style interpolations
                message = message.replace(/\$\{([^}]+)\}|\{([^}]+)\}/g, (_, jsExpression, pyExpression) => {
                    const expression = (jsExpression || pyExpression || '').trim();
                    if (!expression) return '';

                    const [varName, prop] = expression.split('.');

                    const sprite = variables.get(varName);
                    
                    if (!sprite || !prop) {
                        // Return original if variable/property structure is wrong
                        return jsExpression !== undefined ? `\${${expression}}` : `{${expression}}`;
                    }

                    const value = sprite[prop as keyof UniversalSprite];

                    // Return original if property doesn't exist on sprite, otherwise return value
                    return value !== undefined ? String(value) : (jsExpression !== undefined ? `\${${expression}}` : `{${expression}}`);
                });
                
                // Use a more robust regex to strip optional 'f' prefixes and matching quotes/backticks.
                // If no quotes are found, it returns the original message.
                const finalMessage = message.replace(/^f?(["'`])([\s\S]*?)\1$/, '$2');
                steps.push({ type: 'LOG', message: finalMessage, duration: 0 });
                continue;
            }
            
            // Match library calls: library.method(...) or library:method(...)
            const libCallMatch = trimmedLine.match(/^(\w+)[.:](\w+)\((.*)\)$/);
            if (libCallMatch) {
                const [, libName, methodName, argsString] = libCallMatch;

                if (validLibraries.has(libName) && !importedLibraries.has(libName)) {
                     throw new Error(`Library '${libName}' not imported. Add 'import ${libName}' to the top of your file.`);
                }

                const args = parseArgs(argsString);
                const handler = (libraryHandlers as any)[libName]?.[methodName];
                if (handler) {
                    if (libName === 'neurons') handler(args, steps, variables);
                    else if (libName === 'physics' && methodName === 'set_gravity') handler(args, steps, argsString);
                    else if (libName === 'ai' && methodName === 'wait') handler(args, steps, argsString);
                    else handler(args, steps);
                    continue;
                }
            }

            // Match sprite method calls: object.method(...) or object:method(...)
            const spriteCallMatch = trimmedLine.match(/^(\w+)[.:]([\w_]+)\((.*)\)$/);
            if (spriteCallMatch) {
                const [, objName, methodName, argsString] = spriteCallMatch;
                const sprite = variables.get(objName);
                if (sprite) {
                    const method = (sprite as any)[methodName];
                    if (typeof method === 'function') {
                        const args = parseArgs(argsString);
                        method.call(sprite, args);
                    } else {
                        throw new Error(`'${objName}' has no method named '${methodName}'.`);
                    }
                    continue;
                }
            }

            throw new Error(`Invalid syntax or unknown command.`);

        } catch (error) {
            const message = error instanceof Error ? error.message : 'An unknown error occurred.';
            problems.push({ line: lineNumber, message });
            return { logs, problems, steps: [], executedLines: lines.length };
        }
    }

    logs.push(problems.length > 0 ? `Compilation failed with ${problems.length} error(s).` : `Compilation successful. ${steps.length} steps generated.`);
    return { logs, problems, steps, executedLines: lines.length };
}
