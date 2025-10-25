import React, { useState, useCallback } from 'react';
import CodeEditor from '../editor/CodeEditor';
import type { FileSystemTree, Problem, EditorCommand } from '../../game/types';
import { FileIcon, XMarkIcon, PlusIcon } from '../icons';
import { formatCode } from '../../game/gemini';
import { EditorStatusBar } from '../editor/EditorStatusBar';
import { CommandPalette } from '../editor/CommandPalette';

interface EditorPanelProps {
    actions: { id: string; icon: React.ReactNode; onClick: () => void; }[];
    openTabs: string[];
    activeTabId: string;
    fileSystem: FileSystemTree;
    problems: Problem[];
    settings: any; // Allow passing settings object
    onTabClick: (tabId: string) => void;
    onTabClose: (tabId: string) => void;
    onCodeChange: (code: string) => void;
    onNewFileClick: () => void;
    onTabsReorder: (tabs: string[]) => void;
    onAddProblem: (problem: Problem) => void;
    onRunSelection: (selectedCode: string) => void;
}

export const EditorPanel: React.FC<EditorPanelProps> = ({ 
    actions, openTabs, activeTabId, fileSystem, problems, settings, onTabClick, onTabClose, onCodeChange, onNewFileClick, onTabsReorder, onAddProblem, onRunSelection
}) => {
  const activeFile = fileSystem[activeTabId];
  const code = (activeFile?.type === 'file' ? activeFile.code : '') || '';
  const activeLanguage = activeFile?.name.split('.').pop() || 'txt';
  
  const [draggedTabId, setDraggedTabId] = useState<string | null>(null);
  const [dropIndicatorIndex, setDropIndicatorIndex] = useState<number | null>(null);

  const [isPaletteOpen, setPaletteOpen] = useState(false);
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });
  const [isFormatting, setIsFormatting] = useState(false);

  const handleFormatDocument = useCallback(async () => {
    if (isFormatting || !activeFile || activeFile.type !== 'file') return;
    setIsFormatting(true);
    try {
        const formatted = await formatCode(code, activeLanguage);
        onCodeChange(formatted);
    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : "An unknown error occurred during formatting.";
        console.error("Failed to format code:", e);
        onAddProblem({
            fileId: activeTabId,
            line: 0, // Indicates a general file error, not on a specific line
            message: `Code formatting failed: ${errorMessage}`,
            code: code,
            language: activeLanguage,
        });
    } finally {
        setIsFormatting(false);
    }
  }, [code, activeLanguage, activeFile, isFormatting, onCodeChange, onAddProblem, activeTabId]);

  const commands: EditorCommand[] = [
    {
        id: 'formatDocument',
        label: isFormatting ? 'Formatting document...' : 'Format Document',
        action: handleFormatDocument,
    },
    // More commands can be added here, e.g., for toggling settings
  ];


  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, tabId: string) => {
      e.dataTransfer.setData('application/tab-id', tabId);
      e.dataTransfer.effectAllowed = 'move';
      // Use a timeout to allow the browser to render the drag image before updating state
      setTimeout(() => setDraggedTabId(tabId), 0);
  };

  const handleDragEnd = () => {
      setDraggedTabId(null);
      setDropIndicatorIndex(null);
  };
  
  const handleDragOverTab = (e: React.DragEvent<HTMLDivElement>, targetTabId: string) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (!draggedTabId || draggedTabId === targetTabId) return;

      const targetIndex = openTabs.indexOf(targetTabId);
      const rect = e.currentTarget.getBoundingClientRect();
      const isRightHalf = e.clientX > rect.left + rect.width / 2;
      
      const newIndicatorIndex = isRightHalf ? targetIndex + 1 : targetIndex;
      if (newIndicatorIndex !== dropIndicatorIndex) {
          setDropIndicatorIndex(newIndicatorIndex);
      }
  };

  const handleDropOnTabBar = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      try {
        const draggedId = e.dataTransfer.getData('application/tab-id');
        if (!draggedId || dropIndicatorIndex === null) return;
        
        const draggedIndex = openTabs.indexOf(draggedId);
        if (draggedIndex === -1) {
            console.warn("Dropped tab ID not found in open tabs:", draggedId);
            return;
        };

        const newTabs = [...openTabs];
        const [removedTab] = newTabs.splice(draggedIndex, 1);
        
        // Adjust the drop index if we're moving an item from left to right
        const adjustedDropIndex = dropIndicatorIndex > draggedIndex ? dropIndicatorIndex - 1 : dropIndicatorIndex;
        
        newTabs.splice(adjustedDropIndex, 0, removedTab);
        onTabsReorder(newTabs);
      } catch (error) {
          console.error("Error during tab drop operation:", error);
      } finally {
          // Always clean up drag state, even if an error occurs
          setDraggedTabId(null);
          setDropIndicatorIndex(null);
      }
  };

  const handleDragLeaveTabBar = () => {
      setDropIndicatorIndex(null);
  };

  const activeFileProblems = problems.filter(p => p.fileId === activeTabId);

  return (
    <div className="flex-grow bg-[#1e2026] rounded-lg flex flex-col text-sm font-mono border border-[#3a3d46]">
       <CommandPalette 
            isOpen={isPaletteOpen}
            onClose={() => setPaletteOpen(false)}
            commands={commands}
        />
      {/* Tab Bar */}
      <div className="h-10 flex items-center bg-[#272a33] border-b border-[#3a3d46] text-gray-400">
        <div 
            className="flex-grow flex items-stretch h-full"
            onDrop={handleDropOnTabBar}
            onDragOver={(e) => e.preventDefault()}
            onDragLeave={handleDragLeaveTabBar}
        >
            {openTabs.map((tabId, index) => {
                const file = fileSystem[tabId];
                if (!file || file.status === 'deleted') return null;
                const isActive = tabId === activeTabId;
                return (
                    <React.Fragment key={tabId}>
                      {dropIndicatorIndex === index && <div className="w-0.5 h-6 bg-sky-400 self-center" />}
                      <div 
                          draggable
                          onDragStart={(e) => handleDragStart(e, tabId)}
                          onDragEnd={handleDragEnd}
                          onDragOver={(e) => handleDragOverTab(e, tabId)}
                          onClick={() => onTabClick(tabId)}
                          className={`flex items-center px-3 border-r border-[#3a3d46] cursor-pointer hover:bg-[#22252a] transition-opacity ${isActive ? 'bg-[#1e2026] text-white' : ''} ${draggedTabId === tabId ? 'opacity-50' : ''}`}
                      >
                          <FileIcon className="w-4 h-4 mr-2 text-gray-500" />
                          <span className="text-xs font-semibold">{file.name}</span>
                          <button 
                              onClick={(e) => { e.stopPropagation(); onTabClose(tabId); }}
                              className="ml-3 text-gray-500 hover:text-white rounded-full hover:bg-gray-600 p-0.5"
                          >
                              <XMarkIcon className="w-3 h-3" />
                          </button>
                      </div>
                    </React.Fragment>
                )
            })}
            {dropIndicatorIndex === openTabs.length && <div className="w-0.5 h-6 bg-sky-400 self-center" />}
            <button
                onClick={onNewFileClick}
                className="flex items-center justify-center px-3 text-gray-400 hover:text-white hover:bg-[#22252a] border-r border-[#3a3d46]"
                title="New File"
            >
                <PlusIcon />
            </button>
        </div>
        <div className="flex items-center space-x-3 px-3 text-gray-400">
            {actions.map(action => (
                <button key={action.id} onClick={action.onClick} className="hover:text-white">{action.icon}</button>
            ))}
        </div>
      </div>
      
      {/* Editor */}
      <div className="flex-grow relative min-h-0">
        {activeTabId && activeFile ? (
            <CodeEditor 
              key={activeTabId}
              code={code} 
              onCodeChange={onCodeChange} 
              language={activeLanguage}
              problems={activeFileProblems}
              settings={settings}
              onCursorChange={setCursorPosition}
              onOpenPalette={() => setPaletteOpen(true)}
              onRunSelection={onRunSelection}
            />
        ) : (
            <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                Select a file to begin editing.
            </div>
        )}
      </div>
       <EditorStatusBar 
            language={activeLanguage}
            cursorPosition={cursorPosition}
        />
    </div>
  );
};