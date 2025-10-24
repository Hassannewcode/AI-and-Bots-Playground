import type { Suggestion, SuggestionType } from '../game/types';
import { GoogleGenAI, Type } from "@google/genai";

const API_DEFINITIONS = {
    libraries: ['ai', 'world', 'physics', 'sound'],
    ai: {
        'Sprite': { type: 'class', detail: '({ name, shape, x, y })', params: ['name', 'shape', 'x', 'y'] },
        'wait': { type: 'method', detail: '({ seconds })', params: ['seconds'] }
    },
    world: {
        'set_background': { type: 'method', detail: '({ color })', params: ['color'] },
    },
    physics: {
        'set_gravity': { type: 'method', detail: '({ strength })', params: ['strength'] }
    },
    sound: {
        'play': { type: 'method', detail: '({ x, y })', params: ['x', 'y'] }
    },
    sprite: {
        'go_to': { type: 'method', detail: '({ x, y, speed })', params: ['x', 'y', 'speed'] },
        'move_to': { type: 'method', detail: '({ x, y, speed })', params: ['x', 'y', 'speed'] },
        'rotate_to': { type: 'method', detail: '({ angle, speed })', params: ['angle', 'speed'] },
        'look_at': { type: 'method', detail: '({ x, y, speed })', params: ['x', 'y', 'speed'] },
        'say': { type: 'method', detail: '({ message, duration })', params: ['message', 'duration'] },
        'chat': { type: 'method', detail: '({ message })', params: ['message'] },
        'set_style': { type: 'method', detail: '({ property, value, speed })', params: ['property', 'value', 'speed'] },
        'create_network': { type: 'method', detail: '()', params: [] },
        'reward': { type: 'method', detail: '({ value })', params: ['value'] }
    }
};

const PYTHON_LIBRARIES: Suggestion[] = [
    'numpy', 'pandas', 'matplotlib', 'requests', 'datetime', 'math', 'random', 'sys', 'os',
    'json', 'collections', 'itertools', 'functools', 're',
    'opencv-python', 'scikit-learn', 'tensorflow', 'torch', // ML/CV
    'nmap', 'scapy', 'pyshark', // Simulated Network/Security
    'designs', 'patterns', // Custom/Creative
].map(lib => ({ label: lib, type: 'library' }));


const PYTHON_KEYWORDS: Suggestion[] = [
    'and', 'as', 'assert', 'break', 'class', 'continue', 'def', 'del', 'elif', 'else',
    'except', 'False', 'finally', 'for', 'from', 'global', 'if', 'import', 'in', 'is',
    'lambda', 'None', 'nonlocal', 'not', 'or', 'pass', 'raise', 'return', 'True',
    'try', 'while', 'with', 'yield'
].map(k => ({ label: k, type: 'keyword' }));

const JS_KEYWORDS: Suggestion[] = [
    'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class',
    'import', 'export', 'from', 'async', 'await', 'new', 'true', 'false', 'null'
].map(k => ({ label: k, type: 'keyword'}));

const CPP_KEYWORDS: Suggestion[] = [
    'auto', 'bool', 'break', 'case', 'catch', 'char', 'class', 'const', 'continue',
    'default', 'delete', 'do', 'double', 'else', 'enum', 'extern', 'false', 'float',
    'for', 'if', 'int', 'long', 'namespace', 'new', 'nullptr', 'private', 'protected',
    'public', 'return', 'short', 'signed', 'static', 'struct', 'switch', 'template',
    'this', 'throw', 'true', 'try', 'typedef', 'using', 'virtual', 'void', 'while'
].map(k => ({ label: k, type: 'keyword'}));

const JAVA_KEYWORDS: Suggestion[] = [
    'abstract', 'assert', 'boolean', 'break', 'byte', 'case', 'catch', 'char', 'class',
    'continue', 'default', 'do', 'double', 'else', 'enum', 'extends', 'final', 'finally',
    'float', 'for', 'if', 'implements', 'import', 'instanceof', 'int', 'interface',
    'long', 'native', 'new', 'package', 'private', 'protected', 'public', 'return',
    'short', 'static', 'super', 'switch', 'synchronized', 'this', 'throw', 'throws',
    'transient', 'try', 'void', 'volatile', 'while', 'true', 'false', 'null'
].map(k => ({ label: k, type: 'keyword'}));

