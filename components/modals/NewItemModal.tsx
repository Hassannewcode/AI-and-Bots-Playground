
import React, { useState, useEffect, useRef } from 'react';
import type { FileSystemTree, FileSystemNode } from '../../game/types';

interface NewItemModalProps {
    type: 'file' | 'folder';
    parentId: string;
    fileSystem: FileSystemTree;
    onClose: () => void;
    onCreate: (name: string, parentId: string, type: 'file' | 'folder') => void;
}

const NewItemModal: React.FC<NewItemModalProps> = ({ type, parentId, fileSystem, onClose, onCreate }) => {
    const [name, setName] = useState('');
    const [extension, setExtension] = useState('.py');
    const [error, setError] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const validateName = (currentName: string, currentExt: string) => {
        if (!currentName) {
            setError('Name cannot be empty.');
            return false;
        }
        if (/[<>:"/\\|?*]/.test(currentName)) {
            setError('Name contains invalid characters.');
            return false;
        }
        
        const parent = fileSystem[parentId] as Extract<FileSystemNode, {type: 'folder'}>;
        const fullName = type === 'file' ? `${currentName}${currentExt}` : currentName;
        if (parent.children.some(id => fileSystem[id].name.toLowerCase() === fullName.toLowerCase())) {
            setError(`An item named "${fullName}" already exists in this folder.`);
            return false;
        }

        setError('');
        return true;
    };
    
    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newName = e.target.value;
        setName(newName);
        validateName(newName, extension);
    };

    const handleExtensionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newExt = e.target.value;
        setExtension(newExt);
        validateName(name, newExt);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validateName(name, extension)) {
            const fullName = type === 'file' ? `${name}${extension}` : name;
            onCreate(fullName, parentId, type);
        }
    };
    
    const title = type === 'file' ? 'Create New File' : 'Create New Folder';

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-[#272a33] rounded-lg shadow-lg p-6 w-full max-w-md text-gray-300 border border-[#3a3d46]" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold text-white mb-4">{title}</h2>
                <form onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        {type === 'file' ? (
                             <div className="flex items-center space-x-2">
                                <input 
                                    ref={inputRef}
                                    type="text"
                                    value={name}
                                    onChange={handleNameChange}
                                    placeholder="Enter filename"
                                    className="flex-grow bg-[#1e2026] border border-[#3a3d46] rounded-md px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                                />
                                <select
                                    value={extension}
                                    onChange={handleExtensionChange}
                                    className="bg-[#1e2026] border border-[#3a3d46] rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                                >
                                    <option value=".py">.py</option>
                                    <option value=".js">.js</option>
                                    <option value=".ts">.ts</option>
                                    <option value=".html">.html</option>
                                    <option value=".cpp">.cpp</option>
                                    <option value=".cs">.cs</option>
                                    <option value=".java">.java</option>
                                    <option value=".go">.go</option>
                                    <option value=".rs">.rs</option>
                                    <option value=".md">.md</option>
                                    <option value=".txt">.txt</option>
                                </select>
                            </div>
                        ) : (
                            <input 
                                ref={inputRef}
                                type="text"
                                value={name}
                                onChange={handleNameChange}
                                placeholder="Enter folder name"
                                className="w-full bg-[#1e2026] border border-[#3a3d46] rounded-md px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                            />
                        )}
                       {error && <p className="text-red-400 text-sm">{error}</p>}
                    </div>

                    <div className="mt-6 flex justify-end space-x-3">
                        <button type="button" onClick={onClose} className="bg-[#3a3d46] hover:bg-[#4a4d56] text-gray-300 font-bold py-2 px-4 rounded-md transition-colors">
                            Cancel
                        </button>
                        <button type="submit" disabled={!name || !!error} className="bg-teal-600 hover:bg-teal-500 text-white font-bold py-2 px-4 rounded-md transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed">
                            Create
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default NewItemModal;
