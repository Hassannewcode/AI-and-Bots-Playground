import React, { useState, useRef, useEffect } from 'react';
import type { Content, FunctionCall } from '@google/genai';
import { SparklesIcon, ArrowPathIcon } from '../icons';
import type { AIStateStatus } from '../../ai/types';

export interface AIChatPanelProps {
    messages: Content[];
    onSendMessage: (message: string) => void;
    aiState: AIStateStatus;
}

const formatToolCall = (call: FunctionCall) => {
    const args = Object.entries(call.args)
        .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
        .join(', ');
    return `${call.name}({ ${args} })`;
};

export const AIChatPanel: React.FC<AIChatPanelProps> = ({ messages, onSendMessage, aiState }) => {
    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const isLoading = aiState.state !== 'idle';

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages, aiState]);

    const handleSend = () => {
        if (input.trim() && !isLoading) {
            onSendMessage(input);
            setInput('');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const renderMessagePart = (part: any, index: number) => {
        if (part.text) {
            return <p key={index} className="whitespace-pre-wrap">{part.text}</p>;
        }
        if (part.functionCall) {
            return (
                 <div key={index} className="my-2 p-2 bg-gray-900/50 border border-gray-700 rounded-md">
                    <p className="text-xs text-gray-400 font-semibold">Tool Call:</p>
                    <code className="text-xs text-sky-300 font-mono">{formatToolCall(part.functionCall)}</code>
                </div>
            )
        }
        if (part.functionResponse) {
             return (
                 <div key={index} className="my-2 p-2 bg-gray-900/50 border border-gray-700 rounded-md">
                    <p className="text-xs text-gray-400 font-semibold">Tool Response:</p>
                    <code className="text-xs text-amber-300 font-mono whitespace-pre-wrap">{JSON.stringify(part.functionResponse.response, null, 2)}</code>
                </div>
            )
        }
        return null;
    };

    return (
        <div className="h-full flex flex-col bg-[#272a33] min-h-0">
            <div className="flex-grow p-2 space-y-4 overflow-y-auto text-xs">
                {messages.map((msg, index) => (
                    <div key={index} className={`flex items-start space-x-2 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                        {msg.role === 'model' && <div className="w-6 h-6 rounded-full flex items-center justify-center bg-teal-800 flex-shrink-0"><SparklesIcon className="w-4 h-4 text-teal-300" /></div>}
                        <div className={`p-2 rounded-md max-w-[85%] ${msg.role === 'user' ? 'bg-blue-900/80 text-blue-100' : 'bg-[#1e2026] text-gray-300'}`}>
                            {msg.parts.map(renderMessagePart)}
                        </div>
                    </div>
                ))}
                 {isLoading && (
                    <div className="flex items-start space-x-2">
                         <div className="w-6 h-6 rounded-full flex items-center justify-center bg-teal-800 flex-shrink-0"><ArrowPathIcon className="w-4 h-4 text-teal-300 animate-spin" /></div>
                         <div className="p-2 rounded-md bg-[#1e2026] text-gray-400 italic">
                            {aiState.message || 'Thinking...'}
                         </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
            <div className="p-2 border-t border-[#3a3d46] flex-shrink-0">
                <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask the AI to do something..."
                    disabled={isLoading}
                    className="w-full bg-[#1e2026] border border-[#3a3d46] rounded-md px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-teal-500 resize-none"
                    rows={2}
                />
            </div>
        </div>
    );
};