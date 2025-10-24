import React, { useState } from 'react';

// Import panel components and their props
import { FileTreePanel, FileTreePanelProps } from './FileTreePanel';
import { AIChatPanel, AIChatPanelProps } from './AIChatPanel';

// Import icons
import { FolderIcon, SparklesIcon } from '../icons';

// This combines the props from both panels.
// In App.tsx, we'll pass all necessary props to this container.
type CombinedSidebarPanelProps = FileTreePanelProps & AIChatPanelProps;

export const CombinedSidebarPanel: React.FC<CombinedSidebarPanelProps> = (props) => {
    const [activeView, setActiveView] = useState<'explorer' | 'ai'>('explorer');

    const renderContent = () => {
        if (activeView === 'explorer') {
            // FileTreePanel now expects its container to handle overflow
            return (
                <div className="flex-grow overflow-y-auto">
                    <FileTreePanel {...props} />
                </div>
            );
        }
        if (activeView === 'ai') {
            // AIChatPanel manages its own internal scrolling
            return <AIChatPanel {...props} />;
        }
        return null;
    };

    return (
        <div className="flex-grow bg-[#272a33] rounded-lg flex flex-col border border-[#3a3d46] min-h-0">
            {/* Header with toggle buttons */}
            <div className="flex border-b border-[#3a3d46] text-gray-400 flex-shrink-0">
                <button
                    onClick={() => setActiveView('explorer')}
                    className={`flex-1 px-3 py-2 text-xs font-semibold flex items-center justify-center space-x-2 hover:text-white transition-colors ${activeView === 'explorer' ? 'bg-[#1e2026] text-white' : ''}`}
                    title="Explorer"
                >
                    <FolderIcon className="w-4 h-4" />
                    <span>Explorer</span>
                </button>
                <button
                    onClick={() => setActiveView('ai')}
                    className={`flex-1 px-3 py-2 text-xs font-semibold flex items-center justify-center space-x-2 hover:text-white transition-colors ${activeView === 'ai' ? 'bg-[#1e2026] text-white' : ''}`}
                    title="AI Assistant"
                >
                    <SparklesIcon className="w-4 h-4" />
                    <span>Assistant</span>
                </button>
            </div>

            {/* Content */}
            <div className="flex-grow min-h-0 relative">
                {renderContent()}
            </div>
        </div>
    );
};