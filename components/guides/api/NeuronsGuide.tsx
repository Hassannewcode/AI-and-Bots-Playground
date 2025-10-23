import React from 'react';
import { GuideSection, CodeLine } from './SharedComponents';

export const NeuronsGuide: React.FC = () => (
    <GuideSection title="The 'neurons' Library">
        <CodeLine comment="Initializes a neural network for a specific sprite, enabling rewards.">
            neurons.create_network(sprite=<span className="token-variable">bot</span>)
        </CodeLine>
         <CodeLine comment="Provides a positive or negative reward value to the sprite's network.">
            neurons.reward(sprite=<span className="token-variable">bot</span>, value=<span className="token-number">1</span>)
        </CodeLine>
        <CodeLine comment="Negative rewards are also possible.">
            neurons.reward(sprite=<span className="token-variable">bot</span>, value=<span className="token-number">-0.5</span>)
        </CodeLine>
    </GuideSection>
);
