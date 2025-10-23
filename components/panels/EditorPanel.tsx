
import React from 'react';
import CodeEditor from '../editor/CodeEditor';
import type { FileSystemTree } from '../../game/types';
import { FileIcon, XMarkIcon, PlusIcon } from '../icons';

interface EditorPanelProps {
    actions: { id: string; icon: React.ReactNode; onClick: () => void; }[];
    openTabs: string[];
    activeTabId: string;
    fileSystem: FileSystemTree;
    onTabClick: (tabId: string) => void;
    onTabClose: (tabId: string) => void;
    onCodeChange: (code: string) => void;
    onNewFileClick: () => void;
}

export const EditorPanel: React.FC<EditorPanelProps> = ({ 
    actions, openTabs, activeTabId, fileSystem, onTabClick, onTabClose, onCodeChange, onNewFileClick
}) => {
  const activeFile = fileSystem[activeTabId];
  const code = (activeFile?.type === 'file' ? activeFile.code : '') || '';
  const activeLanguage = activeFile?.name.split('.').pop() || 'txt';

  return (
    <div className="flex-grow bg-[#1e2026] rounded-lg flex flex-col text-sm font-mono border border-[#3a3d46]">
      {/* Tab Bar */}
      <div className="h-10 flex items-center bg-[#272a33] border-b border-[#3a3d46] text-gray-400">
        <div className="flex-grow flex items-stretch h-full">
            {openTabs.map(tabId => {
                const file = fileSystem[tabId];
                if (!file) return null;
                const isActive = tabId === activeTabId;
                return (
                    <div 
                        key={tabId}
                        onClick={() => onTabClick(tabId)}
                        className={`flex items-center px-3 border-r border-[#3a3d46] cursor-pointer hover:bg-[#22252a] ${isActive ? 'bg-[#1e2026] text-white' : ''}`}
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
                )
            })}
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
            <CodeEditor code={code} onCodeChange={onCodeChange} language={activeLanguage} />
        ) : (
            <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                Select a file to begin editing.
            </div>
        )}
      </div>
    </div>
  );
};
