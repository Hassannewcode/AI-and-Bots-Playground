import React, { useRef, useEffect, useState } from 'react';
import type { Problem } from '../../game/types';
import { getSuggestions, getCodeCompletion } from '../../editor/completions';

// Make monaco globally available
declare const monaco: any;
declare const require: any;

// Debounce utility function to limit the rate of API calls
const debounce = (func: (...args: any[]) => void, delay: number) => {
    let timeoutId: number;
    return (...args: any[]) => {
        clearTimeout(timeoutId);
        timeoutId = window.setTimeout(() => func(...args), delay);
    };
};

interface Settings {
    keybindings: {
        acceptSuggestion: string;
        acceptAiCompletion: string;
        cycleAiCompletionDown: string;
        cycleAiCompletionUp: string;
    }
}

interface CodeEditorProps {
  code: string;
  onCodeChange: (code: string) => void;
  language: string;
  problems: Problem[];
  settings: Settings;
  onCursorChange: (position: { line: number, column: number }) => void;
  onOpenPalette: () => void;
}

const mapLanguageToMonaco = (lang: string): string => {
    switch (lang) {
        case 'py': return 'python';
        case 'js': return 'javascript';
        case 'jsx': return 'javascript';
        case 'ts': return 'typescript';
        case 'tsx': return 'typescript';
        case 'md': return 'markdown';
        case 'html': return 'html';
        case 'css': return 'css';
        case 'sh': return 'shell';
        case 'c': return 'c';
        case 'cpp': return 'cpp';
        case 'cs': return 'csharp';
        case 'clj': return 'clojure';
        case 'dart': return 'dart';
        case 'fs': return 'fsharp';
        case 'go': return 'go';
        case 'groovy': return 'groovy';
        case 'hs': return 'haskell';
        case 'java': return 'java';
        case 'kt': return 'kotlin';
        case 'lua': return 'lua';
        case 'm': return 'objective-c';
        case 'ml': return 'ocaml';
        case 'pl': return 'perl';
        case 'php': return 'php';
        case 'rb': return 'ruby';
        case 'rs': return 'rust';
        case 'scala': return 'scala';
        case 'swift': return 'swift';
        default: return lang;
    }
};

const mapSuggestionTypeToMonacoKind = (type: string) => {
    // This function can only be called after monaco is loaded.
    const kind = monaco.languages.CompletionItemKind;
    switch (type) {
        case 'method': return kind.Method;
        case 'function': return kind.Function;
        case 'class': return kind.Class;
        case 'variable': return kind.Variable;
        case 'param': return kind.Property;
        case 'library': return kind.Module;
        case 'keyword': return kind.Keyword;
        default: return kind.Text;
    }
};

