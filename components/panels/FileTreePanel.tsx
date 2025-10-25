

import React, { useState, useRef, useEffect } from 'react';
import type { FileSystemTree, FileSystemNode } from '../../game/types';
import { produce } from 'immer';
import { FolderIcon, FileIcon, ChevronRightIcon, ChevronDownIcon } from '../icons';

export interface FileTreePanelProps {
    fileSystem: FileSystemTree;
    setFileSystem: React.Dispatch<React.SetStateAction<FileSystemTree>>;
    openTabs: string[];
    setOpenTabs: React.Dispatch<React.SetStateAction<string[]>>;
    activeTabId: string;
    setActiveTabId: React.Dispatch<React.SetStateAction<string>>;
    onNewItem: (type: 'file' | 'folder', parentId: string) => void;
    onSoftDelete: (itemId: string) => void;
    onPermanentDelete: (itemId: string) => void;
    onRestore: (itemId: string) => void;
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
    const extension = fileName.split('.').pop();
    switch (extension) {
        case 'py': return 'text-green-400';
        case 'js':
        case 'jsx':
             return 'text-yellow-400';
        case 'ts':
        case 'tsx':
             return 'text-blue-400';
        case 'html': return 'text-orange-400';
        case 'css': return 'text-sky-400'
        case 'cpp':
        case 'c':
             return 'text-blue-500';
        case 'cs': return 'text-purple-400';
        case 'java': return 'text-red-400';
        case 'go': return 'text-cyan-300';
        case 'rs': return 'text-orange-500';
        default: return 'text-gray-400';
    }
};

const formatTimeRemaining = (ms: number): string => {
    if (ms <= 0) {
        return 'Pending deletion';
    }
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `Deleting in ${hours}h ${minutes}m ${seconds}s`;
};


interface NodeComponentProps {
    nodeId: string;
    fileSystem: FileSystemTree;
    level: number;
    currentTime: number;
    onNodeClick: (node: FileSystemNode) => void;
    onContextMenu: (e: React.MouseEvent, node: FileSystemNode) => void;
    onRename: (nodeId: string, newName: string) => void;
    onRestore: (nodeId: string) => void;
}

const NodeComponent: React.FC<NodeComponentProps> = ({ 
    nodeId, fileSystem, level, onNodeClick, onContextMenu, onRename, currentTime, onRestore
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
    const isDeleted = node.status === 'deleted';

    let countdownText = '';
    if (isDeleted && node.deletionTime) {
        const DELETION_PERIOD = 3 * 60 * 60 * 1000; // 3 hours
        const timeRemaining = (node.deletionTime + DELETION_PERIOD) - currentTime;
        countdownText = formatTimeRemaining(timeRemaining);
    }

    return (
        <div>
            <div 
                style={{ paddingLeft: `${level * 1}rem` }}
                className={`flex items-center h-10 px-2 hover:bg-[#2a2d35] cursor-pointer ${isDeleted ? 'opacity-60' : ''}`}
                onClick={() => { 
                    if (isDeleted) {
                        onRestore(nodeId);
                    } else {
                        isFolder ? setIsOpen(!isOpen) : onNodeClick(node);
                    }
                }}
                onContextMenu={(e) => onContextMenu(e, node)}
                onDoubleClick={() => !isDeleted && setIsRenaming(true)}
            >
                {isFolder ? (
                    isOpen ? <ChevronDownIcon /> : <ChevronRightIcon />
                ) : (
                    <div className="w-5"></div> // Spacer
                )}
                
                {isFolder ? <FolderIcon className="w-4 h-4 mr-2 text-yellow-500 flex-shrink-0" /> : <FileIcon className={`w-4 h-4 mr-2 ${getFileColor(node.name)} flex-shrink-0`} />}

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
                    <div className="flex flex-col overflow-hidden">
                        <span className={`text-xs select-none truncate ${isDeleted ? 'line-through' : ''}`}>{node.name}</span>
                        {isDeleted && <span className="text-[10px] text-red-400 select-none truncate">{countdownText}</span>}
                    </div>
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
                    currentTime={currentTime}
                    onRestore={onRestore}
                />
            ))}
        </div>
    );
};

export const FileTreePanel: React.FC<FileTreePanelProps> = ({ fileSystem, setFileSystem, openTabs, setOpenTabs, activeTabId, setActiveTabId, onNewItem, onSoftDelete, onPermanentDelete, onRestore }) => {
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, nodeId: string } | null>(null);
    const [currentTime, setCurrentTime] = useState(Date.now());

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(Date.now());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const handleNodeClick = (node: FileSystemNode) => {
        if (node.type === 'file' && node.status !== 'deleted') {
            if (!openTabs.includes(node.id)) {
                setOpenTabs(tabs => [...tabs, node.id]);
            }
            setActiveTabId(node.id);
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
        
        if (node.status === 'deleted') {
            options.push({ label: 'Restore', action: () => onRestore(node.id) });
            options.push({ label: 'Delete Permanently', action: () => onPermanentDelete(node.id) });
        } else {
            if (node.type === 'folder') {
                options.push({ label: 'New File', action: () => onNewItem('file', node.id) });
                options.push({ label: 'New Folder', action: () => onNewItem('folder', node.id) });
            }
            if (node.id !== 'root') {
               options.push({ label: 'Delete', action: () => onSoftDelete(node.id) });
            }
        }

        return options;
    };


    const rootNode = fileSystem['root'];
    if (!rootNode || rootNode.type !== 'folder') return null;

    return (
        <div className="h-full" onContextMenu={(e) => handleContextMenu(e, rootNode)}>
            {rootNode.children.map(nodeId => (
                <NodeComponent 
                    key={nodeId} 
                    nodeId={nodeId} 
                    fileSystem={fileSystem} 
                    level={0} 
                    onNodeClick={handleNodeClick}
                    onContextMenu={handleContextMenu}
                    onRename={handleRename}
                    currentTime={currentTime}
                    onRestore={onRestore}
                />
            ))}
            {contextMenu && <ContextMenu x={contextMenu.x} y={contextMenu.y} options={contextOptions()} onClose={() => setContextMenu(null)} />}
        </div>
    );
};
