import React from 'react';
import { GuideSection, CodeLine } from './SharedComponents';

export const SoundGuide: React.FC = () => (
    <GuideSection title="The 'sound' Library">
        <CodeLine comment="Creates a visual sound wave effect at a specific x, y coordinate.">
            sound.play(x=<span className="token-number">50</span>, y=<span className="token-number">50</span>)
        </CodeLine>
         <CodeLine comment="Can also use sprite variables for dynamic positioning.">
            sound.play(x=<span className="token-variable">bot.x</span>, y=<span className="token-variable">bot.y</span>)
        </CodeLine>
    </GuideSection>
);
