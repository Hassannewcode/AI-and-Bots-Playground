import React, { useState, useCallback, useRef, useEffect } from 'react';
import CodeEditor from '../editor/CodeEditor';
import { produce } from 'immer';
import { nanoid } from 'nanoid';
import type { FileSystemTree, Problem, EditorCommand, TabBarItem, TabGroup } from '../../game/types';
import { FileIcon, XMarkIcon, PlusIcon } from '../icons';
import { formatCode } from '../../game/gemini';
import { EditorStatusBar } from '../editor/EditorStatusBar';
import { CommandPalette } from '../editor/CommandPalette';

// Group Colors
const GROUP_COLORS = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef'];

// CONTEXT MENU COMPONENT (INLINED)
const TabContextMenu = ({ x, y, options, onClose }: { x: number, y: number, options: { label: string, action: () => void, isSeparator?: boolean }[], onClose: () => void }) => {
    const menuRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    return (
        <div ref={menuRef} style={{ top: y, left: x }} className="absolute z-50 bg-[#1e2026] border border-[#3a3d46] rounded-md shadow-lg text-white text-xs w-52 py-1">
            {options.map((opt, i) => (
                opt.isSeparator
                    ? <div key={`sep-${i}`} className="h-px bg-[#3a3d46] my-1" />
                    : <button key={opt.label} onClick={() => { opt.action(); onClose(); }} className="block w-full text-left px-3 py-1.5 hover:bg-[#2a2d35]">{opt.label}</button>
            ))}
        </div>
    );
};