const CSHARP_KEYWORDS: Suggestion[] = [
    'abstract', 'as', 'base', 'bool', 'break', 'byte', 'case', 'catch', 'char', 'class',
    'const', 'continue', 'decimal', 'default', 'delegate', 'do', 'double', 'else', 'enum',
    'event', 'extern', 'false', 'finally', 'float', 'for', 'foreach', 'if', 'in', 'int',
    'interface', 'internal', 'is', 'lock', 'long', 'namespace', 'new', 'null', 'object',
    'operator', 'out', 'override', 'params', 'private', 'protected', 'public', 'readonly',
    'ref', 'return', 'sbyte', 'sealed', 'short', 'static', 'string', 'struct', 'switch',
    'this', 'throw', 'true', 'try', 'typeof', 'uint', 'ulong', 'using', 'virtual',
    'void', 'while'
].map(k => ({ label: k, type: 'keyword'}));


const PYTHON_BUILTINS: Suggestion[] = [
    'abs', 'all', 'any', 'ascii', 'bin', 'bool', 'bytearray', 'bytes', 'callable',
    'chr', 'classmethod', 'compile', 'complex', 'delattr', 'dict', 'dir', 'divmod',
    'enumerate', 'eval', 'exec', 'filter', 'float', 'format', 'frozenset', 'getattr',
    'globals', 'hasattr', 'hash', 'help', 'hex', 'id', 'input', 'int', 'isinstance',
    'issubclass', 'iter', 'len', 'list', 'locals', 'map', 'max', 'memoryview', 'min',
    'next', 'object', 'oct', 'open', 'ord', 'pow', 'print', 'property', 'range',
    'repr', 'reversed', 'round', 'set', 'setattr', 'slice', 'sorted', 'staticmethod',
    'str', 'sum', 'super', 'tuple', 'type', 'vars', 'zip'
].map(b => ({ label: b, type: 'function', detail: '()' }));

const JS_BUILTINS: Suggestion[] = [
    'console', 'Math', 'JSON', 'Object', 'Array', 'String', 'Number', 'Boolean', 'Date',
    'Promise', 'Map', 'Set', 'Symbol'
].map(b => ({ label: b, type: 'class' }));

const getSpriteVariables = (code: string, language: string): string[] => {
    const variables = new Set<string>();
    const regex = language === 'py' 
        ? /(\w+)\s*=\s*ai\.Sprite/g
        : /(?:const|let|var)\s+(\w+)\s*=\s*ai\.Sprite/g;
        
    let match;
    while ((match = regex.exec(code)) !== null) {
        variables.add(match[1]);
    }
    return Array.from(variables);
};

