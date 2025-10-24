import React from 'react';
import { AIGuide } from './api/AIGuide';
import { WorldGuide } from './api/WorldGuide';
import { PhysicsGuide } from './api/PhysicsGuide';
import { SoundGuide } from './api/SoundGuide';
import { GuideSection, CodeLine } from './api/SharedComponents';

export const PythonGuide: React.FC = () => (
     <div className="text-gray-400 space-y-5 p-1">
        <div className="p-3 bg-slate-800 rounded-md mb-6 border border-slate-700">
             <h2 className="font-bold text-white font-sans text-base mb-1">Python Engine Guide</h2>
             <p className="text-slate-300 font-sans text-xs">This runs real Python code via Pyodide (WASM). The engine provides special global libraries like `ai` and `world`—no import needed!</p>
        </div>

        <GuideSection title="Printing to Console">
             <CodeLine comment="Use Python's built-in print() function.">
                print(<span className="token-string">"Hello, Console!"</span>)
            </CodeLine>
             <CodeLine comment="F-strings are supported for dynamic messages.">
                print(f<span className="token-string">"Sprite { '{bot.name}' } is at ({ '{bot.x}' }, { '{bot.y}' })."</span>)
            </CodeLine>
        </GuideSection>

        <AIGuide />
        <WorldGuide />
        <PhysicsGuide />
        <SoundGuide />
    </div>
);