// GROUP EDITOR MODAL (INLINED)
const GroupEditorModal = ({ group, onClose, onSave }: { group: Partial<TabGroup>, onClose: () => void, onSave: (name: string, color: string) => void }) => {
    const [name, setName] = useState(group.name || 'New Group');
    const [color, setColor] = useState(group.color || GROUP_COLORS[7]);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { inputRef.current?.focus(); inputRef.current?.select(); }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(name, color);
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-[#272a33] rounded-lg shadow-lg p-4 w-full max-w-xs text-gray-300 border border-[#3a3d46]" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit}>
                    <input ref={inputRef} type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-[#1e2026] border border-[#3a3d46] rounded-md px-2 py-1.5 text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-sky-500" />
                    <div className="flex justify-between mt-3 px-2">
                        {GROUP_COLORS.map(c => (
                            <button key={c} type="button" onClick={() => setColor(c)} style={{ backgroundColor: c }} className={`w-6 h-6 rounded-full transition-transform transform hover:scale-110 ${color === c ? 'ring-2 ring-offset-2 ring-offset-[#272a33] ring-white' : ''}`} />
                        ))}
                    </div>
                </form>
            </div>
        </div>
    );
};

interface EditorPanelProps {
    actions: { id: string; icon: React.ReactNode; onClick: () => void; }[];
    openTabs: TabBarItem[];
    setOpenTabs: React.Dispatch<React.SetStateAction<TabBarItem[]>>;
    activeTabId: string;
    fileSystem: FileSystemTree;
    problems: Problem[];
    settings: any;
    onTabClick: (tabId: string) => void;
    onTabClose: (tabId: string) => void;
    onCodeChange: (code: string) => void;
    onNewFileClick: () => void;
    onNewGroupClick: () => void;
    onAddProblem: (problem: Problem) => void;
    onRunSelection: (selectedCode: string) => void;
}

export const EditorPanel: React.FC<EditorPanelProps> = ({ 
    actions, openTabs, setOpenTabs, activeTabId, fileSystem, problems, settings, onTabClick, onTabClose, onCodeChange, onNewFileClick, onNewGroupClick, onAddProblem, onRunSelection
}) => {
    const activeFile = fileSystem[activeTabId];
    const code = (activeFile?.type === 'file' ? activeFile.code : '') || '';
    const activeLanguage = activeFile?.name.split('.').pop() || 'txt';
  
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, item: TabBarItem | string, groupId?: string } | null>(null);
    const [groupEditor, setGroupEditor] = useState<{ target: 'new' | 'edit', tabId?: string, group?: TabGroup } | null>(null);
    const draggedItem = useRef<{ type: 'tab' | 'group', id: string, sourceGroupId?: string } | null>(null);
    const dropTarget = useRef<{ type: 'tab' | 'group' | 'bar', id?: string, position: 'before' | 'after' | 'over' } | null>(null);
    const [forceRerender, setForceRerender] = useState(0); // To update drag visuals

    const [isPaletteOpen, setPaletteOpen] = useState(false);
    const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });
    const [isFormatting, setIsFormatting] = useState(false);

    const [newItemMenuPosition, setNewItemMenuPosition] = useState<{ x: number, y: number } | null>(null);
    const newItemButtonRef = useRef<HTMLButtonElement>(null);


    const handleFormatDocument = useCallback(async () => {
        if (isFormatting || !activeFile || activeFile.type !== 'file') return;
        setIsFormatting(true);
        try {
            const formatted = await formatCode(code, activeLanguage);
            onCodeChange(formatted);
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : "An unknown error occurred during formatting.";
            console.error("Failed to format code:", e);
            onAddProblem({ fileId: activeTabId, line: 0, message: `Code formatting failed: ${errorMessage}`, code: code, language: activeLanguage });
        } finally {
            setIsFormatting(false);
        }
    }, [code, activeLanguage, activeFile, isFormatting, onCodeChange, onAddProblem, activeTabId]);

    const commands: EditorCommand[] = [{ id: 'formatDocument', label: isFormatting ? 'Formatting document...' : 'Format Document', action: handleFormatDocument }];

    const handleContextMenu = (e: React.MouseEvent, item: TabBarItem | string, groupId?: string) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ x: e.clientX, y: e.clientY, item, groupId });
    };

    const handleGroupSave = (name: string, color: string) => {
        if (!groupEditor) return;
        setOpenTabs(produce(draft => {
            if (groupEditor.target === 'edit' && groupEditor.group) {
                const group = draft.find(g => typeof g !== 'string' && g.id === groupEditor.group?.id) as TabGroup | undefined;
                if (group) {
                    group.name = name;
                    group.color = color;
                }
            } else if (groupEditor.target === 'new' && groupEditor.tabId) {
                const tabId = groupEditor.tabId;
                const location = draft.findIndex(t => t === tabId);
                if (location !== -1) {
                    draft[location] = { id: nanoid(8), name, color, isCollapsed: false, children: [tabId] };
                }
            }
        }));
        setGroupEditor(null);
    };
    
    const handleNewItemClick = () => {
        if (newItemButtonRef.current) {
            const rect = newItemButtonRef.current.getBoundingClientRect();
            const MENU_WIDTH = 208; // w-52 in tailwind
            let x = rect.left;
            if (x + MENU_WIDTH > window.innerWidth) {
                x = rect.right - MENU_WIDTH;
            }
            setNewItemMenuPosition({ x, y: rect.bottom + 4 });
        }
    };


    // TAB GROUP ACTIONS
    const handleCreateGroup = (tabId: string) => setGroupEditor({ target: 'new', tabId });
    const handleAddToGroup = (tabId: string, groupId: string) => {
        setOpenTabs(produce(draft => {
            const tabLocation = draft.findIndex(t => t === tabId);
            if (tabLocation === -1) return;
            const [tab] = draft.splice(tabLocation, 1);
            const group = draft.find(g => typeof g !== 'string' && g.id === groupId) as TabGroup | undefined;
            if (group && typeof tab === 'string') group.children.push(tab);
        }));
    };
    const handleRemoveFromGroup = (tabId: string, groupId: string) => {
        setOpenTabs(produce(draft => {
            const group = draft.find(g => typeof g !== 'string' && g.id === groupId) as TabGroup | undefined;
            if (!group) return;
            const tabIndex = group.children.indexOf(tabId);
            if (tabIndex === -1) return;
            const [tab] = group.children.splice(tabIndex, 1);
            const groupLocation = draft.findIndex(g => typeof g !== 'string' && g.id === groupId);
            draft.splice(groupLocation + 1, 0, tab);
            if (group.children.length === 0) {
                 draft.splice(groupLocation, 1);
            }
        }));
    };
    const handleToggleCollapse = (groupId: string) => {
        setOpenTabs(produce(draft => {
            const group = draft.find(g => typeof g !== 'string' && g.id === groupId) as TabGroup | undefined;
            if (group) group.isCollapsed = !group.isCollapsed;
        }));
    };
    const handleUngroup = (groupId: string) => {
         setOpenTabs(produce(draft => {
            const groupIndex = draft.findIndex(g => typeof g !== 'string' && g.id === groupId);
            if (groupIndex === -1) return;
            const group = draft[groupIndex] as TabGroup;
            draft.splice(groupIndex, 1, ...group.children);
        }));
    };
    const handleCloseGroup = (groupId: string) => {
        const group = openTabs.find(g => typeof g !== 'string' && g.id === groupId) as TabGroup | undefined;
        if (!group) return;
        group.children.forEach(tabId => onTabClose(tabId));
    };

    // D&D LOGIC
    const handleDragStart = (e: React.DragEvent, type: 'tab' | 'group', id: string, sourceGroupId?: string) => {
        e.dataTransfer.setData('application/json', JSON.stringify({ type, id, sourceGroupId }));
        e.dataTransfer.effectAllowed = 'move';
        setTimeout(() => {
            draggedItem.current = { type, id, sourceGroupId };
            setForceRerender(p => p + 1);
        }, 0);
    };

    const handleDragOver = (e: React.DragEvent, type: 'tab' | 'group' | 'bar', id?: string) => {
        e.preventDefault();
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const isRightHalf = e.clientX > rect.left + rect.width / 2;
        // Fix: Changed `const ... as const` to a mutable object with an explicit type.
        const newTarget: { type: 'tab' | 'group' | 'bar', id?: string, position: 'before' | 'after' | 'over' } = { type, id, position: isRightHalf ? 'after' : 'before' };
        
        if(draggedItem.current?.type === 'tab' && type === 'group') {
             newTarget.position = 'over';
        }
        
        if (JSON.stringify(newTarget) !== JSON.stringify(dropTarget.current)) {
            dropTarget.current = newTarget;
            setForceRerender(p => p + 1);
        }
    };

    const handleDragEnd = () => {
        if(draggedItem.current) {
            setOpenTabs(produce(draft => {
                if (!draggedItem.current || !dropTarget.current) return;
                const { type: draggedType, id: draggedId, sourceGroupId } = draggedItem.current;
                const { type: targetType, id: targetId, position } = dropTarget.current;

                let draggedItemData: TabBarItem | undefined;

                // Remove from source
                if (sourceGroupId) {
                    const sourceGroup = draft.find(g => typeof g !== 'string' && g.id === sourceGroupId) as TabGroup | undefined;
                    if (sourceGroup) {
                        const index = sourceGroup.children.indexOf(draggedId);
                        if(index > -1) [draggedItemData] = sourceGroup.children.splice(index, 1);
                        if(sourceGroup.children.length === 0) {
                            const groupIndex = draft.findIndex(g => typeof g !== 'string' && g.id === sourceGroupId);
                            if(groupIndex > -1) draft.splice(groupIndex, 1);
                        }
                    }
                } else {
                    const index = draft.findIndex(item => (typeof item === 'string' ? item : item.id) === draggedId);
                    if(index > -1) [draggedItemData] = draft.splice(index, 1);
                }
                
                if (!draggedItemData) return;

                // Add to destination
                if(targetType === 'group' && position === 'over' && typeof draggedItemData === 'string') {
                    const targetGroup = draft.find(g => typeof g !== 'string' && g.id === targetId) as TabGroup | undefined;
                    targetGroup?.children.push(draggedItemData);
                } else {
                    const targetIndex = draft.findIndex(item => (typeof item === 'string' ? item : item.id) === targetId);
                    if (targetIndex > -1) {
                        draft.splice(targetIndex + (position === 'after' ? 1 : 0), 0, draggedItemData);
                    } else { // Dropped on bar
                        draft.push(draggedItemData);
                    }
                }
            }));
        }
        draggedItem.current = null;
        dropTarget.current = null;
        setForceRerender(p => p + 1);
    };


    const activeFileProblems = problems.filter(p => p.fileId === activeTabId);

    const renderItem = (item: TabBarItem, isDropTarget: boolean, isDragged: boolean) => {
        if (typeof item === 'string') {
            const fileId = item;
            const file = fileSystem[fileId];
            if (!file || file.status === 'deleted') return null;
            const isActive = fileId === activeTabId;
            return (
                <div draggable onDragStart={(e) => handleDragStart(e, 'tab', fileId)} onDragOver={(e) => handleDragOver(e, 'tab', fileId)} onClick={() => onTabClick(fileId)} onContextMenu={(e) => handleContextMenu(e, fileId)} title={file.name}
                    className={`flex items-center px-3 h-10 border-r border-[#3a3d46] cursor-pointer hover:bg-[#22252a] transition-opacity ${isActive ? 'bg-[#1e2026] text-white' : ''} ${isDragged ? 'opacity-30' : ''}`}>
                    <FileIcon className="w-4 h-4 mr-2 text-gray-500" /> <span className="text-xs font-semibold">{file.name}</span>
                    <button onClick={(e) => { e.stopPropagation(); onTabClose(fileId); }} title="Close tab" className="ml-3 text-gray-500 hover:text-white rounded-full hover:bg-gray-600 p-0.5"><XMarkIcon className="w-3 h-3" /></button>
                </div>
            );
        } else {
            const group = item;
            return (
                <div draggable onDragStart={(e) => handleDragStart(e, 'group', group.id)} onDragOver={(e) => handleDragOver(e, 'group', group.id)}
                    className={`flex items-center rounded-l-md mr-1 ${isDragged ? 'opacity-30' : ''}`} style={{ backgroundColor: group.isCollapsed ? group.color + '40' : 'transparent' }}>
                    <div onClick={() => handleToggleCollapse(group.id)} onContextMenu={(e) => handleContextMenu(e, group)} title={group.name}
                        className="flex items-center px-2 h-6 rounded-md cursor-pointer hover:bg-white/20" style={{ color: group.color }}>
                        <div className="w-2.5 h-2.5 rounded-full mr-1.5" style={{ backgroundColor: group.color }}></div>
                        <span className="text-xs font-bold">{group.name}</span>
                    </div>
                    {!group.isCollapsed && group.children.map(fileId => {
                        const file = fileSystem[fileId];
                        if (!file || file.status === 'deleted') return null;
                        const isActive = fileId === activeTabId;
                        const isChildDragged = draggedItem.current?.type === 'tab' && draggedItem.current.id === fileId;
                        const isChildDropTarget = dropTarget.current?.type === 'tab' && dropTarget.current.id === fileId;
                        return (
                            <div key={fileId} className="flex items-center">
                                {isChildDropTarget && dropTarget.current?.position === 'before' && <div className="w-0.5 h-6 self-center" style={{backgroundColor: group.color}}/>}
                                <div draggable onDragStart={(e) => handleDragStart(e, 'tab', fileId, group.id)} onDragOver={(e) => handleDragOver(e, 'tab', fileId)} onClick={() => onTabClick(fileId)} onContextMenu={(e) => handleContextMenu(e, fileId, group.id)} title={file.name}
                                    className={`flex items-center px-3 h-10 border-b-2 cursor-pointer hover:bg-[#22252a] transition-opacity ${isActive ? 'bg-[#1e2026] text-white' : 'text-gray-400'} ${isChildDragged ? 'opacity-30' : ''}`}
                                    style={{ borderColor: isActive ? group.color : 'transparent' }}>
                                    <FileIcon className="w-4 h-4 mr-2 text-gray-500" /> <span className="text-xs font-semibold">{file.name}</span>
                                    <button onClick={(e) => { e.stopPropagation(); onTabClose(fileId); }} title="Close tab" className="ml-3 text-gray-500 hover:text-white rounded-full hover:bg-gray-600 p-0.5"><XMarkIcon className="w-3 h-3" /></button>
                                </div>
                                {isChildDropTarget && dropTarget.current?.position === 'after' && <div className="w-0.5 h-6 self-center" style={{backgroundColor: group.color}}/>}
                            </div>
                        )
                    })}
                </div>
            );
        }
    };
  
    const getContextMenuOptions = () => {
        if (!contextMenu) return [];
        const { item, groupId } = contextMenu;
        const allGroups = openTabs.filter(t => typeof t !== 'string') as TabGroup[];

        // Fix: Added a local type for context menu options to allow for the optional `isSeparator` property.
        type ContextMenuOption = { label: string; action: () => void; isSeparator?: boolean };

        if (typeof item === 'string') { // It's a tab
            const tabId = item;
            const options: ContextMenuOption[] = [{ label: 'Add tab to new group', action: () => handleCreateGroup(tabId) }];
            if (allGroups.length > 0 && (!groupId || allGroups.some(g => g.id !== groupId))) {
                 options.push({ isSeparator: true, label: '', action: () => {} });
                 allGroups.filter(g => g.id !== groupId).forEach(g => {
                     options.push({ label: `Add tab to group "${g.name}"`, action: () => handleAddToGroup(tabId, g.id) });
                 });
            }
            if(groupId) {
                 options.push({ isSeparator: true, label: '', action: () => {} });
                 options.push({ label: 'Remove tab from group', action: () => handleRemoveFromGroup(tabId, groupId) });
            }
            return options;
        } else { // It's a group
            const group = item;
            const options: ContextMenuOption[] = [
                { label: 'Rename group', action: () => setGroupEditor({ target: 'edit', group }) },
                { isSeparator: true, label: '', action: () => {} },
                { label: 'Ungroup', action: () => handleUngroup(group.id) },
                { label: 'Close group', action: () => handleCloseGroup(group.id) },
            ];
            return options;
        }
    };

  return (
    <div className="flex-grow bg-[#1e2026] rounded-lg flex flex-col text-sm font-mono border border-[#3a3d46]">
       <CommandPalette isOpen={isPaletteOpen} onClose={() => setPaletteOpen(false)} commands={commands} />
       {contextMenu && <TabContextMenu x={contextMenu.x} y={contextMenu.y} options={getContextMenuOptions()} onClose={() => setContextMenu(null)} />}
       {groupEditor && <GroupEditorModal group={groupEditor.group || {}} onClose={() => setGroupEditor(null)} onSave={handleGroupSave} />}
       {newItemMenuPosition && (
          <TabContextMenu
            x={newItemMenuPosition.x}
            y={newItemMenuPosition.y}
            onClose={() => setNewItemMenuPosition(null)}
            options={[
              { label: 'New File', action: onNewFileClick },
              { label: 'New Group', action: onNewGroupClick },
            ]}
          />
        )}


      {/* Tab Bar */}
      <div className="h-10 flex items-center bg-[#272a33] border-b border-[#3a3d46] text-gray-400">
        <div className="flex-grow flex items-stretch h-full" onDragEnd={handleDragEnd} onDragOver={(e) => handleDragOver(e, 'bar')}>
            {openTabs.map((item) => {
                const id = typeof item === 'string' ? item : item.id;
                const type = typeof item === 'string' ? 'tab' : 'group';
                const isDragged = draggedItem.current?.id === id;
                const isDropTarget = dropTarget.current?.id === id;
                const showBefore = isDropTarget && dropTarget.current.position === 'before';
                const showAfter = isDropTarget && dropTarget.current.position === 'after';
                return (
                    <div key={id} className="flex items-center">
                        {showBefore && <div className="w-0.5 h-6 bg-sky-400 self-center" />}
                        {renderItem(item, isDropTarget, isDragged)}
                        {showAfter && <div className="w-0.5 h-6 bg-sky-400 self-center" />}
                    </div>
                );
            })}
            <div className="flex-grow" onDragOver={(e) => handleDragOver(e, 'bar')}></div>
            <button ref={newItemButtonRef} onClick={handleNewItemClick} className="flex items-center justify-center px-3 text-gray-400 hover:text-white hover:bg-[#22252a] border-l border-[#3a3d46]" title="New File or Group"><PlusIcon /></button>
        </div>
        <div className="flex items-center space-x-3 px-3 text-gray-400">
            {actions.map(action => <button key={action.id} onClick={action.onClick} title="Settings" className="hover:text-white">{action.icon}</button>)}
        </div>
      </div>
      
      {/* Editor */}
      <div className="flex-grow relative min-h-0">
        {activeTabId && activeFile ? (
            <CodeEditor key={activeTabId} code={code} onCodeChange={onCodeChange} language={activeLanguage} problems={activeFileProblems} settings={settings} onCursorChange={setCursorPosition} onOpenPalette={() => setPaletteOpen(true)} onRunSelection={onRunSelection} />
        ) : (
            <div className="absolute inset-0 flex items-center justify-center text-gray-500">Select a file to begin editing.</div>
        )}
      </div>
       <EditorStatusBar language={activeLanguage} cursorPosition={cursorPosition} />
    </div>
  );
};