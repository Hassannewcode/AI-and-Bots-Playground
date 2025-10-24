import type { FileSystemTree, Problem, FileSystemNode } from '../game/types';
import type { ContextPackage } from './types';

interface AppState {
    fileSystem: FileSystemTree;
    openTabs: string[];
    activeTabId: string;
    logs: string[];
    problems: Problem[];
}

const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = (reader.result as string).split(',')[1];
            resolve(base64String);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

export async function buildContextPackage(appState: AppState): Promise<ContextPackage> {
    const { fileSystem, openTabs, activeTabId, logs, problems } = appState;

    const activeFile = fileSystem[activeTabId];
    const activeEditorContent = activeFile?.type === 'file' ? activeFile.code : null;

    const allOpenFilesContent = openTabs
        .map(id => fileSystem[id])
        .filter((node): node is FileSystemNode & { type: 'file' } => !!node && node.type === 'file' && node.status !== 'deleted')
        .map(file => ({ name: file.name, content: file.code }));

    // Capture screenshot
    let screenshotBase64: string | null = null;
    try {
        const gamePanel = document.getElementById('game-panel');
        if (gamePanel && (window as any).html2canvas) {
            const canvas = await (window as any).html2canvas(gamePanel);
            const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.8));
            if (blob) {
                screenshotBase64 = await blobToBase64(blob);
            }
        }
    } catch (e) {
        console.error("Screenshot capture failed:", e);
    }

    return {
        fileSystem,
        openTabIds: openTabs,
        activeTabId,
        activeEditorContent,
        allOpenFilesContent,
        consoleLogs: logs,
        problems,
        screenshotBase64,
    };
}


export function formatContextForPrompt(context: ContextPackage): string {
    const { fileSystem, allOpenFilesContent, activeEditorContent, activeTabId, consoleLogs, problems } = context;

    const activeFile = fileSystem[activeTabId];

    const fileTree = Object.values(fileSystem)
        .filter(f => f.status !== 'deleted' && f.name !== 'root')
        .map(f => f.type === 'folder' ? `- ${f.name}/` : `- ${f.name}`)
        .join('\n');

    const openFilesText = allOpenFilesContent.map(file => 
        `--- File: ${file.name} ---\n\`\`\`\n${file.content}\n\`\`\`\n`
    ).join('\n');

    const consoleText = consoleLogs.slice(-10).join('\n');
    const problemsText = problems.map(p => `File: ${fileSystem[p.fileId]?.name || p.fileId}, Line: ${p.line}, Error: ${p.message}`).join('\n');

    return `
<CONTEXT>
## File System
${fileTree}

## Open Files
${openFilesText}

## Active File
${activeFile?.name || 'None'}

## Recent Console Logs (Last 10)
${consoleText || 'No logs.'}

## Current Problems
${problemsText || 'No problems.'}
</CONTEXT>
    `.trim();
}
