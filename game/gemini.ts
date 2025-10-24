import { GoogleGenAI, Type } from "@google/genai";

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

export const getCodeCompletion = async (
    fullCode: string,
    cursorPosition: number,
    language: string
): Promise<string[]> => {
    if (!process.env.API_KEY) {
        console.warn("API_KEY is not configured for code completion.");
        return [];
    }

    const codeWithCursor = `${fullCode.substring(0, cursorPosition)}<CURSOR>${fullCode.substring(cursorPosition)}`;
    const langName = language === 'py' ? 'Python' : 'JavaScript';

    const prompt = `You are an expert code completion AI, acting as a direct assistant within an IDE. Your task is to predict and generate the next logical block of code based on the user's current file content and cursor position.

Follow these rules strictly:
1.  Analyze the entire code to understand context, variables, and user intent. The user's cursor is marked with "<CURSOR>".
2.  Provide up to 5 diverse and useful code suggestions.
3.  Suggestions can be single-line or multi-line.
4.  Return ONLY a valid JSON array of strings. Example: ["suggestion1_code_string", "suggestion2_code_string"]
5.  Do NOT include the user's existing code in your suggestions. Only provide the new code to be inserted at the <CURSOR> position.
6.  If the user is in the middle of a line, complete that line. If they are at the end of a line, suggest the next complete line or block of code.
7.  Do not add any explanations, markdown, or anything outside of the JSON array.

LANGUAGE: ${langName}

USER'S CODE:
---
${codeWithCursor}
---
`;

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.STRING,
                    },
                },
                temperature: 0.4,
                topP: 0.95,
                maxOutputTokens: 1024,
            }
        });

        const text = response.text;
        if (!text) {
            console.warn("Gemini API returned no text for code completion. The response might have been blocked.");
            return [];
        }

        const jsonStr = text.trim();
        const suggestions = JSON.parse(jsonStr);
        
        if (Array.isArray(suggestions) && suggestions.every(s => typeof s === 'string')) {
            return suggestions;
        }
        return [];

    } catch (error) {
        console.error("Error getting code completion from Gemini API:", error);
        return [];
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