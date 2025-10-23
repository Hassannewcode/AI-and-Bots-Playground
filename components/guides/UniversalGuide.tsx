
import React from 'react';
import { AIGuide } from './api/AIGuide';
import { WorldGuide } from './api/WorldGuide';
import { PhysicsGuide } from './api/PhysicsGuide';
import { SoundGuide } from './api/SoundGuide';
import { NeuronsGuide } from './api/NeuronsGuide';
import { GuideSection, CodeLine } from './api/SharedComponents';

export const UniversalGuide: React.FC = () => (
     <div className="text-gray-400 space-y-5 p-1">
        <div className="p-3 bg-slate-800 rounded-md mb-6 border border-slate-700">
             <h2 className="font-bold text-white font-sans text-base mb-1">Universal Engine Guide</h2>
             <p className="text-slate-300 font-sans text-xs">This engine uses a universal API that works in any language. The parser looks for the command structure (e.g., `ai.Sprite(...)`), not specific language syntax. <br/><strong class="text-white">You must import libraries before using them.</strong></p>
        </div>
        
        <GuideSection title="Setup & Imports">
            <CodeLine comment="The engine uses a universal import syntax.">
                <span className="token-keyword">import</span> ai, world
            </CodeLine>
        </GuideSection>

        <GuideSection title="Printing to Console">
             <CodeLine comment="Use your language's standard print function.">
                print(<span className="token-string">"Hello, Console!"</span>)
            </CodeLine>
        </GuideSection>
        
        <AIGuide />
        <WorldGuide />
        <PhysicsGuide />
        <SoundGuide />
        <NeuronsGuide />
    </div>
);
