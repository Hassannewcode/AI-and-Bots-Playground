

import React from 'react';

interface GenericGuideProps {
    language: string;
}

export const GenericGuide: React.FC<GenericGuideProps> = ({ language }) => (
    <div className="text-gray-400 space-y-5 p-1 font-sans">
        <div className="p-3 bg-slate-800 rounded-md border border-slate-700">
            <h2 className="font-bold text-white text-base mb-1">
                Editing a <span className="uppercase text-teal-400">{language}</span> file
            </h2>
            <p className="text-slate-300 text-xs mt-2">
                This IDE provides syntax highlighting for many languages, including <span className="font-semibold text-white uppercase">{language}</span>.
            </p>
            <p className="text-slate-300 text-xs mt-2">
                A simulated execution environment is available for popular languages like Python, JavaScript, C#, and Rust. For other file types, you can still use the full-featured editor.
            </p>
        </div>
    </div>
);