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

export const getAiThought = async (spriteName: string, rewardValue: number): Promise<string> => {
    if (!process.env.API_KEY) {
        console.error("API_KEY is not configured for AI thought generation.");
        return "..."; // Return a placeholder
    }

    const mood = rewardValue > 0 ? "happy or confident" : (rewardValue < 0 ? "confused or determined to do better" : "neutral or observant");

    const prompt = `A sprite character in a game named "${spriteName}" just received a reward of ${rewardValue}.
Generate a single, short, first-person sentence reflecting what the sprite might be thinking.
The thought should be ${mood}.
The thought should be concise and in-character, like something you'd see in a game. Do not use quotes in the response.`;

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                temperature: 0.8,
                maxOutputTokens: 50,
            }
        });

        const text = response.text;
        if (!text) {
            return "...";
        }
        return text.trim().replace(/"/g, ''); // Ensure no quotes

    } catch (error) {
        console.error("Error generating AI thought:", error);
        return "..."; // Return placeholder on error
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

export const transpileCode = async (code: string, sourceLanguage: string): Promise<string> => {
     if (!process.env.API_KEY) {
        throw new Error("API_KEY is not configured for transpilation.");
    }
    
    const prompt = `You are an expert code transpiler. Your task is to convert code from various languages into Python.
The target Python environment has a specific, globally available API for controlling sprites.

**Target Python API:**
- \`ai.Sprite(name="str", shape="str", x=int, y=int)\`: Creates a sprite.
- \`sprite.go_to(x=int, y=int, speed=float)\`: Moves a sprite.
- \`sprite.say(message="str", duration=float)\`: Makes a sprite talk.
- \`sprite.create_network()\`: Initializes AI for the sprite.
- \`sprite.reward(value=int)\`: Gives a reward to the sprite.
- All other libraries like \`world\`, \`sound\`, and \`physics\` follow a similar keyword-argument style.

**Instructions:**
1.  Transpile the provided ${sourceLanguage} code into the equivalent Python code that uses the target API.
2.  Convert all language constructs (variables, loops, conditionals, etc.) to their Python equivalents.
3.  **Crucially**, for every generated line of Python, append a comment with the original source line number, like \`# src: 1\`, \`# src: 2\`, etc. This is for error mapping.
4.  Your output must be ONLY the raw, runnable Python code. Do not include any explanations, markdown code fences, or anything else.

**Source ${sourceLanguage} Code:**
\`\`\`${sourceLanguage}
${code}
\`\`\`

**Transpiled Python Code:**
`;

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                temperature: 0.0,
                stopSequences: [],
            }
        });

        const text = response.text;
        if (!text) {
            throw new Error("Received an empty response from the transpiler AI.");
        }
        
        // Clean up the response to ensure it's just raw code
        const cleanedCode = text.trim().replace(/^```python\n|```$/g, '').trim();
        return cleanedCode;

    } catch (error) {
        console.error("Error transpiling code via Gemini API:", error);
        throw new Error("The AI failed to transpile the code. It may contain unsupported syntax or the API failed.");
    }

};

export const formatCode = async (code: string, language: string): Promise<string> => {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY is not configured for code formatting.");
    }
    
    const langNameMap: Record<string, string> = {
        py: 'Python (following PEP 8)',
        js: 'JavaScript (like Prettier)',
        jsx: 'JavaScript (like Prettier)',
        ts: 'TypeScript (like Prettier)',
        tsx: 'TypeScript (like Prettier)',
        html: 'HTML',
        css: 'CSS',
    };
    const langDisplayName = langNameMap[language] || language;

    const prompt = `You are an expert code formatter. Your task is to reformat the given code snippet according to standard conventions for its language.
- Do NOT change the logic, variable names, or functionality.
- Only fix indentation, spacing, line breaks, and other stylistic issues.
- Return ONLY the raw, formatted code. Do not include any explanations, markdown code fences, or anything else.

LANGUAGE: ${langDisplayName}

CODE TO FORMAT:
\`\`\`${language}
${code}
\`\`\`

FORMATTED CODE:
`;

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                temperature: 0.0,
                stopSequences: [],
            }
        });

        const text = response.text;
        if (!text) {
            throw new Error("Received an empty response from the formatter AI.");
        }
        
        // Clean up the response to ensure it's just raw code
        const cleanedCode = text.trim().replace(/^```(?:\w+\n)?|```$/g, '').trim();
        return cleanedCode;

    } catch (error) {
        console.error("Error formatting code via Gemini API:", error);
        throw new Error("The AI failed to format the code. The response might have been blocked or the API key is invalid.");
    }
};