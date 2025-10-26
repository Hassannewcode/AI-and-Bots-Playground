import React, { useState } from 'react';
import type { Problem, FileSystemTree } from '../../game/types';
import { getFixForCodeError, getFixForAllCodeErrors } from '../../game/gemini';
import { LanguageGuide } from '../guides/LanguageGuide';
import { ArrowPathIcon, CheckIcon, XMarkIcon, SparklesIcon } from '../icons';


interface TabbedOutputPanelProps {
    tabs: { id: string; title: string; count?: number; icon: React.ReactNode; }[];
    onTabClick: (id: string) => void;
    activeTabId: string;
    logs: string[];
    problems: Problem[];
    activeLanguage: string;
    fileSystem: FileSystemTree;
    activeFileId: string;
    onApplyFix: (fileId: string, startLine: number, endLine: number, newCode: string) => void;
    onReplaceFileContent: (fileId: string, newCode: string) => void;
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
                         <button onClick={handleDecline} title="Decline this suggestion" className="flex items-center space-x-1 text-xs bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded">
                            <XMarkIcon className="w-3 h-3" />
                            <span>Decline</span>
                         </button>
                         <button onClick={handleAccept} title="Apply this fix to your code" className="flex items-center space-x-1 text-xs bg-green-700 hover:bg-green-600 px-2 py-1 rounded">
                             <CheckIcon className="w-3 h-3" />
                             <span>Accept Fix</span>
                         </button>
                    </div>
                </div>
            ) : (
                <button
                    onClick={handleGetFix}
                    disabled={isLoading}
                    title="Use Gemini to suggest a fix for this error"
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
    tabs, onTabClick, activeTabId, logs, problems, activeLanguage, fileSystem, activeFileId, onApplyFix, onReplaceFileContent
}) => {
    const [isFixingAll, setIsFixingAll] = useState(false);
    const [fixAllError, setFixAllError] = useState('');

    const problemsForActiveFile = problems.filter(p => p.fileId === activeFileId);
    const activeFileName = fileSystem[activeFileId]?.name || 'Current File';

    const handleFixAll = async () => {
        if (problemsForActiveFile.length === 0) return;
        
        setIsFixingAll(true);
        setFixAllError('');
        
        const fileCode = problemsForActiveFile[0].code; // All problems for the same file will have the same code
        const problemsToFix = problemsForActiveFile.map(p => ({ line: p.line, message: p.message }));
        
        try {
            const result = await getFixForAllCodeErrors(fileCode, activeLanguage, problemsToFix);
            onReplaceFileContent(activeFileId, result.fixedCode);
        } catch (e) {
            setFixAllError(e instanceof Error ? e.message : 'Failed to get fixes.');
        } finally {
            setIsFixingAll(false);
        }
    };

    return (
        <div className="h-full bg-[#272a33] rounded-lg flex flex-col min-h-0 border border-[#3a3d46]">
            <div className="flex border-b border-[#3a3d46] text-gray-400 flex-shrink-0">
            {tabs.map(tab => (
                <button 
                    key={tab.id} 
                    onClick={() => onTabClick(tab.id)} 
                    title={tab.title}
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
                        ? (
                             <div>
                                {problemsForActiveFile.length > 1 && (
                                    <div className="mb-4 pb-2 border-b border-slate-700 font-sans">
                                        <button
                                            onClick={handleFixAll}
                                            disabled={isFixingAll}
                                            title={`Use Gemini to fix all errors in ${activeFileName}`}
                                            className="px-2 py-1 text-xs bg-sky-800 hover:bg-sky-700 text-sky-200 rounded-md flex items-center space-x-1"
                                        >
                                            {isFixingAll ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <SparklesIcon className="w-4 h-4" />}
                                            <span>{isFixingAll ? 'Fixing All...' : `✨ Fix All ${problemsForActiveFile.length} Problems in ${activeFileName}`}</span>
                                        </button>
                                        {fixAllError && <div className="mt-2 text-xs text-amber-500">{fixAllError}</div>}
                                    </div>
                                )}
                                {problems.map((p, i) => {
                                    const fileName = fileSystem[p.fileId]?.name || 'Unknown File';
                                    return (
                                        <div key={`${p.fileId}-${p.line}-${i}`} className="mb-2">
                                             <div className="text-xs text-slate-400 mb-1 font-sans">{fileName}</div>
                                            <div className="text-red-400 flex items-start">
                                                <span className="w-10 text-right pr-2 text-gray-500 flex-shrink-0 pt-0.5">{p.line}</span>
                                                <div className="flex-grow">
                                                    <span className="pt-0.5 block whitespace-pre-wrap break-words break-all">{p.message}</span>
                                                    <AIFixComponent problem={p} onApplyFix={onApplyFix} />
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )
                        : <div>No problems detected.</div>
                )}
                {activeTabId === 'guide' && <LanguageGuide activeLanguage={activeLanguage} />}
            </div>
        </div>
    );
}
