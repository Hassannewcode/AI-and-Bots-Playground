import { GoogleGenAI, FunctionDeclaration, Content, FunctionCall, Part } from '@google/genai';
import type { FileSystemTree, Problem } from '../game/types';
import type { AIStateStatus } from './types';
import { buildContextPackage, formatContextForPrompt } from './context-builder';
import { assistantTools, getToolHandlers } from './tool-manager';

interface AppStateForAI {
    fileSystem: FileSystemTree;
    openTabs: string[];
    activeTabId: string;
    logs: string[];
    problems: Problem[];
}

interface AssistantCallbacks {
    onStateChange: (state: AIStateStatus) => void;
    onHistoryChange: (updater: (history: Content[]) => Content[]) => void;
    onFileSystemChange: (updater: (draft: FileSystemTree) => void) => void;
    setOpenTabs: (updater: (tabs: string[]) => string[]) => void;
    setActiveTabId: (id: string) => void;
    onConfirm: (message: string) => Promise<boolean>;
}

interface RunAssistantTurnParams {
    message: string;
    history: Content[];
    appState: AppStateForAI;
    callbacks: AssistantCallbacks;
}

export async function runAssistantTurn(params: RunAssistantTurnParams): Promise<void> {
    const { message, history, appState, callbacks } = params;
    const { onStateChange, onHistoryChange } = callbacks;

    try {
        onStateChange({ state: 'thinking', message: 'Analyzing context...' });
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
        
        const contextPackage = await buildContextPackage(appState);
        const contextText = formatContextForPrompt(contextPackage);

        const userParts: Part[] = [{ text: `${contextText}\n\nUser message: ${message}` }];
        if (contextPackage.screenshotBase64) {
            userParts.push({ inlineData: { mimeType: 'image/jpeg', data: contextPackage.screenshotBase64 } });
        }
        
        const currentTurnUserContent: Content = { role: 'user', parts: userParts };
        const historyForApi = [...history.slice(0, -1), currentTurnUserContent];
        
        const toolHandlers = getToolHandlers({
            getFileSystem: () => appState.fileSystem, // Pass a getter to get the latest state
            setFileSystem: callbacks.onFileSystemChange,
            onConfirm: callbacks.onConfirm,
            setActiveTabId: callbacks.setActiveTabId,
            setOpenTabs: callbacks.setOpenTabs,
        });

        let runAgain = true;
        while (runAgain) {
            runAgain = false;

            const systemInstruction = `You are a world-class senior software engineer acting as an AI assistant in a web-based IDE. Your name is Coder.
You are helpful, concise, and an expert in multiple programming languages. You have been provided with the user's complete workspace context, including file system, open files, console logs, and a screenshot of the app's preview panel.
You can read, create, and modify files by calling the provided functions.
When asked to delete a file, you MUST call the 'deleteFile' function, which will prompt the user for confirmation.
Before modifying a file, it's a good practice to read it first to understand its contents. Use 'updateFile' to overwrite entire files.
Do not ask for confirmation for actions unless it is for a destructive action like deleting a file. Just perform the action.`;

            const result = await ai.models.generateContent({
                model: 'gemini-2.5-pro',
                contents: historyForApi,
                config: {
                    systemInstruction: systemInstruction,
                    tools: [{ functionDeclarations: assistantTools }],
                },
            });

            const responseContent = result.candidates?.[0]?.content;
            if (!responseContent) throw new Error("Received an invalid response from the AI.");

            onHistoryChange(prev => [...prev, responseContent]);
            historyForApi.push(responseContent);

            const functionCalls: FunctionCall[] = responseContent.parts
                .filter((p): p is { functionCall: FunctionCall } => !!p.functionCall)
                .map(p => p.functionCall);

            if (functionCalls.length > 0) {
                runAgain = true;
                onStateChange({ state: 'executing_tools', message: 'Executing tools...' });

                const toolResponsesPromises = functionCalls.map(async (call: FunctionCall) => {
                    const toolName = call.name as keyof typeof toolHandlers;
                    onStateChange({ state: 'executing_tools', message: `Executing: ${toolName}` });
                    let toolResult;
                    if (toolName in toolHandlers) {
                        toolResult = await (toolHandlers as any)[toolName](call.args);
                    } else {
                        toolResult = { result: `Error: Unknown tool '${toolName}'.` };
                    }
                    return {
                        functionResponse: {
                            name: call.name,
                            response: toolResult,
                            id: call.id,
                        },
                    };
                });

                const toolResponses: Part[] = await Promise.all(toolResponsesPromises);
                const toolResponseContent: Content = { role: 'user', parts: toolResponses };
                
                onHistoryChange(prev => [...prev, toolResponseContent]);
                historyForApi.push(toolResponseContent);
            }
        }
    } catch (error) {
        console.error("AI Assistant Error:", error);
        const errorMessage = error instanceof Error ? `Sorry, I encountered an error: ${error.message}` : "An unknown error occurred.";
        onHistoryChange(prev => [...prev, { role: 'model', parts: [{ text: errorMessage }] }]);
    } finally {
        onStateChange({ state: 'idle' });
    }
}
