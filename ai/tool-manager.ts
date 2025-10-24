import { produce } from 'immer';
import { nanoid } from 'nanoid';
import { GoogleGenAI, Type, FunctionDeclaration, Content, FunctionCall, Part } from '@google/genai';
import type { FileSystemTree, FileSystemNode } from '../game/types';

// Type for the callbacks to interact with App state
interface ToolHandlerCallbacks {
    getFileSystem: () => FileSystemTree;
    setFileSystem: (updater: (draft: FileSystemTree) => void) => void;
    onConfirm: (message: string) => Promise<boolean>;
    // FIX: Updated `setActiveTabId` to accept a value or an updater function, matching React's setState behavior.
    setActiveTabId: (updater: string | ((currentId: string) => string)) => void;
    setOpenTabs: (updater: (tabs: string[]) => string[]) => void;
}

// Helper to find a file by name
const findFileIdByName = (fileSystem: FileSystemTree, name: string): string | null => {
    const found = Object.values(fileSystem).find((node: FileSystemNode) => node.name === name && node.type === 'file' && node.status !== 'deleted');
    return found ? found.id : null;
};

// Tool Definitions
export const assistantTools: FunctionDeclaration[] = [
    {
        name: 'listAllFiles',
        description: 'List all non-deleted files and folders in the workspace explorer.',
        parameters: { type: Type.OBJECT, properties: {} }
    },
    {
        name: 'readFile',
        description: 'Reads the entire content of a specific file.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                fileName: { type: Type.STRING, description: 'The full name of the file to read, e.g., "main.py".' },
            },
            required: ['fileName']
        }
    },
    {
        name: 'createFile',
        description: 'Creates a new file in the root directory and opens it.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                fileName: { type: Type.STRING, description: 'The name for the new file, including extension, e.g., "utils.py".' },
                 fileContent: { type: Type.STRING, description: 'Optional initial content for the new file.' },
            },
            required: ['fileName']
        }
    },
    {
        name: 'deleteFile',
        description: 'Deletes a file from the workspace. This action requires user confirmation.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                fileName: { type: Type.STRING, description: 'The full name of the file to delete.' },
            },
            required: ['fileName']
        }
    },
    {
        name: 'renameFile',
        description: 'Renames a file.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                oldFileName: { type: Type.STRING, description: 'The current full name of the file.' },
                newFileName: { type: Type.STRING, description: 'The new full name for the file.' },
            },
            required: ['oldFileName', 'newFileName']
        }
    },
    {
        name: 'updateFile',
        description: 'Overwrites the entire content of a specific file with new code. Use this for significant changes or refactoring.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                fileName: { type: Type.STRING, description: 'The name of the file to edit.' },
                newCode: { type: Type.STRING, description: 'The new, complete code for the file.' },
            },
            required: ['fileName', 'newCode']
        }
    }
];

// Tool Handlers
export const getToolHandlers = (callbacks: ToolHandlerCallbacks) => ({
    listAllFiles: () => {
        const fileSystem = callbacks.getFileSystem();
        const files = Object.values(fileSystem).filter(f => f.status !== 'deleted').map(f => f.name === 'root' ? '' : (f.type === 'folder' ? `/${f.name}` : f.name)).filter(Boolean).join('\n');
        return { result: `Here are all the files in the workspace:\n${files}` };
    },
    readFile: ({ fileName }: { fileName: string }) => {
        const fileSystem = callbacks.getFileSystem();
        const fileId = findFileIdByName(fileSystem, fileName);
        const file = fileId ? fileSystem[fileId] as Extract<FileSystemNode, { type: 'file' }> : null;
        return file ? { result: file.code } : { result: `Error: File '${fileName}' not found.` };
    },
    createFile: ({ fileName, fileContent }: { fileName: string, fileContent?: string }) => {
        const fileSystem = callbacks.getFileSystem();
        if (findFileIdByName(fileSystem, fileName)) return { result: `Error: File '${fileName}' already exists.` };
        
        const newId = nanoid(8);
        const newCode = fileContent ?? `# New file: ${fileName}`;
        
        callbacks.setFileSystem(draft => {
            const parent = draft['root'] as Extract<FileSystemNode, {type: 'folder'}>;
            if (!parent || parent.type !== 'folder') return;
            
            const newNode: FileSystemNode = { id: newId, name: fileName, type: 'file', parentId: 'root', code: newCode, status: 'active' };
            draft[newId] = newNode;
            parent.children.push(newId);
        });
        
        callbacks.setOpenTabs(tabs => [...tabs, newId]);
        callbacks.setActiveTabId(newId);

        return { result: `File '${fileName}' created and opened successfully.` };
    },
    renameFile: ({ oldFileName, newFileName }: { oldFileName: string, newFileName: string }) => {
        const fileSystem = callbacks.getFileSystem();
        const fileId = findFileIdByName(fileSystem, oldFileName);
        if (!fileId) return { result: `Error: File '${oldFileName}' not found.` };
        if (findFileIdByName(fileSystem, newFileName)) return { result: `Error: A file named '${newFileName}' already exists.` };
        
        callbacks.setFileSystem(draft => { draft[fileId].name = newFileName; });
        return { result: `Renamed '${oldFileName}' to '${newFileName}'.` };
    },
    updateFile: ({ fileName, newCode }: { fileName: string, newCode: string }) => {
        const fileSystem = callbacks.getFileSystem();
        const fileId = findFileIdByName(fileSystem, fileName);
        if (!fileId) return { result: `Error: File '${fileName}' not found.` };
        
        callbacks.setFileSystem(draft => {
            const file = draft[fileId] as Extract<FileSystemNode, {type: 'file'}>;
            file.code = newCode;
        });
        return { result: `Code updated in '${fileName}'.` };
    },
    deleteFile: async ({ fileName }: { fileName: string }) => {
        const fileSystem = callbacks.getFileSystem();
        const fileId = findFileIdByName(fileSystem, fileName);
        if (!fileId) return { result: `Error: File '${fileName}' not found.` };

        const confirmed = await callbacks.onConfirm(`The AI assistant wants to delete "${fileName}". Are you sure?`);
        
        if (confirmed) {
             callbacks.setFileSystem(draft => {
                const item = draft[fileId];
                if (item) {
                    item.status = 'deleted';
                    item.deletionTime = Date.now();
                }
            });

            callbacks.setOpenTabs(currentOpenTabs => {
                return currentOpenTabs.filter(t => t !== fileId);
            });
            
            // This is a simplified active tab reset, might need improvement
            callbacks.setActiveTabId(currentActiveTabId => {
                 if(currentActiveTabId === fileId) {
                     const openFiles = Object.values(callbacks.getFileSystem()).filter(f => f.status !== 'deleted' && f.type === 'file');
                     return openFiles.length > 0 ? openFiles[0].id : '';
                 }
                 return currentActiveTabId;
            });
            return { result: `User confirmed. File '${fileName}' deleted.` };
        } else {
            return { result: 'User cancelled file deletion.' };
        }
    },
});