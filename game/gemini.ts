import { GoogleGenAI, Type, FunctionDeclaration, Chat } from "@google/genai";

const model = 'gemini-2.5-flash';

type ChatHistory = { role: 'user' | 'model'; parts: { text: string }[] }[];

export const getGeminiResponse = async (
    history: ChatHistory, 
    newMessage: string,
    systemInstruction: string = "You are a helpful assistant."
): Promise<string> => {
    if (!process.env.API_KEY) {
        const errorMsg = "API_KEY is not configured. Please set it in your environment variables.";
        console.error(errorMsg);
        throw new Error(errorMsg);
    }

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

        const contents = [
            ...history,
            {
                role: 'user' as const,
                parts: [{ text: newMessage }],
            },
        ];

        const response = await ai.models.generateContent({
            model: model,
            contents: contents,
            config: {
                systemInstruction: systemInstruction,
            },
        });

        const text = response.text;
        if (!text) {
            throw new Error("Received an empty response from the API.");
        }
        return text;

    } catch (error) {
        console.error("Error calling Gemini API:", error);
        if (error instanceof Error) {
            throw error; // Re-throw the original error to be caught by the caller
        }
        throw new Error("An unknown error occurred while calling the Gemini API.");
    }
};

export const getFixForCodeError = async (
    code: string,
    language: string,
    errorMessage: string,
    lineNumber: number
): Promise<{ explanation: string; fixedCode: string; startLine: number; endLine: number; }> => {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY is not configured for error fixing.");
    }

    const langName = language === 'py' ? 'Python' : 'JavaScript';

    const prompt = `You are an expert code-fixing AI assistant integrated directly into a user's IDE. Your primary goal is to fix a single error while perfectly matching the user's existing coding style.

**CRITICAL INSTRUCTION: Emulate the user's style.**
Before generating a fix, analyze the user's entire code to understand their style:
- **Formatting:** Pay close attention to indentation (spaces vs. tabs, and how many), use of whitespace around operators, and line breaks.
- **Naming Conventions:** Observe if they use camelCase, snake_case, or PascalCase for variables and functions.
- **Commenting:** Match their commenting style (or lack thereof).
- **Simplicity:** The corrected code MUST feel like it was written by the original author.

**Your Task:**
Based on the provided code, error message, and line number:
1.  Identify the root cause of the error.
2.  Determine the start and end line numbers of the code block that needs to be replaced. This block can be one or more lines.
3.  Create a concise, one-sentence explanation of the problem.
4.  Generate the *minimal* corrected code to replace the identified block.

**Output Format:**
Return ONLY a valid JSON object with four keys: "explanation", "fixedCode", "startLine", and "endLine". \`startLine\` and \`endLine\` must be integers corresponding to the line numbers in the original code.

Example Response:
{
  "explanation": "The variable 'message' was misspelled as 'mesage', causing a NameError.",
  "fixedCode": "bot.say(message=\\"Hello World!\\")",
  "startLine": 10,
  "endLine": 10
}

---
LANGUAGE: ${langName}

ERROR MESSAGE:
${errorMessage}

LINE NUMBER OF PRIMARY ERROR: ${lineNumber}

USER'S CODE:
\`\`\`${language}
${code}
\`\`\`
---
`;

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        explanation: { type: Type.STRING },
                        fixedCode: { type: Type.STRING },
                        startLine: { type: Type.INTEGER },
                        endLine: { type: Type.INTEGER },
                    },
                    required: ["explanation", "fixedCode", "startLine", "endLine"],
                },
            },
        });
        
        const text = response.text;
        if (!text) {
            console.error("Error getting code fix from Gemini API: received an empty response.");
            throw new Error("AI failed to generate a fix. The response may have been blocked.");
        }
        const jsonStr = text.trim();
        return JSON.parse(jsonStr);

    } catch (error) {
        console.error("Error getting code fix from Gemini API:", error);
        throw new Error("AI failed to generate a fix. The model's response might have been blocked or the API key is invalid.");
    }
};


// AI Assistant with Function Calling

const tools: FunctionDeclaration[] = [
    {
        name: 'listAllFiles',
        description: 'List all files and folders in the workspace explorer.',
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
        name: 'getActiveFileContent',
        description: 'Reads the content of the file currently open in the editor.',
        parameters: { type: Type.OBJECT, properties: {} }
    },
    {
        name: 'createFile',
        description: 'Creates a new file in the root directory.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                fileName: { type: Type.STRING, description: 'The name for the new file, including extension, e.g., "utils.py".' },
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
        name: 'replaceCodeInRange',
        description: 'Replaces a range of lines in a specific file with new code. Use this for precise edits.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                fileName: { type: Type.STRING, description: 'The name of the file to edit.' },
                startLine: { type: Type.INTEGER, description: 'The 1-based starting line number of the code to replace.' },
                endLine: { type: Type.INTEGER, description: 'The 1-based ending line number of the code to replace.' },
                newCode: { type: Type.STRING, description: 'The new code to insert.' },
            },
            required: ['fileName', 'startLine', 'endLine', 'newCode']
        }
    }
];

export const createAssistantChatSession = (): Chat => {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY is not configured for the AI assistant.");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
    
    const systemInstruction = `You are a world-class senior software engineer acting as an AI assistant in a web-based IDE. Your name is Coder.
You are helpful, concise, and an expert in multiple programming languages.
You can read, create, and modify files in the user's workspace by calling the provided functions.
When asked to delete a file, you MUST call the 'deleteFile' function, which will prompt the user for confirmation.
Before modifying a file, it's a good practice to read it first to understand its contents.
When a user asks you to make a code change, try to use the 'replaceCodeInRange' function for precision.
Do not ask for confirmation for actions unless it is for a destructive action like deleting a file. Just perform the action.`;

    return ai.chats.create({
        model: 'gemini-2.5-pro',
        config: {
            systemInstruction: systemInstruction,
            tools: [{ functionDeclarations: tools }],
            topK: 32,
        },
    });
};