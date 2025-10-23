import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

// We are assuming the API_KEY is provided via environment variables.
if (!process.env.API_KEY) {
    console.error("API_KEY is not set. Please set it in your environment variables.");
}

const model = 'gemini-2.5-flash';

type ChatHistory = { role: 'user' | 'model'; parts: { text: string }[] }[];

export const getGeminiResponse = async (
    history: ChatHistory, 
    newMessage: string,
    systemInstruction: string = "You are a helpful assistant."
): Promise<string> => {
    try {
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
            return `Sorry, I encountered an error: ${error.message}`;
        }
        return "Sorry, I encountered an unknown error.";
    }
};
