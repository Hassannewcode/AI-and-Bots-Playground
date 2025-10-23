import React, { useState, useRef, useEffect } from 'react';
import type { FileSystemTree, FileSystemNode } from '../../game/types';
import { produce } from 'immer';
import { nanoid } from 'nanoid';
import { FolderIcon, FileIcon, ChevronRightIcon, ChevronDownIcon } from '../icons';

interface FileTreePanelProps {
    fileSystem: FileSystemTree;
    setFileSystem: React.Dispatch<React.SetStateAction<FileSystemTree>>;
    openTabs: string[];
    setOpenTabs: React.Dispatch<React.SetStateAction<string[]>>;
    setActiveTabId: React.Dispatch<React.SetStateAction<string>>;
    onNewItem: (type: 'file' | 'folder', parentId: string) => void;
}

const ContextMenu = ({ x, y, options, onClose }: { x: number, y: number, options: { label: string, action: () => void }[], onClose: () => void }) => {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    return (
        <div ref={menuRef} style={{ top: y, left: x }} className="absolute z-50 bg-[#1e2026] border border-[#3a3d46] rounded-sm shadow-lg text-white text-xs">
            {options.map(opt => (
                <button key={opt.label} onClick={() => { opt.action(); onClose(); }} className="block w-full text-left px-3 py-1.5 hover:bg-[#2a2d35]">
                    {opt.label}
                </button>
            ))}
        </div>
    );
};

const getFileColor = (fileName: string) => {
    if (fileName.endsWith('.py')) return 'text-green-400';
    if (fileName.endsWith('.js')) return 'text-yellow-400';
    if (fileName.endsWith('.ts')) return 'text-blue-400';
    if (fileName.endsWith('.ai')) return 'text-cyan-400';
    return 'text-gray-400';
};

interface NodeComponentProps {
    nodeId: string;
    fileSystem: FileSystemTree;
    level: number;
    onNodeClick: (node: FileSystemNode) => void;
    onContextMenu: (e: React.MouseEvent, node: FileSystemNode) => void;
    onRename: (nodeId: string, newName: string) => void;
}

const NodeComponent: React.FC<NodeComponentProps> = ({ 
    nodeId, fileSystem, level, onNodeClick, onContextMenu, onRename
}) => {
    const node = fileSystem[nodeId];
    const [isOpen, setIsOpen] = useState(true);
    const [isRenaming, setIsRenaming] = useState(false);
    const [renameValue, setRenameValue] = useState(node.name);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isRenaming) {
            inputRef.current?.focus();
            inputRef.current?.select();
        }
    }, [isRenaming]);

    const handleRenameSubmit = () => {
        if (renameValue.trim() && renameValue !== node.name) {
            onRename(nodeId, renameValue.trim());
        }
        setIsRenaming(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleRenameSubmit();
        if (e.key === 'Escape') {
            setRenameValue(node.name);
            setIsRenaming(false);
        }
    };
    
    if (!node) return null;
    const isFolder = node.type === 'folder';

    return (
        <div>
            <div 
                style={{ paddingLeft: `${level * 1}rem` }}
                className="flex items-center h-7 px-2 hover:bg-[#2a2d35] cursor-pointer"
                onClick={() => { isFolder ? setIsOpen(!isOpen) : onNodeClick(node) }}
                onContextMenu={(e) => onContextMenu(e, node)}
                onDoubleClick={() => { if (node.name !== 'main.ai') setIsRenaming(true); }}
            >
                {isFolder ? (
                    isOpen ? <ChevronDownIcon /> : <ChevronRightIcon />
                ) : (
                    <div className="w-5"></div> // Spacer
                )}
                
                {isFolder ? <FolderIcon className="w-4 h-4 mr-2 text-yellow-500" /> : <FileIcon className={`w-4 h-4 mr-2 ${getFileColor(node.name)}`} />}

                {isRenaming ? (
                    <input 
                        ref={inputRef}
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={handleRenameSubmit}
                        onKeyDown={handleKeyDown}
                        className="bg-transparent text-white border border-cyan-400 outline-none w-full h-5 text-xs px-1"
                    />
                ) : (
                    <span className="text-xs select-none truncate">{node.name}</span>
                )}
            </div>
            {isFolder && isOpen && node.children.map(childId => (
                <NodeComponent 
                    key={childId} 
                    nodeId={childId} 
                    fileSystem={fileSystem} 
                    level={level + 1}
                    onNodeClick={onNodeClick}
                    onContextMenu={onContextMenu}
                    onRename={onRename}
                />
            ))}
        </div>
    );
};

