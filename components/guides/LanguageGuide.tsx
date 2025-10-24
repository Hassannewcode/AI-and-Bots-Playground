

import React from 'react';
import { PythonGuide } from './PythonGuide';
import { JavaScriptGuide } from './JavaScriptGuide';
import { GenericGuide } from './GenericGuide';
import { UniversalGuide } from './UniversalGuide';

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
                return <JavaScriptGuide />;
            case 'md':
            case 'html':
                 return <UniversalGuide />;
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