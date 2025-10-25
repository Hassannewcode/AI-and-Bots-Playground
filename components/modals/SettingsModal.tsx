


import React, { useState, useRef, useEffect } from 'react';
import { produce } from 'immer';
import type { PanelComponentKey, PanelLayout } from '../../game/types';

type LayoutOption = 'default' | 'code-focused' | 'preview-focused' | 'custom';

interface Settings {
    pythonEngine: 'pyodide' | 'pyscript';
    layout: LayoutOption;
    customLayout: PanelLayout;
    keybindings: {
        acceptSuggestion: string;
        acceptAiCompletion: string;
        cycleAiCompletionDown: string;
        cycleAiCompletionUp: string;
    }
}

interface SettingsModalProps {
    onClose: () => void;
    settings: Settings;
    setSettings: React.Dispatch<React.SetStateAction<Settings>>;
    onCustomizeLayout: () => void;
}

const defaultLayout: PanelLayout = {
  left: ['FileTreePanel'],
  middle: ['EditorPanel', 'TabbedOutputPanel'],
  right: ['PrimaryDisplayPanel', 'InfoCardListPanel', 'UserDetailsPanel', 'ActionButtonsPanel']
};

const codeFocusedLayout: PanelLayout = {
  left: ['PrimaryDisplayPanel', 'InfoCardListPanel', 'UserDetailsPanel', 'ActionButtonsPanel'],
  middle: ['EditorPanel', 'TabbedOutputPanel'],
  right: ['FileTreePanel']
};

const previewFocusedLayout: PanelLayout = {
  left: ['EditorPanel', 'TabbedOutputPanel'],
  middle: ['PrimaryDisplayPanel', 'InfoCardListPanel', 'UserDetailsPanel', 'ActionButtonsPanel'],
  right: ['FileTreePanel']
};

const PREDEFINED_LAYOUTS: Record<'default' | 'code-focused' | 'preview-focused', PanelLayout> = {
    'default': defaultLayout,
    'code-focused': codeFocusedLayout,
    'preview-focused': previewFocusedLayout
};


