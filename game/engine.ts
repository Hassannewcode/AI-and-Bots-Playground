


import { ExecutionResult, FileSystemTree, ExecutionStep, Prop } from './types';
import { executePythonCode } from './python_engine';
import { executeJavaScriptCode } from './javascript_engine';
import { transpileCode } from './gemini';
import { nanoid } from 'nanoid';

// New function to parse world.html for declarative props
function parseWorldHTML(htmlContent: string): ExecutionStep[] {
    const steps: ExecutionStep[] = [];
    if (typeof DOMParser === 'undefined') return steps; // Guard for non-browser environments

    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');
        const props = doc.querySelectorAll('.prop');

        props.forEach(el => {
            const shape = el.getAttribute('data-shape') as Prop['shape'] || 'rock';
            const style = el.getAttribute('style') || '';
            
            const styleProps = style.split(';')
              .filter(s => s.trim())
              .reduce((acc, s) => {
                const [key, value] = s.split(':');
                if (key && value) acc[key.trim()] = value.trim();
                return acc;
            }, {} as Record<string, string>);

            const newProp: Prop = {
                id: nanoid(8),
                shape,
                x: parseFloat(styleProps.left) || 50,
                y: parseFloat(styleProps.top) || 50,
                width: parseFloat(styleProps.width) || 10,
                height: parseFloat(styleProps.height) || 10,
                styles: {
                    backgroundColor: styleProps['background-color'],
                }
            };
            steps.push({ type: 'CREATE_PROP', prop: newProp, duration: 0 });
        });
    } catch (e) {
        console.error("Failed to parse world.html:", e);
    }
    return steps;
}

const LANGUAGE_NAME_MAP: Record<string, string> = {
    c: 'C',
    cpp: 'C++',
    cs: 'C#',
    dart: 'Dart',
    go: 'Go',
    java: 'Java',
    kt: 'Kotlin',
    rs: 'Rust',
    scala: 'Scala',
    swift: 'Swift',
    py: 'Python',
    js: 'JavaScript'
};

export async function parseCode(
    code: string, 
    fileSystem: FileSystemTree, 
    language: string, 
    fileId: string, 
    pythonEngine: 'pyodide' | 'pyscript',
    logCallback: (message: string) => void
): Promise<Omit<ExecutionResult, 'newState'>> {
    // 1. Parse the world from HTML first to establish the static environment
    const worldFile = Object.values(fileSystem).find(node => node.name === 'world.html' && node.type === 'file');
    const worldSteps = worldFile ? parseWorldHTML((worldFile as any).code) : [];

    let scriptResult: Omit<ExecutionResult, 'newState'>;

    // 2. Execute the user's script based on language
    switch (language) {
        case 'py':
            scriptResult = await executePythonCode(code, fileSystem, fileId, pythonEngine);
            break;
        case 'js':
        case 'jsx':
        case 'ts':
        case 'tsx':
            scriptResult = await executeJavaScriptCode(code, fileSystem, fileId);
            break;
        case 'html':
            scriptResult = {
                logs: [`You are viewing world.html. Edit this file to define props. Run a .py or .js file to start the simulation.`],
                problems: [],
                steps: [],
                executedLines: 0,
            };
            break;
        // New cases for transpiled execution
        case 'c':
        case 'cpp':
        case 'cs':
        case 'dart':
        case 'go':
        case 'java':
        case 'kt':
        case 'rs':
        case 'scala':
        case 'swift':
            try {
                const sourceLangName = LANGUAGE_NAME_MAP[language] || language;
                logCallback(`Transpiling ${sourceLangName} to Python...`);
                
                const pythonCode = await transpileCode(code, language);
                logCallback(`Transpilation complete. Executing...`);

                // If the user wants to see the transpiled code, we can log it.
                // logCallback(`--- Transpiled Python Code ---\n${pythonCode}\n--------------------`);

                scriptResult = await executePythonCode(
                    pythonCode, 
                    fileSystem, 
                    fileId, 
                    pythonEngine,
                    { code, language } // Pass original source for better error mapping
                );
            } catch (e) {
                 const errorMessage = e instanceof Error ? e.message : "An unknown transpilation error occurred.";
                 scriptResult = {
                    logs: [`Failed to transpile code. ${errorMessage}`],
                    problems: [{ fileId, line: 0, message: `Transpilation Error: ${errorMessage}`, code, language }],
                    steps: [],
                    executedLines: 0,
                };
            }
            break;
        default:
            // For languages like md, txt, etc.
            scriptResult = {
                logs: [`File type '${language}' is not runnable. Only Python (.py) and JavaScript (.js) are supported for direct execution. Other languages are transpiled.`],
                problems: [],
                steps: [],
                executedLines: 0,
            };
            break;
    }

    // 3. Combine world steps and script steps
    return {
        ...scriptResult,
        steps: [...worldSteps, ...scriptResult.steps],
    };
}