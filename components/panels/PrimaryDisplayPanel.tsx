

import React from 'react';
import type { GameState, Sprite } from '../../game/types';
import { getIconForShape, SpeakerWaveIcon, SpeakerXMarkIcon, ShareIcon, ArrowsPointingOutIcon } from '../icons';

interface PrimaryDisplayPanelProps {
    controls: { id: string; icon: React.ReactNode; onClick: () => void; isPrimary?: boolean; disabled?: boolean; }[];
    currentFrame: number;
    totalFrames: number;
    gameState: GameState;
    onMuteToggle: () => void;
    isMuted: boolean;
    onShare: () => void;
    onFullscreen: () => void;
}

const SpriteComponent: React.FC<{ sprite: Sprite, isRewardFlashing: boolean }> = ({ sprite, isRewardFlashing }) => (
    <div 
        key={sprite.id} 
        style={{ 
            position: 'absolute', 
            left: `${sprite.x}%`, 
            top: `${sprite.y}%`, 
            transform: `translate(-50%, -50%) rotate(${sprite.rotation || 0}deg)`,
            ...sprite.styles,
        }}
        title={sprite.name}
    >
        {sprite.message && (
            <div 
                className="absolute bottom-full mb-2 w-max max-w-xs bg-white text-black text-xs font-semibold rounded py-1 px-2 shadow-lg z-10"
                style={{ animation: `fadeInOut ${sprite.message.duration / 1000}s ease-in-out forwards` }}
            >
                {sprite.message.text}
            </div>
        )}
        <div className={isRewardFlashing ? 'reward-flash-animation' : ''}>
             {getIconForShape(sprite.shape, 'w-12 h-12')}
        </div>
    </div>
);

export const PrimaryDisplayPanel: React.FC<PrimaryDisplayPanelProps> = ({ 
    controls, currentFrame, totalFrames, gameState, onMuteToggle, isMuted, onShare, onFullscreen 
}) => {
    // FIX: Used flatMap for robust, type-safe filtering and mapping of effects.
    const rewardEffectSpriteIds = new Set(
        gameState.effects.flatMap(e => (e.type === 'rewardflash' ? [e.spriteId] : []))
    );

    return (
      <div id="game-panel" className="flex-grow bg-[#272a33] rounded-lg flex flex-col border border-[#3a3d46]">
        <div className="flex-grow m-1 rounded-sm relative overflow-hidden" style={{ backgroundColor: gameState.worldState.backgroundColor }}>
            {gameState.effects.map(effect => {
                if (effect.type === 'soundwave') {
                    const progress = (Date.now() - effect.creationTime) / effect.duration;
                    return (
                        <div 
                            key={effect.id}
                            className="absolute rounded-full border-2 border-cyan-400"
                            style={{
                                left: `${effect.x}%`,
                                top: `${effect.y}%`,
                                width: `${effect.maxRadius * 2 * progress}%`,
                                height: `${effect.maxRadius * 2 * progress}%`,
                                opacity: 1 - progress,
                                transform: 'translate(-50%, -50%)',
                            }}
                        />
                    );
                }
                return null;
            })}
           {gameState.props.map(prop => (
                <div
                    key={prop.id}
                    style={{
                        position: 'absolute',
                        left: `${prop.x}%`,
                        top: `${prop.y}%`,
                        width: `${prop.width}%`,
                        height: `${prop.height}%`,
                        transform: 'translate(-50%, -50%)',
                        ...prop.styles,
                    }}
                    title={prop.shape}
                />
           ))}
           {gameState.sprites.map(sprite => (
               <SpriteComponent key={sprite.id} sprite={sprite} isRewardFlashing={rewardEffectSpriteIds.has(sprite.id)} />
            ))}
        </div>
        <div className="h-10 flex items-center px-4 space-x-4 border-t border-[#3a3d46] text-gray-400">
          {controls.map(control => (
            <button 
                key={control.id} 
                onClick={control.onClick} 
                disabled={control.disabled}
                className={`${control.isPrimary ? 'text-white' : ''} hover:text-white disabled:text-gray-600 disabled:cursor-not-allowed transition-colors`}
                title={control.id.charAt(0).toUpperCase() + control.id.slice(1)}
            >
              {control.icon}
            </button>
          ))}
          <span className="text-sm font-mono">{String(currentFrame).padStart(3, '0')}/{String(totalFrames).padStart(3, '0')}</span>
          <div className="flex-grow"></div>
          <button onClick={onMuteToggle} className="hover:text-white transition-colors" title={isMuted ? "Unmute" : "Mute"}>
            {isMuted ? <SpeakerXMarkIcon /> : <SpeakerWaveIcon />}
          </button>
          <button onClick={onShare} className="hover:text-white transition-colors" title="Share Code"><ShareIcon /></button>
          <button onClick={onFullscreen} className="hover:text-white transition-colors" title="Toggle Fullscreen"><ArrowsPointingOutIcon /></button>
        </div>
      </div>
    );
};