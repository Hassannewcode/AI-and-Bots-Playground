import { ExecutionResult, FileSystemTree, ExecutionStep, Prop } from './types';
import { executePythonCode } from './python_engine';
import { executeJavaScriptCode } from './javascript_engine';
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


export async function parseCode(code: string, fileSystem: FileSystemTree, language: string, fileId: string, pythonEngine: 'pyodide' | 'pyscript'): Promise<Omit<ExecutionResult, 'newState'>> {
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
            scriptResult = executeJavaScriptCode(code, fileSystem, fileId);
            break;
        case 'html':
            scriptResult = {
                logs: [`You are viewing world.html. Edit this file to define props. Run a .py or .js file to start the simulation.`],
                problems: [],
                steps: [],
                executedLines: 0,
            };
            break;
        default:
            // For languages like md, txt, etc.
            scriptResult = {
                logs: [`File type '${language}' is not runnable. Only Python (.py) and JavaScript (.js) are supported for execution.`],
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