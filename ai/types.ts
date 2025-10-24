import type { FileSystemTree, Problem } from '../game/types';
import type { Content } from '@google/genai';

export type AIState = 'idle' | 'thinking' | 'executing_tools' | 'responding';

export type AIStateStatus = {
    state: AIState;
    message?: string;
};

export interface ContextPackage {
    fileSystem: FileSystemTree;
    openTabIds: string[];
    activeTabId: string;
    activeEditorContent: string | null;
    allOpenFilesContent: { name: string; content: string }[];
    consoleLogs: string[];
    problems: Problem[];
    screenshotBase64: string | null;
}
