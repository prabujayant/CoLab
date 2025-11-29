import { useEffect, useRef, useState } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { Paperclip, FileText, Image as ImageIcon } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
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

        console.log('Sending message:', message);
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

        console.log('Uploading file:', file.name, file.type);
        setIsUploading(true);
        try {
            const result = await uploadFile(file);
            console.log('Upload result:', result);
            sendMessage('', {
                url: result.url,
                name: result.originalName,
                type: result.mimetype
            });
        } catch (error) {
            console.error('File upload failed:', error);
            alert(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const addEmoji = (emoji: string) => {
        setNewMessage(prev => prev + emoji);
    };

    const isImage = (msg: Message) => {
        return msg.fileType?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(msg.fileName || '');
    };

    return (
        <div className="w-full md:w-96 border-l border-white/5 bg-slate-900/95 backdrop-blur-sm flex flex-col h-[100dvh] absolute right-0 top-0 z-50 shadow-2xl overflow-x-hidden">
            <div className="flex items-center justify-between p-4 border-b border-white/5 shrink-0">
                <h2 className="text-lg font-semibold text-white">Chat</h2>
                <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
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
                                    <div className="mt-2">
                                        <a
                                            href={msg.fileUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors group border border-white/5"
                                        >
                                            {isImage(msg) ? (
                                                <ImageIcon size={20} className="text-emerald-400 group-hover:text-emerald-300" />
                                            ) : (
                                                <FileText size={20} className="text-indigo-400 group-hover:text-indigo-300" />
                                            )}
                                            <div className="flex flex-col overflow-hidden">
                                                <span className="truncate text-indigo-300 font-medium group-hover:text-indigo-200">
                                                    {msg.fileName}
                                                </span>
                                                <span className="text-xs text-slate-400">Click to open</span>
                                            </div>
                                        </a>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSend} className="p-3 border-t border-white/5 bg-slate-900 relative shrink-0">
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

                <div className="flex items-center gap-2">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        className="hidden"
                        accept="image/*,.pdf,.doc,.docx,.txt"
                    />

                    {/* Action Buttons Group */}
                    <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-1">
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            className={`p-2 rounded-md transition-colors ${isUploading ? 'text-slate-600' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
                            title="Attach File"
                        >
                            {isUploading ? <span className="text-xs">...</span> : <Paperclip size={18} />}
                        </button>

                        <button
                            type="button"
                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                            className={`p-2 rounded-md transition-colors ${showEmojiPicker ? 'text-indigo-400' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
                            title="Add Emoji"
                        >
                            😃
                        </button>
                    </div>

                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 bg-slate-800 text-white text-sm rounded-lg px-3 py-2.5 outline-none focus:ring-1 focus:ring-indigo-500 border border-white/5 min-w-0"
                    />

                    <button
                        type="submit"
                        disabled={!newMessage.trim()}
                        className="bg-indigo-500 text-white rounded-lg p-2.5 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
                        title="Send Message"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="22" y1="2" x2="11" y2="13"></line>
                            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                        </svg>
                    </button>
                </div>
            </form>
        </div>
    );
};
