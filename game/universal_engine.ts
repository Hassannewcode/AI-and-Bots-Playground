import { ExecutionStep, Problem, Sprite } from './types';
import { nanoid } from 'nanoid';

// A generic function to extract named arguments like: (name: "Bot", x: 10, y: 20)
// Or keyword arguments like: name = "Bot", x = 10, y = 20
const extractNamedArgs = (argString: string): Record<string, any> => {
    const args: Record<string, any> = {};
    const regex = /(\w+)\s*[:=]\s*("([^"]*)"|'([^']*)'|([\d.-]+))/g;
    let match;
    while ((match = regex.exec(argString)) !== null) {
        const [, key, , stringVal1, stringVal2, numVal] = match;
        args[key] = numVal !== undefined ? parseFloat(numVal) : (stringVal1 || stringVal2);
    }
    return args;
};

// A generic function to extract positional arguments like: ("Bot", "user", 10, 20)
const extractPositionalArgs = (argString: string): any[] => {
    const args: any[] = [];
    const regex = /"([^"]*)"|'([^']*)'|([\d.-]+)/g;
    let match;
    while ((match = regex.exec(argString)) !== null) {
        const [, stringVal1, stringVal2, numVal] = match;
        args.push(numVal !== undefined ? parseFloat(numVal) : (stringVal1 || stringVal2));
    }
    return args;
};

const LANG_CONFIGS = {
    // C#, Dart, Swift often use named parameters
    cs: { style: 'named', apiObject: 'AI', spriteClass: 'Sprite', newKeyword: 'new', separator: '.' },
    dart: { style: 'named', apiObject: 'ai', spriteClass: 'Sprite', newKeyword: '', separator: '.' },
    swift: { style: 'named', apiObject: 'AI', spriteClass: 'Sprite', newKeyword: '', separator: '.' },
    // C++, Java, Rust, Go, Kotlin, Scala often use positional
    cpp: { style: 'positional', apiObject: 'ai', spriteClass: 'Sprite', newKeyword: '', separator: '::' },
    c: { style: 'positional', apiObject: 'ai', spriteClass: 'Sprite', newKeyword: '', separator: '_' }, // C-style: ai_Sprite_create
    java: { style: 'positional', apiObject: 'AI', spriteClass: 'Sprite', newKeyword: 'new', separator: '.' },
    kt: { style: 'positional', apiObject: 'ai', spriteClass: 'Sprite', newKeyword: '', separator: '.' },
    scala: { style: 'positional', apiObject: 'ai', spriteClass: 'Sprite', newKeyword: 'new', separator: '.' },
    rust: { style: 'positional', apiObject: 'ai', spriteClass: 'Sprite', newKeyword: '', separator: '::' },
    go: { style: 'positional', apiObject: 'ai', spriteClass: 'Sprite', newKeyword: '', separator: '.' },
};

export async function executeUniversalCode(code: string, fileId: string, language: string): Promise<Omit<any, 'newState'>> {
    const logs: string[] = [];
    const problems: Problem[] = [];
    const steps: ExecutionStep[] = [];
    const spriteNames = new Set<string>();

    const config = LANG_CONFIGS[language as keyof typeof LANG_CONFIGS];
    if (!config) {
        return {
            logs: [`Execution for language '${language}' is not implemented.`],
            problems: [],
            steps: [],
            executedLines: 0,
        };
    }

    const lines = code.split('\n');
    lines.forEach((line, index) => {
        try {
            // Match sprite creation
            const creationPattern = new RegExp(`(\\w+)\\s*[:=]*\\s*(?:${config.newKeyword}\\s+)?${config.apiObject}${config.separator}${config.spriteClass}\\((.*?)\\)`);
            const creationMatch = line.match(creationPattern);
            if (creationMatch) {
                const [, varName, argString] = creationMatch;
                let args;
                let name, shape, x, y;

                if (config.style === 'named') {
                    args = extractNamedArgs(argString);
                    name = args.name;
                    shape = args.shape || 'cube';
                    x = args.x ?? 50;
                    y = args.y ?? 50;
                } else {
                    args = extractPositionalArgs(argString);
                    [name, shape = 'cube', x = 50, y = 50] = args;
                }

                if (!name) throw new Error(`Sprite creation on line ${index + 1} is missing a name.`);
                if (spriteNames.has(name)) throw new Error(`Sprite with name '${name}' already exists.`);

                const id = nanoid(8);
                const newSprite: Sprite = { id, name, shape, x, y, vx: 0, vy: 0, rotation: 0, styles: {}, data: {} };
                steps.push({ type: 'CREATE_SPRITE', sprite: newSprite, duration: 0 });
                spriteNames.add(varName);
                return;
            }

            // Match method calls on sprites, e.g. bot.say(...) or bot->say(...)
            const methodCallPattern = new RegExp(`(${Array.from(spriteNames).join('|')})(?:\\.|->)(\\w+)\\((.*?)\\)`);
            if (spriteNames.size > 0) {
                const methodMatch = line.match(methodCallPattern);
                if (methodMatch) {
                    const [, varName, methodName, argString] = methodMatch;

                    const spriteCreationStep = steps.find(s => s.type === 'CREATE_SPRITE' && spriteNames.has(varName)) as Extract<ExecutionStep, {type: 'CREATE_SPRITE'}> | undefined;

                    if (!spriteCreationStep) return;
                    const spriteId = spriteCreationStep.sprite.id;

                    let args;
                    if (config.style === 'named') args = extractNamedArgs(argString);
                    else args = extractPositionalArgs(argString);
                    
                    switch (methodName) {
                        case 'say': {
                            const message = config.style === 'named' ? args.message : args[0];
                            const duration = (config.style === 'named' ? args.duration ?? 2 : args[1] ?? 2) * 1000;
                            steps.push({ type: 'SAY', spriteId, message: message ?? '', duration: 0 });
                            steps.push({ type: 'WAIT', duration });
                            steps.push({ type: 'CLEAR_MESSAGE', spriteId, duration: 0 });
                            break;
                        }
                        case 'go_to': {
                            const x = config.style === 'named' ? args.x : args[0];
                            const y = config.style === 'named' ? args.y : args[1];
                            const speed = (config.style === 'named' ? args.speed ?? 2 : args[2] ?? 2) * 1000;
                            steps.push({ type: 'GO_TO', spriteId, x, y, duration: speed });
                            break;
                        }
                        case 'create_network': {
                            steps.push({ type: 'SPRITE_CREATE_NETWORK', spriteId, duration: 0 });
                            break;
                        }
                        case 'reward': {
                            const value = (config.style === 'named' ? args.value : args[0]) ?? 1;
                            steps.push({ type: 'SPRITE_REWARD', spriteId, value, duration: 0 });
                            break;
                        }
                    }
                }
            }

        } catch (e: any) {
            problems.push({ fileId, line: index + 1, message: e.message, code, language });
        }
    });

    if (problems.length === 0) {
        logs.push(`Execution successful. ${steps.length} steps generated.`);
    } else {
        logs.push(`Execution failed with ${problems.length} problem(s).`);
    }

    return { logs, problems, steps, executedLines: lines.length };
}