const KeybindingInput: React.FC<{ label: string, value: string, onChange: (value: string) => void }> = ({ label, value, onChange }) => {
    const [isListening, setIsListening] = useState(false);
    const [keys, setKeys] = useState<Set<string>>(new Set());
    const wrapperRef = useRef<HTMLDivElement>(null);

    const formatKeys = (keys: Set<string>): string => {
        if (keys.size === 0) return 'Press keys...';

        const order = ['ControlLeft', 'ControlRight', 'AltLeft', 'AltRight', 'ShiftLeft', 'ShiftRight', 'MetaLeft', 'MetaRight'];
        
        const sortedKeys = Array.from(keys).sort((a, b) => {
            const aIsModifier = order.includes(a);
            const bIsModifier = order.includes(b);
            if (aIsModifier && bIsModifier) return order.indexOf(a) - order.indexOf(b);
            if (aIsModifier) return -1;
            if (bIsModifier) return 1;
            return a.localeCompare(b);
        });

        const formatted = sortedKeys.map(code => {
            if (code === 'ControlLeft') return 'Left Control';
            if (code === 'ControlRight') return 'Right Control';
            if (code === 'AltLeft') return 'Left Alt';
            if (code === 'AltRight') return 'Right Alt';
            if (code === 'ShiftLeft') return 'Left Shift';
            if (code === 'ShiftRight') return 'Right Shift';
            if (code === 'MetaLeft') return 'Left Meta';
            if (code === 'MetaRight') return 'Right Meta';
            if (code.startsWith('Arrow')) return code.replace('Arrow', '');
            if (code.startsWith('Key')) return code.substring(3);
            if (code.startsWith('Digit')) return code.substring(5);
            if (code.startsWith('Numpad')) return code.replace('Numpad', 'Num ');
            if (code === 'Backquote') return '`';
            if (code === 'Minus') return '-';
            if (code === 'Equal') return '=';
            if (code === 'Semicolon') return ';';
            if (code === 'Quote') return "'";
            if (code === 'Comma') return ',';
            if (code === 'Period') return '.';
            if (code === 'Slash') return '/';
            if (code === 'Backslash') return '\\';
            if (code === 'BracketLeft') return '[';
            if (code === 'BracketRight') return ']';

            return code;
        });

        return formatted.join(' + ');
    };

    useEffect(() => {
        if (!isListening) {
            setKeys(new Set());
            return;
        }

        const handleKeyDown = (e: KeyboardEvent) => {
            e.preventDefault();
            e.stopPropagation();
            setKeys(prev => {
                if (prev.has(e.code)) return prev;
                return new Set(prev).add(e.code);
            });
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            e.preventDefault();
            e.stopPropagation();
            setKeys(prev => {
                const next = new Set(prev);
                next.delete(e.code);
                return next;
            });
        };

        const handleClickOutside = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setIsListening(false);
            }
        };

        document.addEventListener('keydown', handleKeyDown, true);
        document.addEventListener('keyup', handleKeyUp, true);
        document.addEventListener('mousedown', handleClickOutside);
        
        return () => {
            document.removeEventListener('keydown', handleKeyDown, true);
            document.removeEventListener('keyup', handleKeyUp, true);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isListening]);

    const handleSet = () => {
        const finalValue = formatKeys(keys);
        // FIX: Explicitly type `k` as `string` to resolve TypeScript inference issue.
        const hasNonModifier = Array.from(keys).some((k: string) => !k.includes('Control') && !k.includes('Shift') && !k.includes('Alt') && !k.includes('Meta'));

        if (keys.size > 0 && hasNonModifier) {
            onChange(finalValue);
        }
        setIsListening(false);
    };
    
    const handleMainClick = () => {
        if (!isListening) {
            setIsListening(true);
        }
    };

    return (
        <div className="flex items-center justify-between">
            <label className="text-gray-300">{label}</label>
            <div ref={wrapperRef} className="flex items-center space-x-2">
                <button
                    type="button"
                    onClick={handleMainClick}
                    className="w-48 bg-[#1e2026] border border-[#3a3d46] rounded-md px-2 py-1 text-white text-center font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[34px]"
                >
                    {isListening ? (keys.size > 0 ? formatKeys(keys) : 'Press keys...') : value}
                </button>
                {isListening && (
                    <>
                        <button onClick={handleSet} className="px-3 py-1 text-xs font-semibold text-white bg-green-700 hover:bg-green-600 rounded-md transition-colors">Set</button>
                        <button onClick={() => setIsListening(false)} className="px-3 py-1 text-xs font-semibold text-gray-300 bg-gray-600 hover:bg-gray-500 rounded-md transition-colors">Cancel</button>
                    </>
                )}
            </div>
        </div>
    );
};


const RadioOption: React.FC<{ label: string, description: string, value: string, checked: boolean, onChange: () => void }> = ({ label, description, value, checked, onChange }) => (
  <label className={`flex items-center p-3 rounded-md border-2 cursor-pointer ${checked ? 'border-blue-500 bg-blue-900/50' : 'border-[#3a3d46] bg-[#1e2026] hover:border-gray-500'}`}>
    <input type="radio" name="pythonEngine" value={value} checked={checked} onChange={onChange} className="h-4 w-4 accent-blue-500 bg-gray-800 border-gray-600" />
    <div className="ml-3">
      <p className="text-sm font-semibold text-white">{label}</p>
      <p className="text-xs text-gray-400">{description}</p>
    </div>
  </label>
);


