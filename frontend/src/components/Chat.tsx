import { useEffect, useRef, useState } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { Paperclip, FileText, Mic, Square, Play, Pause } from 'lucide-react';
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
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
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

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const audioFile = new File([audioBlob], `voice-message-${Date.now()}.webm`, { type: 'audio/webm' });

                setIsUploading(true);
                try {
                    const result = await uploadFile(audioFile);
                    sendMessage('', {
                        url: result.url,
                        name: 'Voice Message',
                        type: 'audio/webm'
                    });
                } catch (error) {
                    console.error('Audio upload failed:', error);
                    alert('Failed to send voice message');
                } finally {
                    setIsUploading(false);
                }

                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
        } catch (error) {
            console.error('Error accessing microphone:', error);
            alert('Could not access microphone. Please check permissions.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const addEmoji = (emoji: string) => {
        setNewMessage(prev => prev + emoji);
    };

    const isImage = (msg: Message) => {
        return msg.fileType?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(msg.fileName || '');
    };

    const isAudio = (msg: Message) => {
        return msg.fileType?.startsWith('audio/') || /\.(webm|mp3|wav|m4a)$/i.test(msg.fileName || '');
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
                                        {isImage(msg) ? (
                                            <div className="relative group">
                                                <img
                                                    src={msg.fileUrl}
                                                    alt={msg.fileName}
                                                    className="max-w-full rounded-lg border border-white/10"
                                                    style={{ maxHeight: '300px', width: 'auto' }}
                                                    loading="eager"
                                                />
                                            </div>
                                        ) : isAudio(msg) ? (
                                            <div className="flex items-center gap-2 min-w-[200px]">
                                                <audio controls src={msg.fileUrl} className="w-full h-8" />
                                            </div>
                                        ) : (
                                            <a
                                                href={msg.fileUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors group border border-white/5"
                                            >
                                                <FileText size={20} className="text-indigo-400 group-hover:text-indigo-300" />
                                                <div className="flex flex-col overflow-hidden">
                                                    <span className="truncate text-indigo-300 font-medium group-hover:text-indigo-200">
                                                        {msg.fileName}
                                                    </span>
                                                    <span className="text-xs text-slate-400">Click to open</span>
                                                </div>
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

            <form onSubmit={handleSend} className="p-4 border-t border-white/5 bg-slate-900 relative shrink-0">
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

                <div className="flex gap-2 items-center">
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
                        disabled={isUploading || isRecording}
                        className={`rounded-md px-3 py-2 transition-colors ${isUploading ? 'bg-slate-800 text-slate-600' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                        title="Attach File"
                    >
                        {isUploading ? '...' : <Paperclip size={18} />}
                    </button>

                    <button
                        type="button"
                        onClick={isRecording ? stopRecording : startRecording}
                        className={`rounded-md px-3 py-2 transition-colors ${isRecording ? 'bg-rose-500 text-white animate-pulse' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                        title={isRecording ? "Stop Recording" : "Record Voice Message"}
                    >
                        {isRecording ? <Square size={18} fill="currentColor" /> : <Mic size={18} />}
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
                        placeholder={isRecording ? "Recording..." : "Type a message..."}
                        disabled={isRecording}
                        className="flex-1 bg-slate-800 text-white text-sm rounded-md px-3 py-2 outline-none focus:ring-1 focus:ring-indigo-500 border border-white/5 disabled:opacity-50"
                    />
                    <button
                        type="submit"
                        disabled={!newMessage.trim() || isRecording}
                        className="bg-indigo-500 text-white rounded-md px-3 py-2 text-sm font-medium hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        Send
                    </button>
                </div>
            </form>
        </div>
    );
};
