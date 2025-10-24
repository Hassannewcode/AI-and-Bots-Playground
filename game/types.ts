import type { CSSProperties } from 'react';

export interface Prop {
  id: string;
  shape: 'wall' | 'rock';
  x: number;
  y: number;
  width: number;
  height: number;
  styles: CSSProperties;
  color?: string;
}

export interface Sprite {
  id:string;
  name: string;
  shape: 'cube' | 'skull' | 'user' | 'smiley';
  x: number; // Position as a percentage (0-100)
  y: number; // Position as a percentage (0-100)
  vx: number; // Velocity x
  vy: number; // Velocity y
  rotation: number; // Angle in degrees
  styles: CSSProperties;
  data: Record<string, string | number>;
  message?: {
    text: string;
    duration: number;
  };
  chatHistory?: { role: 'user' | 'model'; parts: { text: string }[] }[];
  brain?: {
      rewards: number;
  };
}

export type GameEffect = 
    | { id: string; type: 'soundwave'; x: number; y: number; creationTime: number; maxRadius: number; duration: number; }
    | { id: string; type: 'rewardflash'; spriteId: string; creationTime: number; duration: number; };

export interface Zone {
    id: string;
    name: string;
    x: number;
    y: number;
    width: number;
    height: number;
    color: string;
}

export interface WorldState {
    backgroundColor: string;
    zones: Zone[];
}

export interface GameState {
  sprites: Sprite[];
  props: Prop[];
  effects: GameEffect[];
  physics: {
    gravity: number;
  };
  worldState: WorldState;
}

export interface Problem {
  fileId: string;
  line: number;
  message: string;
  code: string;
  language: string;
}

// Defines a single operation for the runner to execute
export type ExecutionStep = 
  | { type: 'CREATE_SPRITE', sprite: Sprite, duration: 0 }
  | { type: 'CREATE_PROP', prop: Prop, duration: 0 }
  | { type: 'DELETE_SPRITE', spriteId: string, duration: 0 }
  | { type: 'MOVE_TO', spriteId: string, x: number, y: number, duration: number }
  | { type: 'SAY', spriteId: string, message: string, duration: number }
  | { type: 'CLEAR_MESSAGE', spriteId: string, duration: 0 }
  | { type: 'SET_STYLE', spriteId: string, property: string, value: string, duration: number }
  | { type: 'SET_DATA', spriteId: string, key: string, value: string | number, duration: 0 }
  | { type: 'LOG', message: string, duration: 0 }
  | { type: 'CLEAR_LOG', duration: 0 }
  | { type: 'WAIT', duration: number }
  | { type: 'AI_CHAT_REQUEST', spriteId: string, message: string, duration: 0 }
  // Physics and World Interaction
  | { type: 'SET_GRAVITY', strength: number, duration: 0 }
  | { type: 'ROTATE_TO', spriteId: string, angle: number, duration: number }
  | { type: 'LOOK_AT', spriteId: string, x: number, y: number, duration: number }
  | { type: 'PLAY_SOUND', x: number, y: number, duration: 0 }
  // World Building
  | { type: 'SET_BACKGROUND', color: string, duration: 0 }
  // AI & Neurons (now part of Sprite)
  | { type: 'SPRITE_CREATE_NETWORK', spriteId: string, duration: 0 }
  | { type: 'SPRITE_REWARD', spriteId: string, value: number, duration: 0 }
  | { type: 'GO_TO', spriteId: string, x: number, y: number, duration: number };


export interface ExecutionResult {
  newState: GameState;
  logs: string[];
  problems: Problem[];
  executedLines: number;
  steps: ExecutionStep[];
}


// File System Types
export type FileSystemNode = 
  | { id: string; name: string; type: 'file'; parentId: string; code: string; status?: 'active' | 'deleted'; deletionTime?: number; }
  | { id: string; name: string; type: 'folder'; parentId?: string; children: string[]; status?: 'active' | 'deleted'; deletionTime?: number; };

export interface FileSystemTree {
  [id: string]: FileSystemNode;
}

// Autocomplete Types
export type SuggestionType = 'class' | 'method' | 'param' | 'library' | 'variable' | 'keyword' | 'function';
export interface Suggestion {
  label: string;
  type: SuggestionType;
  detail?: string;
}

// Layout Engine Types
export type PanelComponentKey = 
  | 'FileTreePanel' 
  | 'EditorPanel' 
  | 'TabbedOutputPanel' 
  | 'PrimaryDisplayPanel' 
  | 'InfoCardListPanel' 
  | 'UserDetailsPanel' 
  | 'ActionButtonsPanel'
  | 'AIChatPanel';

export interface PanelLayout {
  left: PanelComponentKey[];
  middle: PanelComponentKey[];
  right: PanelComponentKey[];
}