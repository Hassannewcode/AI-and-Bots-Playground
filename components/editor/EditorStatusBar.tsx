import React from 'react';

interface EditorStatusBarProps {
    language: string;
    cursorPosition: { line: number; column: number };
}

export const EditorStatusBar: React.FC<EditorStatusBarProps> = ({ language, cursorPosition }) => {
    const langMap: Record<string, string> = {
        py: 'Python',
        js: 'JavaScript',
        jsx: 'JavaScript React',
        ts: 'TypeScript',
        tsx: 'TypeScript React',
        html: 'HTML',
        css: 'CSS',
        md: 'Markdown',
        c: 'C',
        cpp: 'C++',
        cs: 'C#',
        java: 'Java',
        rs: 'Rust',
        go: 'Go',
    };
    const langName = langMap[language] || language.toUpperCase();

    return (
        <div className="h-6 bg-[#1e2026] flex items-center justify-end px-4 text-xs text-gray-400 font-sans space-x-6 flex-shrink-0 border-t border-[#3a3d46]">
            <span>Ln {cursorPosition.line}, Col {cursorPosition.column}</span>
            <button className="hover:text-white transition-colors">{langName}</button>
        </div>
    );
};
