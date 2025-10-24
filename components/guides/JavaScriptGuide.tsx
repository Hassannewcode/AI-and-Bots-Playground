import React from 'react';
import { GuideSection, CodeLine } from './api/SharedComponents';

const JS_AIGuide: React.FC = () => (
    <>
        <GuideSection title="The 'ai' Library">
             <CodeLine comment="Creates a new sprite and returns its instance.">
                <span className="token-keyword">const</span> <span className="token-variable">bot</span> = ai.Sprite({'{'} name: <span className="token-string">"J-5"</span>, shape: <span className="token-string">"user"</span>, x: <span className="token-number">10</span>, y: <span className="token-number">10</span> {'}'});
            </CodeLine>
            <CodeLine comment="Pauses the simulation for a number of seconds.">
                ai.wait({'{'} seconds: <span className="token-number">1.5</span> {'}'});
            </CodeLine>
        </GuideSection>
        <GuideSection title="Sprite Methods">
            <CodeLine comment="Move instantly to a new position using pathfinding logic. Duration is in seconds.">
                <span className="token-variable">bot</span>.go_to({'{'} x: <span className="token-number">80</span>, y: <span className="token-number">25</span>, speed: <span className="token-number">2.5</span> {'}'});
            </CodeLine>
            <CodeLine comment="Display a message bubble for a duration in seconds.">
                <span className="token-variable">bot</span>.say({'{'} message: <span className="token-string">"Hello, world!"</span>, duration: <span className="token-number">3</span> {'}'});
            </CodeLine>
            <CodeLine comment="Send a message to another sprite to trigger a Gemini chat response.">
                <span className="token-variable">bot</span>.chat({'{'} message: <span className="token-string">"What is our objective?"</span> {'}'});
            </CodeLine>
            <CodeLine comment="Initializes a neural network for this sprite.">
                <span className="token-variable">bot</span>.create_network();
            </CodeLine>
            <CodeLine comment="Provides a reward to the sprite's network.">
                <span className="token-variable">bot</span>.reward({'{'} value: <span className="token-number">1</span> {'}'});
            </CodeLine>
        </GuideSection>
    </>
);

const JS_WorldGuide: React.FC = () => (
    <GuideSection title="The 'world' Library">
        <CodeLine comment="Sets the background color of the simulation panel using a hex code.">
            world.set_background({'{'} color: <span className="token-string">"#0f172a"</span> {'}'});
        </CodeLine>
         <div className="text-xs font-sans p-2 bg-slate-800/50 rounded-md border border-slate-700">
            <p className="font-bold text-slate-300">Defining Props</p>
            <p className="mt-1 text-slate-400">
                Static props are now defined in <code className="bg-slate-900 text-white px-1 rounded-sm">world.html</code>.
            </p>
        </div>
    </GuideSection>
);

const JS_SoundGuide: React.FC = () => (
     <GuideSection title="The 'sound' Library">
        <CodeLine comment="Creates a visual sound wave effect at a specific x, y coordinate.">
            sound.play({'{'} x: <span className="token-number">50</span>, y: <span className="token-number">50</span> {'}'});
        </CodeLine>
    </GuideSection>
);


export const JavaScriptGuide: React.FC = () => (
     <div className="text-gray-400 space-y-5 p-1">
        <div className="p-3 bg-slate-800 rounded-md mb-6 border border-slate-700">
             <h2 className="font-bold text-white font-sans text-base mb-1">JavaScript Engine Guide</h2>
             <p className="text-slate-300 font-sans text-xs">Write standard JavaScript. The engine libraries (`ai`, `world`, etc.) are globally available and do not need to be imported.</p>
        </div>
        
        <GuideSection title="Printing to Console">
             <CodeLine comment="Use console.log() to print messages.">
                console.log(<span className="token-string">"Hello, Console!"</span>);
            </CodeLine>
             <CodeLine comment="Template literals are supported for dynamic messages.">
                console.log(`Sprite { <span className="token-variable">bot.name</span> } is at ({ <span className="token-variable">bot.x</span> }, { <span className="token-variable">bot.y</span> }).`);
            </CodeLine>
        </GuideSection>

        <JS_AIGuide />
        <JS_WorldGuide />
        <JS_SoundGuide />
    </div>
);