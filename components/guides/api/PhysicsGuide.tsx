import React from 'react';
import { GuideSection, CodeLine } from './SharedComponents';

export const PhysicsGuide: React.FC = () => (
    <GuideSection title="The 'physics' Library">
        <CodeLine comment="Sets the gravitational pull for all sprites. Positive values pull down.">
            physics.set_gravity(strength=<span className="token-number">0.005</span>)
        </CodeLine>
    </GuideSection>
);
