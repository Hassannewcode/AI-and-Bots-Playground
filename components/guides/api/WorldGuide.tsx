import React from 'react';
import { GuideSection, CodeLine } from './SharedComponents';

export const WorldGuide: React.FC = () => (
    <GuideSection title="The 'world' Library">
        <CodeLine comment="Sets the background color of the simulation panel using a hex code.">
            world.set_background(color=<span className="token-string">"#0f172a"</span>)
        </CodeLine>
         <div className="text-xs font-sans p-2 bg-slate-800/50 rounded-md border border-slate-700">
            <p className="font-bold text-slate-300">Defining Props (Walls, Rocks)</p>
            <p className="mt-1 text-slate-400">
                Static props are now defined declaratively in the <code className="bg-slate-900 text-white px-1 rounded-sm">world.html</code> file. Add `div` elements with the class `prop` and use `data-shape` and inline styles to configure them.
            </p>
        </div>
    </GuideSection>
);