
import React from 'react';
import type { Problem, FileSystemTree } from '../../game/types';
import { LanguageGuide } from '../guides/LanguageGuide';


interface TabbedOutputPanelProps {
    tabs: { id: string; title: string; count?: number; icon: React.ReactNode; }[];
    onTabClick: (id: string) => void;
    activeTabId: string;
    logs: string[];
    problems: Problem[];
    fileSystem: FileSystemTree;
    openTabs: string[];
    activeEditorTabId: string;
}

export const TabbedOutputPanel: React.FC<TabbedOutputPanelProps> = ({ 
    tabs, onTabClick, activeTabId, logs, problems, 
    fileSystem, openTabs, activeEditorTabId 
}) => (
  <div className="h-full bg-[#272a33] rounded-lg flex flex-col min-h-0 border border-[#3a3d46]">
    <div className="flex border-b border-[#3a3d46] text-gray-400 flex-shrink-0">
      {tabs.map(tab => (
          <button 
            key={tab.id} 
            onClick={() => onTabClick(tab.id)} 
            className={`px-3 py-2 text-xs font-semibold flex items-center space-x-2 hover:text-white transition-colors ${activeTabId === tab.id ? 'bg-[#1e2026] text-white' : ''}`}
          >
            {tab.icon}
            <span>{tab.title}</span>
            {tab.count !== undefined && tab.count > 0 && <span className="bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5">{tab.count}</span>}
          </button>
      ))}
    </div>
    <div className="flex-grow p-2 bg-[#1e2026] font-mono text-xs text-gray-400 overflow-y-auto">
        {activeTabId === 'console' && logs.map((log, index) => <div key={index}>{`> ${log}`}</div>)}
        {activeTabId === 'problems' && (
            problems.length > 0 
                ? problems.map((p, i) => <div key={i} className="text-red-400 flex items-start"><span className="w-10 text-right pr-2 text-gray-500">{p.line}</span><span>{p.message}</span></div>) 
                : <div>No problems detected.</div>
        )}
        {activeTabId === 'guide' && <LanguageGuide 
            fileSystem={fileSystem}
            openTabs={openTabs}
            activeTabId={activeEditorTabId}
        />}
    </div>
  </div>
);
