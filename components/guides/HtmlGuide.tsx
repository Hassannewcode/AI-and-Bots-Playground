import React from 'react';
import { GuideSection, CodeLine } from './api/SharedComponents';

const CSharpExample: React.FC = () => (
    <>
        <h4 className="text-md font-semibold text-white mt-4 mb-2 font-sans">C# Example (Named Parameters)</h4>
        <CodeLine comment="var bot = new AI.Sprite(...);">
            var bot = new AI.Sprite(name: "CSharpBot", shape: "user", x: 10, y: 90);
        </CodeLine>
        <CodeLine>
            bot.go_to(x: 80, y: 20, speed: 2);
        </CodeLine>
        <CodeLine>
            bot.say(message: "Hello from C#!", duration: 3);
        </CodeLine>
    </>
);

const CppExample: React.FC = () => (
    <>
        <h4 className="text-md font-semibold text-white mt-4 mb-2 font-sans">C++ Example (Positional Parameters)</h4>
        <CodeLine comment="auto bot = ai::Sprite(...);">
            auto bot = ai::Sprite("CppBot", "user", 10, 90);
        </CodeLine>
        <CodeLine>
            bot->go_to(80, 20, 2);
        </CodeLine>
        <CodeLine>
            bot->say("Hello from C++!", 3);
        </CodeLine>
    </>
);

const RustExample: React.FC = () => (
    <>
        <h4 className="text-md font-semibold text-white mt-4 mb-2 font-sans">Rust Example (Positional Parameters)</h4>
        <CodeLine comment="let bot = ai::Sprite::new(...);">
            let bot = ai::Sprite::new("RustBot", "user", 10, 90);
        </CodeLine>
        <CodeLine>
            bot.go_to(80, 20, 2);
        </CodeLine>
        <CodeLine>
            bot.say("Hello from Rust!", 3);
        </CodeLine>
    </>
);

const JavaExample: React.FC = () => (
    <>
        <h4 className="text-md font-semibold text-white mt-4 mb-2 font-sans">Java Example (Positional Parameters)</h4>
        <CodeLine comment="Sprite bot = new AI.Sprite(...);">
            Sprite bot = new AI.Sprite("JavaBot", "user", 10, 90);
        </CodeLine>
        <CodeLine>
            bot.go_to(80, 20, 2);
        </CodeLine>
        <CodeLine>
            bot.say("Hello from Java!", 3);
        </CodeLine>
    </>
);

const GoExample: React.FC = () => (
    <>
        <h4 className="text-md font-semibold text-white mt-4 mb-2 font-sans">Go Example (Positional Parameters)</h4>
        <CodeLine comment="bot := ai.Sprite.New(...);">
            bot := ai.Sprite.New("GoBot", "user", 10, 90)
        </CodeLine>
        <CodeLine>
            bot.go_to(80, 20, 2)
        </CodeLine>
        <CodeLine>
            bot.say("Hello from Go!", 3)
        </CodeLine>
    </>
);


export const CompiledLanguageGuide: React.FC<{ language: string }> = ({ language }) => (
     <div className="text-gray-400 space-y-5 p-1">
        <div className="p-3 bg-slate-800 rounded-md mb-6 border border-slate-700">
             <h2 className="font-bold text-white font-sans text-base mb-1">AI-Powered <span className="uppercase">{language}</span> Execution</h2>
             <p className="text-slate-300 font-sans text-xs">This environment uses a powerful AI to transpile your {language} code into a runnable format. This allows you to use variables, loops, and conditional logic, which will be executed faithfully by the engine.</p>
        </div>
        <CSharpExample />
        <CppExample />
        <RustExample />
        <JavaExample />
        <GoExample />
    </div>
);