export const FileTreePanel = ({ fileSystem, setFileSystem, openTabs, setOpenTabs, setActiveTabId, onNewItem }: FileTreePanelProps) => {
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, nodeId: string } | null>(null);

    const handleNodeClick = (node: FileSystemNode) => {
        if (node.type === 'file') {
            if (!openTabs.includes(node.id)) {
                setOpenTabs(tabs => [...tabs, node.id]);
            }
            setActiveTabId(node.id);
        }
    };
    
    const handleDelete = (node: FileSystemNode) => {
        setFileSystem(produce(draft => {
            const queue = [node.id];
            while (queue.length > 0) {
                const currentId = queue.shift()!;
                const currentNode = draft[currentId];
                if (currentNode.type === 'folder') {
                    queue.push(...currentNode.children);
                }
                if (currentNode.parentId) {
                    const parent = draft[currentNode.parentId] as Extract<FileSystemNode, {type: 'folder'}>;
                    parent.children = parent.children.filter(id => id !== currentId);
                }
                delete draft[currentId];
            }
        }));
        setOpenTabs(tabs => tabs.filter(t => t !== node.id));
        if (openTabs.includes(node.id)) {
            const newTabs = openTabs.filter(t => t !== node.id);
            setActiveTabId(newTabs[0] || '');
        }
    };
    
    const handleRename = (nodeId: string, newName: string) => {
        setFileSystem(produce(draft => {
            draft[nodeId].name = newName;
        }));
    };

    const handleContextMenu = (e: React.MouseEvent, node: FileSystemNode) => {
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY, nodeId: node.id });
    };

    const contextOptions = () => {
        if (!contextMenu) return [];
        const node = fileSystem[contextMenu.nodeId];
        let options: {label: string, action: () => void}[] = [];
        
        if (node.type === 'folder') {
            options.push({ label: 'New File', action: () => onNewItem('file', node.id) });
            options.push({ label: 'New Folder', action: () => onNewItem('folder', node.id) });
        }
        if (node.id !== 'root' && node.name !== 'main.ai') {
           options.push({ label: 'Delete', action: () => handleDelete(node) });
        }

        return options;
    };


    const rootNode = fileSystem['root'];
    if (!rootNode || rootNode.type !== 'folder') return null;

    return (
        <div className="flex-grow w-[200px] flex-shrink-0 bg-[#272a33] rounded-sm flex flex-col border border-[#3a3d46]">
            <div 
              className="p-2 border-b border-[#3a3d46]"
              onContextMenu={(e) => handleContextMenu(e, rootNode)}
            >
              <h2 className="text-gray-400 font-semibold text-xs uppercase tracking-wider">Explorer</h2>
            </div>
            <div className="flex-grow overflow-y-auto">
                {rootNode.children.map(nodeId => (
                    <NodeComponent 
                        key={nodeId} 
                        nodeId={nodeId} 
                        fileSystem={fileSystem} 
                        level={0} 
                        onNodeClick={handleNodeClick}
                        onContextMenu={handleContextMenu}
                        onRename={handleRename}
                    />
                ))}
            </div>
            {contextMenu && <ContextMenu x={contextMenu.x} y={contextMenu.y} options={contextOptions()} onClose={() => setContextMenu(null)} />}
        </div>
    );
};