const CodeEditor: React.FC<CodeEditorProps> = ({ code, onCodeChange, language, problems, settings, onCursorChange, onOpenPalette }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const editorRef = useRef<any>(null);
    const completionProviderRef = useRef<any>(null);
    const inlineCompletionProviderRef = useRef<any>(null);
    const [isEditorMounted, setIsEditorMounted] = useState(false);
    const debouncedCompletionFetcher = useRef<((...args: any[]) => void) | null>(null);

    // For line change decorations
    const monacoRef = useRef<any>(null);
    const [initialCode] = useState<string>(code);
    const decorationsRef = useRef<string[]>([]);

    // Helper to check keybindings from settings
    const checkKeybinding = (e: any, binding: string): boolean => {
        if (!binding || !monaco) return false;
        const parts = binding.split('+').map(p => p.trim().toLowerCase());
        const key = parts.pop();
        if (!key) return false;

        const eventKey = monaco.KeyCode[e.keyCode] || e.browserEvent.key;
        if (eventKey.toLowerCase() !== key.toLowerCase()) return false;

        if (parts.includes('control') && !e.ctrlKey) return false;
        if (parts.includes('alt') && !e.altKey) return false;
        if (parts.includes('shift') && !e.shiftKey) return false;
        if (parts.includes('meta') && !e.metaKey) return false;
        
        return true;
    };

    // Effect to initialize the editor instance. Runs only once.
    useEffect(() => {
        // Using a local variable for the created instance to ensure cleanup targets the correct one.
        let editorInstance: any = null;

        const initializeEditor = () => {
            if (!containerRef.current) return; // Guard against unmount during async load
            try {
                monacoRef.current = monaco; // Store monaco object for later use

                editorInstance = monaco.editor.create(containerRef.current, {
                    value: code,
                    language: mapLanguageToMonaco(language),
                    theme: 'vs-dark',
                    automaticLayout: true,
                    fontFamily: 'Roboto Mono, monospace',
                    fontSize: 14,
                    scrollbar: {
                        verticalScrollbarSize: 10,
                        horizontalScrollbarSize: 10,
                    },
                    wordWrap: 'on',
                    'semanticHighlighting.enabled': true,
                    inlineSuggest: {
                        enabled: true,
                        showToolbar: 'onHover',
                        renderLineHighlight: 'gutter',
                    },
                    // Additions for visual feedback and functionality
                    glyphMargin: true,
                    cursorBlinking: 'smooth',
                    cursorSmoothCaretAnimation: 'on',
                    // Explicit cursor styling for better precision
                    cursorStyle: 'line',
                    cursorWidth: 2,
                    minimap: { enabled: true },
                    folding: true,
                    'bracketPairColorization.enabled': true,
                    // Improves cursor accuracy with certain fonts/displays at a small performance cost.
                    'disableMonospaceOptimizations': true, 
                });

                editorInstance.onDidChangeModelContent(() => {
                    const currentValue = editorInstance.getValue();
                    onCodeChange(currentValue);
                });
                
                editorInstance.onDidChangeCursorPosition((e: any) => {
                    onCursorChange({ line: e.position.lineNumber, column: e.position.column });
                });

                editorInstance.onKeyDown((e: any) => {
                    if(checkKeybinding(e, settings.keybindings.acceptAiCompletion)) {
                        e.preventDefault();
                        e.stopPropagation();
                        editorInstance.trigger('keyboard', 'editor.action.inlineSuggest.commit', null);
                    } else if (checkKeybinding(e, settings.keybindings.cycleAiCompletionDown)) {
                        e.preventDefault();
                        e.stopPropagation();
                        editorInstance.trigger('keyboard', 'editor.action.inlineSuggest.showNext', null);
                    } else if (checkKeybinding(e, settings.keybindings.cycleAiCompletionUp)) {
                        e.preventDefault();
                        e.stopPropagation();
                        editorInstance.trigger('keyboard', 'editor.action.inlineSuggest.showPrevious', null);
                    }
                });

                editorInstance.addAction({
                    id: 'open-command-palette',
                    label: 'Open Command Palette',
                    keybindings: [monaco.KeyCode.F1],
                    run: () => {
                        onOpenPalette();
                    }
                });

                editorRef.current = editorInstance;
                setIsEditorMounted(true);
            } catch (error) {
                console.error("Failed to initialize Monaco Editor:", error);
                if (containerRef.current) {
                    containerRef.current.innerHTML = `
                        <div style="color: #ff8a8a; background-color: #1e2026; height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 1rem; font-family: sans-serif; border: 1px solid #3a3d46; border-radius: 8px;">
                            <h3 style="font-size: 1.25rem; margin-bottom: 0.5rem; color: #f87171;">Editor Failed to Load</h3>
                            <p style="text-align: center; font-size: 0.875rem; color: #d1d5db;">There was an issue initializing the code editor. This can happen due to network issues or browser extension conflicts.</p>
                            <p style="text-align: center; font-size: 0.875rem; color: #d1d5db; margin-top: 0.5rem;">Please try reloading the page. If the issue persists, check the developer console for details.</p>
                        </div>
                    `;
                }
            }
        };
        
        if (containerRef.current && !editorRef.current) {
            // If monaco is not on the window, use require to load it.
            // This prevents re-running require() on React StrictMode re-mounts.
            if (!(window as any).monaco) {
                require(['vs/editor/editor.main'], initializeEditor);
            } else {
                // Monaco is already loaded, just create the editor instance.
                initializeEditor();
            }
        }

        return () => {
            if (editorInstance) {
                editorInstance.dispose();
                editorRef.current = null;
            }
            // Providers are registered globally, so they should be cleaned up
            // when the component unmounts to avoid memory leaks.
            if (completionProviderRef.current) {
                completionProviderRef.current.dispose();
                completionProviderRef.current = null;
            }
            if (inlineCompletionProviderRef.current) {
                inlineCompletionProviderRef.current.dispose();
                inlineCompletionProviderRef.current = null;
            }
            setIsEditorMounted(false); // Reset mounted state
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Effect to update editor content when 'code' prop changes from outside
    useEffect(() => {
        // Prevent feedback loop by checking if the content is already the same
        if (isEditorMounted && editorRef.current.getValue() !== code) {
            editorRef.current.setValue(code);
        }
    }, [code, isEditorMounted]);

    // Effect to handle language changes (including setting providers)
    useEffect(() => {
        if (!isEditorMounted) return;

        const editor = editorRef.current;
        const monacoLang = mapLanguageToMonaco(language);

        // Update language
        monaco.editor.setModelLanguage(editor.getModel(), monacoLang);

        // Dispose old providers
        if (completionProviderRef.current) completionProviderRef.current.dispose();
        if (inlineCompletionProviderRef.current) inlineCompletionProviderRef.current.dispose();
        
        // Create the debounced function whenever the language changes.
        debouncedCompletionFetcher.current = debounce(async (model, position, token, resolve) => {
            if (token.isCancellationRequested) {
                resolve({ items: [] });
                return;
            }
    
            try {
                const suggestions = await getCodeCompletion(model.getValue(), model.getOffsetAt(position), language);
                if (!token.isCancellationRequested) {
                    resolve({
                        items: suggestions.map((s: string) => ({ insertText: s }))
                    });
                } else {
                    resolve({ items: [] });
                }
            } catch (error) {
                // The error is already logged in getCodeCompletion.
                // Resolve with empty to avoid breaking the UI on API errors.
                resolve({ items: [] }); 
            }
        }, 300); // 300ms delay


        // Register new providers
        completionProviderRef.current = monaco.languages.registerCompletionItemProvider(monacoLang, {
            provideCompletionItems: (model: any, position: any) => {
                const fullCode = model.getValue();
                const line = model.getLineContent(position.lineNumber);

                const suggestions = getSuggestions(line, position.column - 1, fullCode, language);
                const monacoSuggestions = suggestions.map((s: any) => ({
                    label: s.label,
                    kind: mapSuggestionTypeToMonacoKind(s.type),
                    insertText: s.label,
                    detail: s.detail,
                    range: new monaco.Range(position.lineNumber, position.column - (s.label.length), position.lineNumber, position.column)
                }));
                return { suggestions: monacoSuggestions };
            }
        });

        inlineCompletionProviderRef.current = monaco.languages.registerInlineCompletionsProvider(monacoLang, {
            provideInlineCompletions: (model: any, position: any, context: any, token: any) => {
                // Return a promise that will be resolved by the debounced fetcher
                return new Promise(resolve => {
                    if (debouncedCompletionFetcher.current) {
                        debouncedCompletionFetcher.current(model, position, token, resolve);
                    } else {
                        resolve({ items: [] });
                    }
                });
            },
            freeInlineCompletions: () => {}
        });

    }, [language, settings, isEditorMounted]); // Depends on language and settings

    // Effect to update problem markers
    useEffect(() => {
        if (!isEditorMounted) return;

        const model = editorRef.current.getModel();
        const markers = problems.map(p => ({
            startLineNumber: p.line,
            endLineNumber: p.line,
            startColumn: 1,
            endColumn: model.getLineMaxColumn(p.line),
            message: p.message,
            severity: monaco.MarkerSeverity.Error,
        }));
        monaco.editor.setModelMarkers(model, 'owner', markers);

    }, [problems, isEditorMounted]);

    // Debounced function to update line decorations
    const debouncedUpdateDecorations = useRef(debounce((currentCode: string, initial: string, editor: any, monaco: any) => {
        if (!editor || !monaco) return;

        const initialLines = initial.split('\n');
        const currentLines = currentCode.split('\n');
        const changedLineNumbers: number[] = [];
        const len = Math.max(initialLines.length, currentLines.length);

        for (let i = 0; i < len; i++) {
            // A line is considered changed if it's different, new, or was deleted (which makes subsequent lines different)
            if (currentLines[i] !== initialLines[i]) {
                changedLineNumbers.push(i + 1); // Monaco lines are 1-based
            }
        }

        const newDecorations = changedLineNumbers.map(lineNumber => ({
            range: new monaco.Range(lineNumber, 1, lineNumber, 1),
            options: {
                isWholeLine: true,
                className: 'edited-line-highlight',
                glyphMarginClassName: 'edited-line-glyph'
            }
        }));
        
        decorationsRef.current = editor.deltaDecorations(decorationsRef.current, newDecorations);
    }, 300)).current;

    // Effect to track code changes and apply decorations
    useEffect(() => {
        if (isEditorMounted && editorRef.current && monacoRef.current) {
            debouncedUpdateDecorations(code, initialCode, editorRef.current, monacoRef.current);
        }
    }, [code, isEditorMounted, initialCode, debouncedUpdateDecorations]);

    return <div ref={containerRef} className="h-full w-full" />;
};

export default CodeEditor;