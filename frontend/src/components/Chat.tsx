import { useEffect, useRef, useState } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { Paperclip, FileText } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useUiStore } from '../stores/uiStore';
import { uploadFile } from '../services/api.service';

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
    fileUrl?: string;
    fileName?: string;
    fileType?: string;
}

const EMOJIS = ['😀', '😂', '😍', '🔥', '👍', '👎', '🎉', '🚀', '💻', '🐛', '🤔', '👀', '❤️', '✅', '❌', '✨', '🌟', '🎵', '🍕', '☕'];

export const Chat = ({ ydoc, provider, onClose }: ChatProps) => {
    const { user } = useAuthStore();
    const { fontFamily, fontSize } = useUiStore();
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const chatArray = ydoc.getArray<Message>('chat-messages');

    useEffect(() => {
        setMessages(chatArray.toArray());
        const observer = () => setMessages(chatArray.toArray());
        chatArray.observe(observer);
        return () => chatArray.unobserve(observer);
    }, [chatArray]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const sendMessage = (text: string, file?: { url: string; name: string; type: string }) => {
        const awareness = provider.awareness;
        const localState = awareness.getLocalState() as any;

        const message: Message = {
            id: crypto.randomUUID(),
            text: text.trim(),
            sender: localState?.user?.name || user?.displayName || 'Anonymous',
            senderColor: localState?.user?.color || '#94a3b8',
            timestamp: Date.now(),
            ...(file && {
                fileUrl: file.url,
                fileName: file.name,
                fileType: file.type
            })
        };

        chatArray.push([message]);
    };

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;
        sendMessage(newMessage);
        setNewMessage('');
        setShowEmojiPicker(false);
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const result = await uploadFile(file);
            sendMessage('', {
                url: result.url,
                name: result.originalName,
                type: result.mimetype
            });
        } catch (error) {
            console.error('File upload failed:', error);
            alert('Failed to upload file');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const addEmoji = (emoji: string) => {
        setNewMessage(prev => prev + emoji);
    };

    return (
        <div className="w-full md:w-96 border-l border-white/5 bg-slate-900/95 backdrop-blur-sm flex flex-col h-[100dvh] absolute right-0 top-0 z-50 shadow-2xl overflow-x-hidden">
            <div className="flex items-center justify-between p-4 border-b border-white/5">
                <h2 className="text-lg font-semibold text-white">Chat</h2>
                <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                    <div className="text-center text-slate-500 text-sm mt-10">No messages yet. Say hi! 👋</div>
                ) : (
                    messages.map((msg) => (
                        <div key={msg.id} className="flex flex-col gap-1">
                            <div className="flex items-baseline gap-2">
                                <span className="text-xs font-bold" style={{ color: msg.senderColor }}>{msg.sender}</span>
                                <span className="text-[10px] text-slate-500">
                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                            <div className="bg-slate-800/50 rounded-lg px-3 py-2 text-sm text-slate-200 break-words">
                                {msg.text && (
                                    <div className="mb-1">
                                        {msg.text.split(/(https?:\/\/[^\s]+)/g).map((part, i) =>
                                            part.match(/^https?:\/\//) ? (
                                                <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline break-all">
                                                    {part}
                                                </a>
                                            ) : (
                                                part
                                            )
                                        )}
                                    </div>
                                )}
                                {msg.fileUrl && (
                                    <div className="mt-1">
                                        {msg.fileType?.startsWith('image/') ? (
                                            <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" className="block">
                                                <img
                                                    src={msg.fileUrl}
                                                    alt={msg.fileName}
                                                    className="max-w-full rounded-md border border-white/10 hover:opacity-90 transition-opacity"
                                                    style={{ maxHeight: '200px' }}
                                                />
                                            </a>
                                        ) : (
                                            <a
                                                href={msg.fileUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 p-2 bg-slate-700/50 rounded hover:bg-slate-700 transition-colors group"
                                            >
                                                <FileText size={16} className="text-indigo-400 group-hover:text-indigo-300" />
                                                <span className="truncate max-w-[150px] text-indigo-300 underline decoration-indigo-300/30 group-hover:text-indigo-200">
                                                    {msg.fileName}
                                                </span>
                                            </a>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSend} className="p-4 border-t border-white/5 bg-slate-900 relative">
                {showEmojiPicker && (
                    <div className="absolute bottom-full left-4 mb-2 bg-slate-800 border border-white/10 rounded-lg shadow-xl p-2 grid grid-cols-5 gap-1 w-64 z-50">
                        {EMOJIS.map(emoji => (
                            <button
                                key={emoji}
                                type="button"
                                onClick={() => addEmoji(emoji)}
                                className="text-xl p-1 hover:bg-white/10 rounded transition-colors"
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                )}

                <div className="flex gap-2">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        className="hidden"
                        accept="image/*,.pdf,.doc,.docx,.txt"
                    />
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className={`rounded-md px-3 py-2 transition-colors ${isUploading ? 'bg-slate-800 text-slate-600' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                        title="Attach File"
                    >
                        {isUploading ? '...' : <Paperclip size={18} />}
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className={`rounded-md px-3 py-2 transition-colors ${showEmojiPicker ? 'bg-indigo-500/20 text-indigo-300' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                        title="Add Emoji"
                    >
                        😃
                    </button>
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 bg-slate-800 text-white text-sm rounded-md px-3 py-2 outline-none focus:ring-1 focus:ring-indigo-500 border border-white/5"
                        style={{ fontFamily, fontSize: `${fontSize}px` }}
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