const SettingsModal: React.FC<SettingsModalProps> = ({ onClose, settings, setSettings, onCustomizeLayout }) => {
    const [activeTab, setActiveTab] = useState('layout');
    
    const handleKeybindingChange = (key: keyof Settings['keybindings'], value: string) => {
        setSettings(produce(draft => {
            draft.keybindings[key] = value;
        }));
    };

    const handleLayoutChange = (layoutOption: LayoutOption) => {
        setSettings(produce(draft => {
            draft.layout = layoutOption;
            if (layoutOption !== 'custom') {
                draft.customLayout = PREDEFINED_LAYOUTS[layoutOption as 'default' | 'code-focused' | 'preview-focused'];
            }
        }));
    };

    return (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-[#272a33] rounded-lg shadow-lg p-6 w-full max-w-lg text-gray-300 border border-[#3a3d46]" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold text-white mb-4">Settings</h2>
                
                <div className="flex border-b border-[#3a3d46] text-sm font-semibold">
                    <button 
                        onClick={() => setActiveTab('layout')}
                        className={`px-4 py-2 transition-colors ${activeTab === 'layout' ? 'text-white border-b-2 border-blue-500' : 'text-gray-400 hover:text-white'}`}
                    >
                        Layout
                    </button>
                    <button 
                        onClick={() => setActiveTab('keybindings')}
                        className={`px-4 py-2 transition-colors ${activeTab === 'keybindings' ? 'text-white border-b-2 border-blue-500' : 'text-gray-400 hover:text-white'}`}
                    >
                        Keybindings
                    </button>
                    <button
                        onClick={() => setActiveTab('runtimes')}
                        className={`px-4 py-2 transition-colors ${activeTab === 'runtimes' ? 'text-white border-b-2 border-blue-500' : 'text-gray-400 hover:text-white'}`}
                    >
                        Runtimes
                    </button>
                </div>

                <div className="mt-6">
                    {activeTab === 'keybindings' && (
                        <div className="space-y-3 text-sm">
                            <KeybindingInput label="Accept Suggestion" value={settings.keybindings.acceptSuggestion} onChange={(v) => handleKeybindingChange('acceptSuggestion', v)} />
                            <KeybindingInput label="Accept AI Completion" value={settings.keybindings.acceptAiCompletion} onChange={(v) => handleKeybindingChange('acceptAiCompletion', v)} />
                            <KeybindingInput label="Cycle AI Completions Down" value={settings.keybindings.cycleAiCompletionDown} onChange={(v) => handleKeybindingChange('cycleAiCompletionDown', v)} />
                            <KeybindingInput label="Cycle AI Completions Up" value={settings.keybindings.cycleAiCompletionUp} onChange={(v) => handleKeybindingChange('cycleAiCompletionUp', v)} />
                            <p className="text-xs text-gray-500 pt-2">
                                Click a field, press your desired key combination, then click "Set".
                            </p>
                        </div>
                    )}
                    {activeTab === 'runtimes' && (
                         <div>
                            <h3 className="text-md font-bold text-white mb-2">Python Runtime Engine</h3>
                            <p className="text-xs text-gray-400 mb-4">Choose how to execute Python code. Pyodide is faster as it loads the interpreter directly.</p>
                            <div className="space-y-3">
                            <RadioOption
                                label="Pyodide (Recommended)"
                                description="Fast, direct WebAssembly execution."
                                value="pyodide"
                                checked={settings.pythonEngine === 'pyodide'}
                                onChange={() => setSettings(produce(draft => { draft.pythonEngine = 'pyodide'; }))}
                            />
                            <RadioOption
                                label="PyScript"
                                description="Uses the PyScript framework loader."
                                value="pyscript"
                                checked={settings.pythonEngine === 'pyscript'}
                                onChange={() => setSettings(produce(draft => { draft.pythonEngine = 'pyscript'; }))}
                            />
                            </div>
                        </div>
                    )}
                    {activeTab === 'layout' && (
                         <div>
                            <h3 className="text-md font-bold text-white mb-2">IDE Layout</h3>
                            <p className="text-xs text-gray-400 mb-4">Choose how to arrange the main panels in the editor.</p>
                            <div className="space-y-3">
                                <RadioOption
                                    label="Default"
                                    description="Explorer | Code & Output | Preview & Info"
                                    value="default"
                                    checked={settings.layout === 'default'}
                                    onChange={() => handleLayoutChange('default')}
                                />
                                <RadioOption
                                    label="Code Focused"
                                    description="Preview & Info | Code & Output | Explorer"
                                    value="code-focused"
                                    checked={settings.layout === 'code-focused'}
                                    onChange={() => handleLayoutChange('code-focused')}
                                />
                                <RadioOption
                                    label="Preview Focused"
                                    description="Code & Output | Preview & Info | Explorer"
                                    value="preview-focused"
                                    checked={settings.layout === 'preview-focused'}
                                    onChange={() => handleLayoutChange('preview-focused')}
                                />
                                <RadioOption
                                    label="Custom"
                                    description="Drag and drop panels to create your own layout."
                                    value="custom"
                                    checked={settings.layout === 'custom'}
                                    onChange={() => handleLayoutChange('custom')}
                                />
                                {settings.layout === 'custom' && (
                                    <div className="pl-8 mt-2">
                                        <button 
                                            onClick={onCustomizeLayout}
                                            className="text-sm bg-blue-700 hover:bg-blue-600 text-white font-semibold py-1 px-3 rounded-md transition-colors"
                                        >
                                            Customize Layout...
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <button onClick={onClose} className="mt-8 w-full sm:w-auto bg-blue-700 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-md">
                    Close
                </button>
            </div>
        </div>
    );
};

export default SettingsModal;