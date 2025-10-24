
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
}

const mapLanguageToMonaco = (lang: string): string => {
    switch (lang) {
        case 'py': return 'python';
        case 'js': return 'javascript';
        case 'ts': return 'typescript';
        case 'md': return 'markdown';
        case 'cs': return 'csharp';
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

const CodeEditor: React.FC<CodeEditorProps> = ({ code, onCodeChange, language, problems, settings }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const editorRef = useRef<any>(null);
    const completionProviderRef = useRef<any>(null);
    const inlineCompletionProviderRef = useRef<any>(null);
    const [isEditorMounted, setIsEditorMounted] = useState(false);
    const debouncedCompletionFetcher = useRef<((...args: any[]) => void) | null>(null);

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

            editorInstance = monaco.editor.create(containerRef.current, {
                value: code,
                language: mapLanguageToMonaco(language),
                theme: 'vs-dark',
                automaticLayout: true,
                fontFamily: 'Roboto Mono, monospace',
                fontSize: 14,
                minimap: { enabled: false },
                scrollbar: {
                    verticalScrollbarSize: 10,
                    horizontalScrollbarSize: 10,
                },
                wordWrap: 'on',
                'semanticHighlighting.enabled': true,
                inlineSuggest: {
                    enabled: true,
                }
            });

            editorInstance.onDidChangeModelContent(() => {
                const currentValue = editorInstance.getValue();
                onCodeChange(currentValue);
            });

            editorInstance.onKeyDown((e: any) => {
                if(checkKeybinding(e, settings.keybindings.acceptAiCompletion)) {
                    e.preventDefault();
                    e.stopPropagation();
                    editorInstance.trigger('keyboard', 'editor.action.inlineSuggest.commit', null);
                }
            });

            editorRef.current = editorInstance;
            setIsEditorMounted(true);
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
        }, 500); // 500ms delay


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

    return <div ref={containerRef} className="h-full w-full" />;
};

export default CodeEditor;
