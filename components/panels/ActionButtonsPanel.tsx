

import React from 'react';
import { QuestionMarkCircleIcon, ArrowPathIcon } from '../icons';

interface ActionButtonsPanelProps {
    title: string;
    buttons: { id: string; onClick: () => void; style: 'primary' | 'secondary'; icon: React.ReactNode; text: string; }[];
    onHelpClick: () => void;
    isExecuting: boolean;
}

export const ActionButtonsPanel: React.FC<ActionButtonsPanelProps> = ({ title, buttons, onHelpClick, isExecuting }) => (
    <div className="flex-grow bg-[#272a33] rounded-lg p-2 flex flex-col space-y-2 border border-[#3a3d46]">
        <div className="flex items-center space-x-2">
            <h2 className="text-gray-400 font-semibold text-xs uppercase tracking-wider">{title}</h2>
            <button onClick={onHelpClick} className="text-gray-500 hover:text-white" title="Help"><QuestionMarkCircleIcon /></button>
        </div>
         <div className="space-y-2">
            {buttons.map(button => {
                const primaryStyles = "bg-teal-600 hover:bg-teal-500 text-white font-bold";
                const secondaryStyles = "bg-[#3a3d46] hover:bg-[#4a4d56] border border-[#4f525c] text-gray-300 font-semibold";
                const isDisabled = isExecuting;
                
                return (
                    <button 
                        key={button.id} 
                        onClick={button.onClick} 
                        disabled={isDisabled}
                        className={`w-full h-10 rounded-md flex items-center justify-center space-x-2 transition-colors text-xs ${button.style === 'primary' ? primaryStyles : secondaryStyles} disabled:bg-gray-600 disabled:cursor-not-allowed`}
                    >
                        {isExecuting ? <ArrowPathIcon className="animate-spin w-5 h-5" /> : button.icon}
                        <span>{isExecuting ? 'Executing...' : button.text}</span>
                    </button>
                )
            })}
         </div>
    </div>
);