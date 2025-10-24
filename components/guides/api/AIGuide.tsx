import React from 'react';
import { GuideSection, CodeLine } from './SharedComponents';

export const AIGuide: React.FC = () => (
    <>
        <GuideSection title="The 'ai' Library">
             <CodeLine comment="Creates a new sprite and returns its instance.">
                <span className="token-variable">bot</span> = ai.Sprite(name=<span className="token-string">"B-101"</span>, shape=<span className="token-string">"user"</span>, x=<span className="token-number">10</span>, y=<span className="token-number">10</span>)
            </CodeLine>
            <CodeLine comment="Available shapes: 'cube', 'skull', 'user', 'smiley'.">
                <span className="token-variable">foe</span> = ai.Sprite(name=<span className="token-string">"Menace"</span>, shape=<span className="token-string">"skull"</span>)
            </CodeLine>
            <CodeLine comment="Pauses the simulation for a number of seconds.">
                ai.wait(<span className="token-number">1.5</span>)
            </CodeLine>
        </GuideSection>
        <GuideSection title="Sprite Methods">
            <CodeLine comment="Move instantly to a new position using pathfinding logic. Duration is in seconds.">
                <span className="token-variable">bot</span>.go_to(x=<span className="token-number">80</span>, y=<span className="token-number">25</span>, speed=<span className="token-number">2.5</span>)
            </CodeLine>
            <CodeLine comment="Move in a straight line to a new position. Duration is in seconds.">
                <span className="token-variable">bot</span>.move_to(x=<span className="token-number">80</span>, y=<span className="token-number">25</span>, speed=<span className="token-number">1</span>)
            </CodeLine>
            <CodeLine comment="Rotate to an absolute angle (in degrees). Duration is in seconds.">
                <span className="token-variable">bot</span>.rotate_to(angle=<span className="token-number">90</span>, speed=<span className="token-number">1</span>)
            </CodeLine>
            <CodeLine comment="Automatically rotate to face a target coordinate. Duration is in seconds.">
                <span className="token-variable">bot</span>.look_at(x=<span className="token-variable">target.x</span>, y=<span className="token-variable">target.y</span>, speed=<span className="token-number">0.5</span>)
            </CodeLine>
            <CodeLine comment="Display a message bubble for a duration in seconds.">
                <span className="token-variable">bot</span>.say(message=<span className="token-string">"Hello, world!"</span>, duration=<span className="token-number">3</span>)
            </CodeLine>
            <CodeLine comment="Send a message to another sprite to trigger a Gemini chat response.">
                <span className="token-variable">bot</span>.chat(message=<span className="token-string">"What is our objective?"</span>)
            </CodeLine>
             <CodeLine comment="Initializes a neural network for this sprite, enabling rewards.">
                <span className="token-variable">bot</span>.create_network()
            </CodeLine>
             <CodeLine comment="Provides a positive or negative reward value to the sprite's network.">
                <span className="token-variable">bot</span>.reward(value=<span className="token-number">1</span>)
            </CodeLine>
        </GuideSection>
    </>
);