import React from 'react';

interface SnippetProps {
    code: string;
    description: string;
}

const Snippet: React.FC<SnippetProps> = ({ code, description }) => (
  <div>
    <p className="text-gray-400 text-[11px] font-semibold">{description}</p>
    <pre className="bg-[#1e2026] p-1.5 rounded-sm text-cyan-300 text-[11px] font-mono mt-1 whitespace-pre-wrap">
      <code>{code}</code>
    </pre>
  </div>
);

export const ToolboxPanel: React.FC = () => (
    <div className="h-[220px] flex-shrink-0 bg-[#272a33] rounded-sm p-2 flex flex-col space-y-2 border border-[#3a3d46] overflow-y-auto">
        <h2 className="text-gray-400 font-semibold text-xs uppercase tracking-wider">Toolbox</h2>
        <div className="space-y-3 text-xs">
            <Snippet 
                description="Create Sprite"
                code={`bot = ai.create_sprite(name="MyBot")`}
            />
            <Snippet 
                description="Move Sprite (in ms)"
                code={`bot.move_to(x=80, y=50, speed=1500)`}
            />
            <Snippet 
                description="Say Message (in ms)"
                code={`bot.say(message="Hi!", duration=2000)`}
            />
             <Snippet 
                description="Set Custom Data"
                code={`bot.set_data(key="hp", value=100)`}
            />
             <Snippet 
                description="Pause Execution (in ms)"
                code={`ai.wait(1000)`}
            />
        </div>
    </div>
);
