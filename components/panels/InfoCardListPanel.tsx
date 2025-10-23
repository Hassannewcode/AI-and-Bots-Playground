
import React from 'react';

interface Stat {
    id: string;
    value: string;
}

interface InfoCardProps {
    id: string;
    title: string;
    icon: React.ReactNode;
    stats: Stat[];
}

const InfoCard: React.FC<InfoCardProps> = ({ title, icon, stats }) => (
    <div className="bg-[#1e2026] rounded-md flex p-2 h-20 w-full text-left transition-colors">
        <div className="w-10 h-10 rounded-full flex-shrink-0 bg-[#272a33]">{icon}</div>
        <div className="ml-2 flex-grow overflow-hidden">
            <p className="font-bold text-white text-base leading-tight truncate">{title}</p>
            <div className="text-gray-400 text-xs space-y-0.5 mt-1">
                {stats.length > 0 
                    ? stats.map(stat => <div key={stat.id} className="truncate">{stat.value}</div>)
                    : <div className="text-gray-500">No data</div>
                }
            </div>
        </div>
    </div>
);

interface InfoCardListPanelProps {
    cards: InfoCardProps[];
}

export const InfoCardListPanel: React.FC<InfoCardListPanelProps> = ({ cards }) => (
    <div className="w-[180px] flex-shrink-0 bg-[#272a33] rounded-lg p-2 flex flex-col space-y-2 overflow-y-auto border border-[#3a3d46]">
        <h2 className="text-gray-400 mb-1 font-semibold text-xs uppercase tracking-wider px-1">Sprites</h2>
        {cards.length > 0 
            ? cards.map(card => <InfoCard key={card.id} {...card} />)
            : <div className="text-center text-gray-500 text-xs mt-4">No sprites in world.</div>
        }
    </div>
);
