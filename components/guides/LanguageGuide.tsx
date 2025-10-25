

import React from 'react';
import { PythonGuide } from './PythonGuide';
import { JavaScriptGuide } from './JavaScriptGuide';
import { GenericGuide } from './GenericGuide';
import { UniversalGuide } from './UniversalGuide';
import { CompiledLanguageGuide } from './HtmlGuide';

interface LanguageGuideProps {
    activeLanguage: string;
}

export const LanguageGuide: React.FC<LanguageGuideProps> = ({ activeLanguage }) => {
    
    const renderGuide = () => {
        switch (activeLanguage) {
            case 'py':
                return <PythonGuide />;
            case 'js':
            case 'jsx':
            case 'ts':
            case 'tsx':
                return <JavaScriptGuide />;
            case 'md':
            case 'html':
                 return <UniversalGuide />;
            case 'c':
            case 'cpp':
            case 'cs':
            case 'dart':
            case 'go':
            case 'java':
            case 'kt':
            case 'rs':
            case 'scala':
            case 'swift':
                return <CompiledLanguageGuide language={activeLanguage} />;
            default:
                return <GenericGuide language={activeLanguage} />;
        }
    };

    return (
         <div className="font-sans">
            {renderGuide()}
        </div>
    );
};