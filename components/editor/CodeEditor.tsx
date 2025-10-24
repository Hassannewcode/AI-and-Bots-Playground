import React, { useRef, useEffect, useCallback } from 'react';
import type { Problem } from '../../game/types';
import { getSuggestions, getCodeCompletion } from '../../editor/completions';

// Make monaco globally available
declare const monaco: any;

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
    
    const onCodeChangeRef = useRef(onCodeChange);
    onCodeChangeRef.current = onCodeChange;

    const codeRef = useRef(code);
    codeRef.current = code;

    // Helper to check keybindings from settings
    const checkKeybinding = (e: any, binding: string): boolean => {
        if (!binding) return false;
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

    // Initialize editor
    useEffect(() => {
        if (containerRef.current && typeof monaco !== 'undefined' && !editorRef.current) {
            const editor = monaco.editor.create(containerRef.current, {
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

            editor.onDidChangeModelContent(() => {
                const currentValue = editor.getValue();
                if (currentValue !== codeRef.current) {
                    onCodeChangeRef.current(currentValue);
                }
            });
            
            // Custom Keybindings
            editor.onKeyDown((e: any) => {
                if(checkKeybinding(e, settings.keybindings.acceptAiCompletion)) {
                    e.preventDefault();
                    e.stopPropagation();
                    editor.trigger('keyboard', 'editor.action.inlineSuggest.commit', null);
                }
                // Cycling through AI suggestions is now handled by Monaco's default inline suggestion widget
            });


            editorRef.current = editor;
        }

        return () => {
            if (editorRef.current) {
                editorRef.current.dispose();
                editorRef.current = null;
            }
        };
    }, []);

    // Update code from parent if it differs
    useEffect(() => {
        if (editorRef.current && editorRef.current.getValue() !== code) {
            const model = editorRef.current.getModel();
            editorRef.current.executeEdits('external', [{
                range: model.getFullModelRange(),
                text: code,
            }]);
        }
    }, [code]);

    // Update language and completion providers
    useEffect(() => {
        if (editorRef.current) {
            const monacoLang = mapLanguageToMonaco(language);
            monaco.editor.setModelLanguage(editorRef.current.getModel(), monacoLang);

            // Dispose old providers before registering new ones
            if (completionProviderRef.current) completionProviderRef.current.dispose();
            if (inlineCompletionProviderRef.current) inlineCompletionProviderRef.current.dispose();

            completionProviderRef.current = monaco.languages.registerCompletionItemProvider(monacoLang, {
                provideCompletionItems: (model: any, position: any) => {
                    const codeUntilPosition = model.getValueInRange({
                        startLineNumber: 1,
                        startColumn: 1,
                        endLineNumber: position.lineNumber,
                        endColumn: position.column
                    });
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
                provideInlineCompletions: async (model: any, position: any, context: any, token: any) => {
                    const suggestions = await getCodeCompletion(model.getValue(), model.getOffsetAt(position), language);
                     if (token.isCancellationRequested) {
                        return { items: [] };
                     }
                     return {
                         items: suggestions.map((s: string) => ({ insertText: s }))
                     };
                },
                freeInlineCompletions: () => {}
            });
        }
    }, [language, settings]);

    // Update problem markers
    useEffect(() => {
        if (editorRef.current) {
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
        }
    }, [problems]);

    return <div ref={containerRef} className="h-full w-full" />;
};

export default CodeEditor;