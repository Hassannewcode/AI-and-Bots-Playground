import React from 'react';
import { GuideSection, CodeLine } from './SharedComponents';

export const WorldGuide: React.FC = () => (
    <GuideSection title="The 'world' Library">
        <CodeLine comment="Sets the background color of the simulation panel using a hex code.">
            world.set_background(color=<span className="token-string">"#0f172a"</span>)
        </CodeLine>
        <CodeLine comment="Creates a named, colored zone on the map. Sprites can interact with zones in future updates.">
            world.create_zone(name=<span className="token-string">"goal"</span>, x=<span className="token-number">85</span>, y=<span className="token-number">90</span>, width=<span className="token-number">10</span>, height=<span className="token-number">10</span>, color=<span className="token-string">"#10b981"</span>)
        </CodeLine>
    </GuideSection>
);
