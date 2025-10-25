import React, { useState } from 'react';
import type { Problem } from '../../game/types';
import { getFixForCodeError } from '../../game/gemini';
import { LanguageGuide } from '../guides/LanguageGuide';
import { ArrowPathIcon, CheckIcon, XMarkIcon, SparklesIcon } from '../icons';


interface TabbedOutputPanelProps {
    tabs: { id: string; title: string; count?: number; icon: React.ReactNode; }[];
    onTabClick: (id: string) => void;
    activeTabId: string;
    logs: string[];
    problems: Problem[];
    activeLanguage: string;
    onApplyFix: (fileId: string, startLine: number, endLine: number, newCode: string) => void;
}

const AIFixComponent: React.FC<{ problem: Problem, onApplyFix: (fileId: string, startLine: number, endLine: number, newCode: string) => void }> = ({ problem, onApplyFix }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [fix, setFix] = useState<{ explanation: string; fixedCode: string; startLine: number; endLine: number; } | null>(null);
    const [error, setError] = useState('');

    const handleGetFix = async () => {
        setIsLoading(true);
        setError('');
        setFix(null);
        try {
            const result = await getFixForCodeError(problem.code, problem.language, problem.message, problem.line);
            setFix(result);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to get fix.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAccept = () => {
        if (!fix) return;
        onApplyFix(problem.fileId, fix.startLine, fix.endLine, fix.fixedCode);
        setFix(null);
    };

    const handleDecline = () => {
        setFix(null);
    };
    
    return (
         <div className="ml-4 flex items-center">
            {fix ? (
                <div className="flex flex-col w-full">
                    <div className="mt-2 p-2 bg-[#1e2026] border border-slate-700 rounded-md">
                        <p className="text-slate-300 text-xs font-sans mb-2">{fix.explanation}</p>
                        <pre className="bg-slate-900 p-2 rounded text-xs text-green-400 whitespace-pre-wrap"><code>{fix.fixedCode}</code></pre>
                    </div>
                    <div className="flex items-center space-x-2 mt-2 self-end">
                         <button onClick={handleDecline} className="flex items-center space-x-1 text-xs bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded">
                            <XMarkIcon className="w-3 h-3" />
                            <span>Decline</span>
                         </button>
                         <button onClick={handleAccept} className="flex items-center space-x-1 text-xs bg-green-700 hover:bg-green-600 px-2 py-1 rounded">
                             <CheckIcon className="w-3 h-3" />
                             <span>Accept Fix</span>
                         </button>
                    </div>
                </div>
            ) : (
                <button
                    onClick={handleGetFix}
                    disabled={isLoading}
                    className="px-2 py-0.5 text-xs bg-sky-800 hover:bg-sky-700 text-sky-200 rounded-md flex items-center space-x-1"
                >
                    {isLoading ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <SparklesIcon className="w-4 h-4" />}
                    <span>{isLoading ? 'Thinking...' : 'Get AI Fix'}</span>
                </button>
            )}
             {error && <div className="ml-4 text-xs text-amber-500">{error}</div>}
        </div>
    );
}

export const TabbedOutputPanel: React.FC<TabbedOutputPanelProps> = ({ 
    tabs, onTabClick, activeTabId, logs, problems, activeLanguage, onApplyFix
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
        {activeTabId === 'console' && logs.map((log, index) => <div key={index} className="whitespace-pre-wrap break-words break-all">{`> ${log}`}</div>)}
        {activeTabId === 'problems' && (
            problems.length > 0 
                ? problems.map((p, i) => (
                    <div key={`${p.fileId}-${p.line}-${i}`} className="mb-2">
                        <div className="text-red-400 flex items-start">
                            <span className="w-10 text-right pr-2 text-gray-500 flex-shrink-0 pt-0.5">{p.line}</span>
                            <div className="flex-grow">
                                <span className="pt-0.5 block whitespace-pre-wrap break-words break-all">{p.message}</span>
                                <AIFixComponent problem={p} onApplyFix={onApplyFix} />
                            </div>
                        </div>
                    </div>
                ))
                : <div>No problems detected.</div>
        )}
        {activeTabId === 'guide' && <LanguageGuide activeLanguage={activeLanguage} />}
    </div>
  </div>
);