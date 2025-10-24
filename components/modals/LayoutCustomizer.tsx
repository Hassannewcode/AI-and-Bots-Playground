
import React, { useState, useRef } from 'react';
import { produce } from 'immer';
import type { PanelLayout, PanelComponentKey } from '../../game/types';

type ColumnKey = keyof PanelLayout;

const PANEL_DETAILS: Record<PanelComponentKey, { title: string, description: string } | null> = {
    'CombinedSidebarPanel': { title: 'Sidebar', description: 'Explorer & AI Assistant.' },
    'EditorPanel': { title: 'Editor', description: 'Code editor component.' },
    'TabbedOutputPanel': { title: 'Output', description: 'Console, problems, and guide tabs.' },
    'PrimaryDisplayPanel': { title: 'Preview', description: 'Game preview window.' },
    'InfoCardListPanel': { title: 'Sprites', description: 'List of active sprites.' },
    'UserDetailsPanel': { title: 'User Details', description: 'User profile card.' },
    'ActionButtonsPanel': { title: 'Actions', description: 'Run and help buttons.' },
    // These are now combined and should not be individually selectable
    'FileTreePanel': null,
    'AIChatPanel': null,
};

interface LayoutCustomizerProps {
    initialLayout: PanelLayout;
    onSave: (newOrder: PanelLayout) => void;
    onClose: () => void;
}

const LayoutCustomizer: React.FC<LayoutCustomizerProps> = ({ initialLayout, onSave, onClose }) => {
    const [layout, setLayout] = useState<PanelLayout>(initialLayout);
    const draggedItem = useRef<{ panel: PanelComponentKey, sourceColumn: ColumnKey, sourceIndex: number } | null>(null);
    const [dropIndicator, setDropIndicator] = useState<{ column: ColumnKey, index: number } | null>(null);

    const handleDragStart = (panel: PanelComponentKey, sourceColumn: ColumnKey, sourceIndex: number) => {
        draggedItem.current = { panel, sourceColumn, sourceIndex };
    };

    const handleDragOver = (e: React.DragEvent, column: ColumnKey) => {
        e.preventDefault();
        if (!dropIndicator || dropIndicator.column !== column || dropIndicator.index !== layout[column].length) {
             setDropIndicator({ column, index: layout[column].length });
        }
    };

    const handleDragEnter = (e: React.DragEvent, column: ColumnKey, index: number) => {
        e.preventDefault();
        setDropIndicator({ column, index });
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (!draggedItem.current || !dropIndicator) return;
        
        const { panel, sourceColumn, sourceIndex } = draggedItem.current;
        const { column: targetColumn, index: targetIndex } = dropIndicator;
        
        setLayout(produce(draft => {
            // Remove from source
            const [removed] = draft[sourceColumn].splice(sourceIndex, 1);
            
            // Adjust target index if moving within the same column
            const adjustedTargetIndex = targetColumn === sourceColumn && sourceIndex < targetIndex
                ? targetIndex - 1 
                : targetIndex;

            // Add to target
            draft[targetColumn].splice(adjustedTargetIndex, 0, removed);
        }));

        draggedItem.current = null;
        setDropIndicator(null);
    };

    const handleDragEnd = () => {
        draggedItem.current = null;
        setDropIndicator(null);
    };
    
    return (
        <div className="fixed inset-0 bg-black/80 flex flex-col items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-[#1e2026] rounded-lg shadow-lg p-6 w-full max-w-4xl text-gray-300 border border-[#3a3d46]" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold text-white mb-2">Customize Layout</h2>
                <p className="text-sm text-gray-400 mb-6">Drag and drop the panels to reorder your workspace. The layout is arranged horizontally.</p>

                <div className="flex space-x-4">
                    {(['left', 'middle', 'right'] as ColumnKey[]).map(columnKey => (
                        <div
                            key={columnKey}
                            onDragOver={(e) => handleDragOver(e, columnKey)}
                            onDrop={handleDrop}
                            onDragEnd={handleDragEnd}
                            className="flex-1 bg-[#272a33] p-2 rounded-md min-h-[250px] border border-dashed border-gray-600 transition-colors"
                        >
                            <h3 className="text-center font-bold uppercase text-xs text-gray-500 tracking-wider mb-2">{columnKey} Column</h3>
                            {layout[columnKey].map((panelKey, index) => {
                                const details = PANEL_DETAILS[panelKey];
                                if (!details) return null;

                                const isBeingDragged = draggedItem.current?.panel === panelKey;
                                return (
                                    <React.Fragment key={panelKey}>
                                        {dropIndicator && dropIndicator.column === columnKey && dropIndicator.index === index && (
                                            <div className="h-1 bg-sky-500 rounded-full my-1" />
                                        )}
                                        <div
                                            draggable
                                            onDragStart={() => handleDragStart(panelKey, columnKey, index)}
                                            onDragEnter={(e) => handleDragEnter(e, columnKey, index)}
                                            className={`p-3 bg-[#1e2026] rounded border border-gray-700 cursor-grab mb-2 transition-opacity ${isBeingDragged ? 'opacity-30' : 'hover:border-gray-500'}`}
                                        >
                                            <h4 className="font-bold text-white text-sm">{details.title}</h4>
                                            <p className="text-xs text-gray-400 mt-1">{details.description}</p>
                                        </div>
                                    </React.Fragment>
                                );
                            })}
                            {dropIndicator && dropIndicator.column === columnKey && dropIndicator.index === layout[columnKey].length && (
                                <div className="h-1 bg-sky-500 rounded-full my-1" />
                            )}
                             <div className="flex-grow min-h-[10px]"></div>
                        </div>
                    ))}
                </div>
                
                <div className="mt-6 flex justify-end space-x-3">
                    <button onClick={onClose} className="bg-[#3a3d46] hover:bg-[#4a4d56] text-gray-300 font-bold py-2 px-4 rounded-md transition-colors">
                        Cancel
                    </button>
                    <button onClick={() => onSave(layout)} className="bg-teal-600 hover:bg-teal-500 text-white font-bold py-2 px-4 rounded-md transition-colors">
                        Save and Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LayoutCustomizer;
