import React from 'react';
import type { FileSystemTree } from '../../game/types';
import { PythonGuide } from './PythonGuide';
import { JavaScriptGuide } from './JavaScriptGuide';
import { UniversalGuide } from './UniversalGuide';


interface LanguageGuideProps {
    fileSystem: FileSystemTree;
    openTabs: string[];
    activeTabId: string;
}

const getLangInfo = (fileName: string = '') => {
    const ext = fileName.split('.').pop() || '';
    switch (ext) {
        case 'py': return { name: 'Python', guide: <PythonGuide /> };
        case 'js': return { name: 'JavaScript', guide: <JavaScriptGuide /> };
        default: return { name: 'Universal', guide: <UniversalGuide /> };
    }
}

export const LanguageGuide: React.FC<LanguageGuideProps> = ({ fileSystem, openTabs, activeTabId }) => {
    const activeFile = fileSystem[activeTabId];
    const { guide: activeGuide } = getLangInfo(activeFile?.name);
    
    const openLangs = [...new Set(openTabs
        .map(id => fileSystem[id] ? getLangInfo(fileSystem[id].name).name : null)
        .filter(lang => lang && lang !== 'Universal')
    )];

    return (
     <div className="font-sans">
        {openLangs.length > 1 && (
            <div className="p-2 bg-slate-700/50 rounded-md mb-4 text-xs text-slate-300 border border-slate-600">
                You have multiple languages open: <span className="font-semibold text-white">{openLangs.join(', ')}</span>. 
                <br/>The guide below is for your active file: <strong className="text-white">{activeFile?.name || 'None'}</strong>.
            </div>
        )}
        {activeGuide}
    </div>
    );
};