export const getSuggestions = (line: string, cursorPosition: number, fullCode: string, language: string): Suggestion[] => {
    const textBeforeCursor = line.substring(0, cursorPosition);

    // Case 0: Python import suggestions
    if (language === 'py') {
        const importMatch = textBeforeCursor.match(/(?:import|from)\s+([\w, ]*)$/);
        if (importMatch) {
            const partial = importMatch[1].split(/[\s,]/).pop() || '';
            return PYTHON_LIBRARIES.filter(lib => lib.label.toLowerCase().startsWith(partial.toLowerCase()));
        }
    }


    // Case 1: Suggesting library methods (e.g., "ai.")
    const libMethodMatch = textBeforeCursor.match(/(\w+)\.$/);
    if (libMethodMatch) {
        const libName = libMethodMatch[1].toLowerCase();
        if (libName in API_DEFINITIONS) {
            return Object.entries((API_DEFINITIONS as any)[libName]).map(([key, value]: [string, any]) => ({
                label: key,
                type: value.type as SuggestionType,
                detail: value.detail,
            }));
        }
    }

    // Case 2: Suggesting sprite methods (e.g., "my_bot.")
    const spriteVariables = getSpriteVariables(fullCode, language);
    const spriteMethodMatch = textBeforeCursor.match(`(${spriteVariables.join('|')})\\.$`);
     if (spriteMethodMatch && spriteVariables.length > 0) {
        return Object.entries(API_DEFINITIONS.sprite).map(([key, value]) => ({
            label: key,
            type: value.type as SuggestionType,
            detail: value.detail,
        }));
    }

    // Case 3: Suggesting parameters inside a function call
    const paramMatch = textBeforeCursor.match(/(\w+)[.:](\w+)\(([^)]*)$/);
    if (paramMatch) {
        const [, libOrVar, methodName, argsSoFar] = paramMatch;
        
        const existingArgs = (argsSoFar.match(/(\w+)\s*[:=]/g) || []).map(arg => arg.replace(/[:=]/, '').trim());
        
        let methodDef: any = null;

        if (libOrVar.toLowerCase() in API_DEFINITIONS) {
            methodDef = (API_DEFINITIONS as any)[libOrVar.toLowerCase()][methodName];
        } else if (spriteVariables.includes(libOrVar)) {
            methodDef = API_DEFINITIONS.sprite[methodName as keyof typeof API_DEFINITIONS.sprite];
        }

        if (methodDef && methodDef.params) {
            return methodDef.params
                .filter((p: string) => !existingArgs.includes(p))
                .map((p: string) => ({ label: p, type: 'param' }));
        }
    }

    // Case 4: Suggesting libraries, variables, keywords, or built-ins
    const wordMatch = textBeforeCursor.match(/\b(\w*)$/);
    if (wordMatch) {
        const partialWord = wordMatch[1].toLowerCase();
        const suggestions: Suggestion[] = [];
        const lineContainsImport = line.trim().startsWith('import') || line.trim().startsWith('from');

        let keywords: Suggestion[] = [];
        let builtins: Suggestion[] = [];
        
        switch (language) {
            case 'py':
                keywords = PYTHON_KEYWORDS;
                builtins = PYTHON_BUILTINS;
                break;
            case 'js':
            case 'jsx':
            case 'ts':
            case 'tsx':
                keywords = JS_KEYWORDS;
                builtins = JS_BUILTINS;
                break;
            case 'cpp':
            case 'c':
                keywords = CPP_KEYWORDS;
                break;
            case 'java':
                keywords = JAVA_KEYWORDS;
                break;
            case 'cs':
                keywords = CSHARP_KEYWORDS;
                break;
        }
        
        // Suggest global engine objects for JS and Python
        API_DEFINITIONS.libraries.forEach(lib => {
             if (lib.startsWith(partialWord)) {
                suggestions.push({ label: lib, type: 'library' });
            }
        });


        // Sprite variables
        spriteVariables.forEach(v => {
            if (v.toLowerCase().startsWith(partialWord)) {
                suggestions.push({ label: v, type: 'variable' });
            }
        });

        // Language Keywords
        keywords.forEach(k => {
            if (k.label.toLowerCase().startsWith(partialWord)) {
                suggestions.push(k);
            }
        });

        // Language Built-ins (don't suggest if we are on an import line)
        if (!lineContainsImport) {
            builtins.forEach(b => {
                if (b.label.toLowerCase().startsWith(partialWord)) {
                    suggestions.push(b);
                }
            });
        }
        
        const uniqueSuggestions = suggestions.filter((v,i,a)=>a.findIndex(t=>(t.label === v.label))===i)
        uniqueSuggestions.sort((a, b) => {
            const order: Record<string, number> = { 'variable': 0, 'keyword': 1, 'function': 2, 'library': 3, 'class': 4, 'method': 5 };
            return (order[a.type] || 99) - (order[b.type] || 99) || a.label.localeCompare(b.label);
        });

        return uniqueSuggestions;
    }

    return [];
};

export const getCodeCompletion = async (
    fullCode: string,
    cursorPosition: number,
    language: string
): Promise<string[]> => {
    if (!process.env.API_KEY) {
        console.warn("API_KEY is not configured for code completion.");
        return [];
    }

    const codeWithCursor = `${fullCode.substring(0, cursorPosition)}<CURSOR>${fullCode.substring(cursorPosition)}`;
    const langName = language === 'py' ? 'Python' : 'JavaScript';

    const prompt = `You are an expert code completion AI, acting as a direct assistant within an IDE. Your task is to predict and generate the next logical block of code based on the user's current file content and cursor position.

Follow these rules strictly:
1.  Analyze the entire code to understand context, variables, and user intent. The user's cursor is marked with "<CURSOR>".
2.  Provide up to 5 diverse and useful code suggestions.
3.  Suggestions can be single-line or multi-line.
4.  Return ONLY a valid JSON array of strings. Example: ["suggestion1_code_string", "suggestion2_code_string"]
5.  Do NOT include the user's existing code in your suggestions. Only provide the new code to be inserted at the <CURSOR> position.
6.  If the user is in the middle of a line, complete that line. If they are at the end of a line, suggest the next complete line or block of code.
7.  Do not add any explanations, markdown, or anything outside of the JSON array.

LANGUAGE: ${langName}

USER'S CODE:
---
${codeWithCursor}
---
`;

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.STRING,
                    },
                },
                temperature: 0.4,
                topP: 0.95,
                maxOutputTokens: 1024,
            }
        });

        const text = response.text;
        if (!text) {
            console.warn("Gemini API returned no text for code completion. The response might have been blocked.");
            return [];
        }

        const jsonStr = text.trim();
        const suggestions = JSON.parse(jsonStr);
        
        if (Array.isArray(suggestions) && suggestions.every(s => typeof s === 'string')) {
            return suggestions;
        }
        return [];

    } catch (error) {
        console.error("Error getting code completion from Gemini API:", error);
        return [];
    }
};
