

import React from 'react';

export const UniversalGuide: React.FC = () => (
    <div className="text-gray-400 space-y-5 p-1 font-sans">
        <div className="p-3 bg-slate-800 rounded-md border border-slate-700">
             <h2 className="font-bold text-white font-sans text-base mb-1">Universal Engine Guide</h2>
             <p className="text-slate-300 font-sans text-xs">This IDE allows you to control sprites using different programming languages and build your world with HTML.</p>
        </div>
         <div className="p-3">
            <h3 className="font-bold text-teal-400 mb-2">How It Works</h3>
            <ol className="list-decimal list-inside text-xs space-y-3">
                <li>
                    <span className="font-semibold text-white">Design Your World in HTML:</span>
                    <p className="text-slate-400 mt-1 pl-2">
                        Open <code className="bg-slate-700 text-white px-1 rounded">world.html</code>. Add `div` elements with `class="prop"` to create static objects like walls and rocks. Use `data-shape` and inline `style` attributes to define their appearance and position.
                    </p>
                </li>
                <li>
                     <span className="font-semibold text-white">Script Sprites in Python or JS:</span>
                     <p className="text-slate-400 mt-1 pl-2">
                        Select a code file (e.g., <code className="bg-slate-700 text-white px-1 rounded">main.py</code> or a `.js` file). The guide will automatically update to show you the correct syntax for scripting sprite behavior.
                    </p>
                </li>
                 <li>
                     <span className="font-semibold text-white">Run the Simulation:</span>
                     <p className="text-slate-400 mt-1 pl-2">
                        Click "Run This File" to see your world and sprites come to life. The engine first builds the world from your HTML, then executes your script.
                    </p>
                </li>
            </ol>
        </div>
    </div>
);