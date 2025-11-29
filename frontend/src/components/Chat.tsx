import { useEffect, useRef, useState } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { useAuthStore } from '../stores/authStore';

interface ChatProps {
    ydoc: Y.Doc;
    provider: WebsocketProvider;
    onClose: () => void;
}

interface Message {
    id: string;
    text: string;
    sender: string;
    senderColor: string;
    timestamp: number;
}

export const Chat = ({ ydoc, provider, onClose }: ChatProps) => {
    const { user } = useAuthStore();
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chatArray = ydoc.getArray<Message>('chat-messages');

    useEffect(() => {
        // Initial load
        setMessages(chatArray.toArray());

        // Listen for updates
        const observer = () => {
            setMessages(chatArray.toArray());
        };

        chatArray.observe(observer);

        return () => {
            chatArray.unobserve(observer);
        };
    }, [chatArray]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        const awareness = provider.awareness;
        const localState = awareness.getLocalState() as any;

        const message: Message = {
            id: crypto.randomUUID(),
            text: newMessage.trim(),
            sender: localState?.user?.name || user?.displayName || 'Anonymous',
            senderColor: localState?.user?.color || '#94a3b8',
            timestamp: Date.now()
        };

        chatArray.push([message]);
        setNewMessage('');
    };

    return (
        <div className="w-80 border-l border-white/5 bg-slate-900/95 backdrop-blur-sm flex flex-col h-screen absolute right-0 top-0 z-50 shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-white/5">
                <h2 className="text-lg font-semibold text-white">Chat</h2>
                <button
                    onClick={onClose}
                    className="text-slate-400 hover:text-white transition-colors"
                >
                    ✕
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                    <div className="text-center text-slate-500 text-sm mt-10">
                        No messages yet. Say hi! 👋
                    </div>
                ) : (
                    messages.map((msg) => (
                        <div key={msg.id} className="flex flex-col gap-1">
                            <div className="flex items-baseline gap-2">
                                <span
                                    className="text-xs font-bold"
                                    style={{ color: msg.senderColor }}
                                >
                                    {msg.sender}
                                </span>
                                <span className="text-[10px] text-slate-500">
                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                            <div className="bg-slate-800/50 rounded-lg px-3 py-2 text-sm text-slate-200 break-words">
                                {msg.text}
                            </div>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSend} className="p-4 border-t border-white/5 bg-slate-900">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 bg-slate-800 text-white text-sm rounded-md px-3 py-2 outline-none focus:ring-1 focus:ring-indigo-500 border border-white/5"
                    />
                    <button
                        type="submit"
                        disabled={!newMessage.trim()}
                        className="bg-indigo-500 text-white rounded-md px-3 py-2 text-sm font-medium hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        Send
                    </button>
                </div>
            </form>
        </div>
    );
};
