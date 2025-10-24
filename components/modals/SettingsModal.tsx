import React, { useState, useRef, useEffect } from 'react';
import { produce } from 'immer';

type LayoutOption = 'default' | 'code-focused' | 'preview-focused';

interface Settings {
    pythonEngine: 'pyodide' | 'pyscript';
    layout: LayoutOption;
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
}

const KeybindingInput: React.FC<{ label: string, value: string, onChange: (value: string) => void }> = ({ label, value, onChange }) => {
    const [isListening, setIsListening] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (isListening) {
            buttonRef.current?.focus();
        }
    }, [isListening]);
    
    const handleKeyDown = (e: React.KeyboardEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const key = e.key;
        
        if (['Control', 'Alt', 'Shift', 'Meta'].includes(key)) {
            return;
        }

        const parts: string[] = [];
        if (e.ctrlKey) parts.push('Control');
        if (e.altKey) parts.push('Alt');
        if (e.shiftKey) parts.push('Shift');
        if (e.metaKey) parts.push('Meta');

        parts.push(key);
        
        onChange(parts.join('+'));
        setIsListening(false);
    };

    const handleClick = () => {
        setIsListening(true);
    };

    const handleBlur = () => {
        setIsListening(false);
    };

    return (
        <div className="flex items-center justify-between">
            <label className="text-gray-300">{label}</label>
            <button
                ref={buttonRef}
                type="button"
                onClick={handleClick}
                onKeyDown={isListening ? handleKeyDown : undefined}
                onBlur={handleBlur}
                className="w-48 bg-[#1e2026] border border-[#3a3d46] rounded-md px-2 py-1 text-white text-center font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
                {isListening ? 'Press keys...' : value}
            </button>
        </div>
    );
};

const RadioOption: React.FC<{ label: string, description: string, value: string, checked: boolean, onChange: () => void }> = ({ label, description, value, checked, onChange }) => (
  <label className={`flex items-center p-3 rounded-md border-2 cursor-pointer ${checked ? 'border-teal-500 bg-teal-900/50' : 'border-[#3a3d46] bg-[#1e2026] hover:border-gray-500'}`}>
    <input type="radio" name="pythonEngine" value={value} checked={checked} onChange={onChange} className="h-4 w-4 accent-teal-500 bg-gray-800 border-gray-600" />
    <div className="ml-3">
      <p className="text-sm font-semibold text-white">{label}</p>
      <p className="text-xs text-gray-400">{description}</p>
    </div>
  </label>
);


const SettingsModal: React.FC<SettingsModalProps> = ({ onClose, settings, setSettings }) => {
    const [activeTab, setActiveTab] = useState('keybindings');
    
    const handleKeybindingChange = (key: keyof Settings['keybindings'], value: string) => {
        setSettings(produce(draft => {
            draft.keybindings[key] = value;
        }));
    };

    return (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-[#272a33] rounded-lg shadow-lg p-6 w-full max-w-lg text-gray-300 border border-[#3a3d46]" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold text-white mb-4">Settings</h2>
                
                <div className="flex border-b border-[#3a3d46] text-sm font-semibold">
                    <button 
                        onClick={() => setActiveTab('keybindings')}
                        className={`px-4 py-2 transition-colors ${activeTab === 'keybindings' ? 'text-white border-b-2 border-teal-500' : 'text-gray-400 hover:text-white'}`}
                    >
                        Keybindings
                    </button>
                    <button
                        onClick={() => setActiveTab('runtimes')}
                        className={`px-4 py-2 transition-colors ${activeTab === 'runtimes' ? 'text-white border-b-2 border-teal-500' : 'text-gray-400 hover:text-white'}`}
                    >
                        Runtimes
                    </button>
                    <button
                        onClick={() => setActiveTab('layout')}
                        className={`px-4 py-2 transition-colors ${activeTab === 'layout' ? 'text-white border-b-2 border-teal-500' : 'text-gray-400 hover:text-white'}`}
                    >
                        Layout
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
                                Click a field and press your desired key combination.
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
                                    onChange={() => setSettings(produce(draft => { draft.layout = 'default'; }))}
                                />
                                <RadioOption
                                    label="Code Focused"
                                    description="Preview & Info | Code & Output | Explorer"
                                    value="code-focused"
                                    checked={settings.layout === 'code-focused'}
                                    onChange={() => setSettings(produce(draft => { draft.layout = 'code-focused'; }))}
                                />
                                <RadioOption
                                    label="Preview Focused"
                                    description="Code & Output | Preview & Info | Explorer"
                                    value="preview-focused"
                                    checked={settings.layout === 'preview-focused'}
                                    onChange={() => setSettings(produce(draft => { draft.layout = 'preview-focused'; }))}
                                />
                            </div>
                        </div>
                    )}
                </div>

                <button onClick={onClose} className="mt-8 w-full sm:w-auto bg-teal-600 hover:bg-teal-500 text-white font-bold py-2 px-4 rounded-md">
                    Close
                </button>
            </div>
        </div>
    );
};

export default SettingsModal;