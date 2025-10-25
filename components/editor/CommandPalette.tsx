import React, { useState, useEffect, useRef } from 'react';
import type { EditorCommand } from '../../game/types';
import { XMarkIcon } from '../icons';

interface CommandPaletteProps {
    isOpen: boolean;
    onClose: () => void;
    commands: EditorCommand[];
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, commands }) => {
    const [search, setSearch] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLUListElement>(null);

    const filteredCommands = commands.filter(cmd => 
        cmd.label.toLowerCase().includes(search.toLowerCase())
    );

    useEffect(() => {
        if (isOpen) {
            // Reset state when opening
            setSearch('');
            setSelectedIndex(0);
            // Focus input with a small delay
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;

            if (e.key === 'Escape') {
                onClose();
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => (prev + 1) % (filteredCommands.length || 1));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => (prev - 1 + (filteredCommands.length || 1)) % (filteredCommands.length || 1));
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (filteredCommands[selectedIndex]) {
                    filteredCommands[selectedIndex].action();
                    onClose();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose, selectedIndex, filteredCommands]);
    
    // Scroll selected item into view
    useEffect(() => {
        if (listRef.current) {
            const selectedItem = listRef.current.children[selectedIndex] as HTMLLIElement;
            if (selectedItem) {
                selectedItem.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [selectedIndex]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex justify-center z-50 pt-[15vh]" onClick={onClose}>
            <div 
                className="w-full max-w-lg bg-[#272a33] rounded-lg shadow-2xl border border-[#3a3d46] flex flex-col overflow-hidden animate-fade-in" 
                onClick={e => e.stopPropagation()}
            >
                <div className="p-2 border-b border-[#3a3d46]">
                    <input
                        ref={inputRef}
                        type="text"
                        value={search}
                        onChange={e => {
                            setSearch(e.target.value);
                            setSelectedIndex(0);
                        }}
                        placeholder="Type a command"
                        className="w-full bg-[#1e2026] text-white placeholder-gray-500 px-3 py-2 text-sm focus:outline-none rounded-md"
                    />
                </div>
                <ul ref={listRef} className="flex-grow overflow-y-auto max-h-[40vh] p-1">
                    {filteredCommands.length > 0 ? (
                        filteredCommands.map((cmd, index) => (
                            <li
                                key={cmd.id}
                                onClick={() => { cmd.action(); onClose(); }}
                                className={`px-3 py-2 text-sm rounded-md cursor-pointer flex justify-between items-center ${selectedIndex === index ? 'bg-sky-700 text-white' : 'text-gray-300 hover:bg-[#3a3d46]'}`}
                            >
                                <span>{cmd.label}</span>
                                {cmd.keybinding && <span className="text-xs text-gray-500 bg-[#1e2026] px-1.5 py-0.5 rounded-sm">{cmd.keybinding}</span>}
                            </li>
                        ))
                    ) : (
                        <li className="px-3 py-2 text-sm text-gray-500">No commands found.</li>
                    )}
                </ul>
            </div>
        </div>
    );
};