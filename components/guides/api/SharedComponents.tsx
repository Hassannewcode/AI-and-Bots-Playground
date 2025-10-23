import React from 'react';

export const CodeLine: React.FC<{ children: React.ReactNode, comment?: string }> = ({ children, comment }) => (
    <div className="mb-2">
        {comment && <p className="text-gray-500 text-xs mb-1 font-sans"># {comment}</p>}
        <div className="bg-[#1e2026] p-2 rounded-md">
            <p className="text-gray-300 font-mono text-xs whitespace-pre-wrap">{children}</p>
        </div>
    </div>
);

export const GuideSection: React.FC<{ title: string, children: React.ReactNode }> = ({ title, children }) => (
    <div className="mb-5">
        <h3 className="text-sm font-bold text-white mb-2 font-sans uppercase tracking-wider text-teal-400">{title}</h3>
        <div className="border-l-2 border-gray-700 pl-4 space-y-3">
            {children}
        </div>
    </div>
);
