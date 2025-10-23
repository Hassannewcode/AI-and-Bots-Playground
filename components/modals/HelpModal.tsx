import React from 'react';

interface HelpModalProps {
    onClose: () => void;
}

const CodeLine: React.FC<{ children: React.ReactNode, comment?: string }> = ({ children, comment }) => (
    <div className="mb-1">
        {comment && <p className="text-gray-400 mb-1 text-xs"># {comment}</p>}
        <p className="text-gray-200">{children}</p>
    </div>
);


const HelpModal: React.FC<HelpModalProps> = ({ onClose }) => (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-[#272a33] rounded-lg shadow-lg p-6 w-full max-w-2xl text-gray-300 border border-[#3a3d46]" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-white mb-4">SpriteScript Guide</h2>
            <p className="mb-4">SpriteScript is a powerful language for creating animated scenes. See the <span className="font-semibold text-white">Guide</span> tab for the full reference.</p>
            <div className="font-mono text-sm space-y-4 bg-[#1e2026] p-4 rounded-md">
                 <div>
                    <CodeLine comment="Import the AI module (must be the first line).">
                        <span className="token-keyword">import</span> ai
                    </CodeLine>
                </div>
                 <div>
                    <CodeLine comment="Create a sprite and assign it to a variable.">
                        <span className="token-variable">my_bot</span> = ai.create_sprite(name=<span className="token-string">"B-101"</span>, shape=<span className="token-string">"user"</span>)
                    </CodeLine>
                </div>
                 <div>
                    <CodeLine comment="Store custom data on your sprite.">
                        <span className="token-variable">my_bot</span>.set_data(key=<span className="token-string">"hp"</span>, value=<span className="token-number">100</span>)
                    </CodeLine>
                </div>
                <div>
                    <CodeLine comment="Animate movement over 1.5 seconds (1500ms).">
                       <span className="token-variable">my_bot</span>.move_to(x=<span className="token-number">75</span>, y=<span className="token-number">50</span>, speed=<span className="token-number">1500</span>)
                    </CodeLine>
                </div>
                 <div>
                    <CodeLine comment="Make it talk for 3 seconds (3000ms).">
                        <span className="token-variable">my_bot</span>.say(message=<span className="token-string">"Hello, world!"</span>, duration=<span className="token-number">3000</span>)
                    </CodeLine>
                </div>
                <div>
                    <CodeLine comment="Animate a style change over 2 seconds.">
                        <span className="token-variable">my_bot</span>.set_style(property=<span className="token-string">"transform"</span>, value=<span className="token-string">"rotate(360deg)"</span>, duration=<span className="token-number">2000</span>)
                    </CodeLine>
                </div>
            </div>
            <button onClick={onClose} className="mt-6 w-full sm:w-auto bg-teal-600 hover:bg-teal-500 text-white font-bold py-2 px-4 rounded-md transition-colors">
                Got It
            </button>
        </div>
    </div>
);

export default HelpModal;