
import { GoogleGenAI } from "@google/genai";

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
