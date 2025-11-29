import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightSpecialChars, drawSelection, dropCursor, rectangularSelection, crosshairCursor, highlightActiveLine } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { javascript } from '@codemirror/lang-javascript';
import { yCollab } from 'y-codemirror.next';
import { useCollaborativeDocument } from '../hooks/useCollaborativeDocument';
import { useAuthStore } from '../stores/authStore';
import { useUiStore } from '../stores/uiStore';
import { darkTheme, lightTheme } from '../utils/editorThemes';
import api from '../services/api.service';
import { VersionHistory } from './VersionHistory';
import { Chat } from './Chat';

interface EditorProps {
    slug: string;
    title?: string;
}

export const CollaborativeEditor = ({ slug, title }: EditorProps) => {
    const { user } = useAuthStore();
    const { theme, toggleTheme } = useUiStore();
    const { ydoc, provider, status } = useCollaborativeDocument({
        slug,
        user: user ?? undefined
    });
    const editorRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [editedTitle, setEditedTitle] = useState(title ?? slug);
    const [showHistory, setShowHistory] = useState(false);
    const [showChat, setShowChat] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [stats, setStats] = useState({ words: 0, chars: 0 });

    useEffect(() => {
        if (!ydoc) return;
        const chatArray = ydoc.getArray('chat-messages');

        const observer = () => {
            if (!showChat) {
                setUnreadCount(prev => prev + 1);
            }
        };

        chatArray.observe(observer);
        return () => chatArray.unobserve(observer);
    }, [ydoc, showChat]);

    useEffect(() => {
        if (showChat) {
            setUnreadCount(0);
        }
    }, [showChat]);

    useEffect(() => {
        setEditedTitle(title ?? slug);
    }, [title, slug]);

    const handleTitleSave = async () => {
        if (editedTitle.trim() === '' || editedTitle === title) {
            setIsEditingTitle(false);
            return;
        }
        try {
            await api.put(`/documents/${slug}`, { title: editedTitle });
            window.location.reload();
        } catch (error) {
            console.error('Failed to update title', error);
        }
        setIsEditingTitle(false);
    };

    const handleDelete = async () => {
        if (confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
            try {
                await api.delete(`/documents/${slug}`);
                window.location.href = '/';
            } catch (error) {
                console.error('Failed to delete document', error);
            }
        }
    };

    const handleDownload = () => {
        if (!viewRef.current) return;

        const content = viewRef.current.state.doc.toString();
        const filename = `${title || slug}.txt`;

        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !ydoc) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target?.result as string;
            const ytext = ydoc.getText('monaco');

            // Replace entire document content
            ydoc.transact(() => {
                ytext.delete(0, ytext.length);
                ytext.insert(0, content);
            });
        };
        reader.readAsText(file);

        // Reset input so same file can be uploaded again
        event.target.value = '';
    };

    const handleShare = async () => {
        const shareUrl = `${window.location.origin}/documents/${slug}`;

        try {
            await navigator.clipboard.writeText(shareUrl);
            alert('Share link copied to clipboard!\n\n' + shareUrl);
        } catch (err) {
            // Fallback if clipboard API fails
            prompt('Copy this link to share:', shareUrl);
        }
    };

    const handleRestore = (content: string) => {
        if (!ydoc) return;

        const ytext = ydoc.getText('monaco');
        ydoc.transact(() => {
            ytext.delete(0, ytext.length);
            ytext.insert(0, content);
        });
    };

    useEffect(() => {
        if (!ydoc || !provider || !editorRef.current) {
            return;
        }

        const ytext = ydoc.getText('monaco');

        const updateStats = (docString: string) => {
            const words = docString.trim() === '' ? 0 : docString.trim().split(/\s+/).length;
            const chars = docString.length;
            setStats({ words, chars });
        };

        const state = EditorState.create({
            doc: ytext.toString(),
            extensions: [
                lineNumbers(),
                highlightActiveLineGutter(),
                highlightSpecialChars(),
                history(),
                drawSelection(),
                dropCursor(),
                EditorState.allowMultipleSelections.of(true),
                rectangularSelection(),
                crosshairCursor(),
                highlightActiveLine(),
                keymap.of([...defaultKeymap, ...historyKeymap]),
                javascript(),
                yCollab(ytext, provider.awareness),
                theme === 'dark' ? darkTheme : lightTheme,
                EditorView.updateListener.of((update) => {
                    if (update.docChanged) {
                        updateStats(update.state.doc.toString());
                    }
                })
            ]
        });

        // Initial stats
        updateStats(ytext.toString());

        const view = new EditorView({
            state,
            parent: editorRef.current
        });

        viewRef.current = view;

        return () => {
            view.destroy();
            viewRef.current = null;
        };
    }, [ydoc, provider, theme]); // Re-create editor when theme changes

    const isDark = theme === 'dark';

    return (
        <div className={`flex min-h-screen ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}>
            <div className="flex flex-1 flex-col">
                {/* Header */}
                <header className={`border-b px-6 py-4 ${isDark ? 'border-white/5 bg-slate-900/60' : 'border-slate-200 bg-white'}`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link
                                to="/"
                                className={`${isDark ? 'text-slate-400 hover:text-indigo-400' : 'text-slate-500 hover:text-indigo-600'} transition-colors text-sm font-medium`}
                            >
                                ← Back
                            </Link>
                            {isEditingTitle ? (
                                <input
                                    type="text"
                                    value={editedTitle}
                                    onChange={(e) => setEditedTitle(e.target.value)}
                                    onBlur={handleTitleSave}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleTitleSave();
                                        if (e.key === 'Escape') {
                                            setEditedTitle(title ?? slug);
                                            setIsEditingTitle(false);
                                        }
                                    }}
                                    className={`rounded-md border px-3 py-1 text-lg font-semibold outline-none focus:border-indigo-500 ${isDark ? 'border-white/10 bg-slate-900 text-white' : 'border-slate-300 bg-white text-slate-900'}`}
                                    autoFocus
                                />
                            ) : (
                                <h1
                                    className={`text-lg font-semibold cursor-pointer transition-colors ${isDark ? 'text-white hover:text-slate-300' : 'text-slate-900 hover:text-slate-600'}`}
                                    onClick={() => setIsEditingTitle(true)}
                                >
                                    {title ?? slug}
                                </h1>
                            )}
                        </div>
                        <div className="flex items-center gap-4">
                            <button
                                onClick={toggleTheme}
                                className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                            >
                                {isDark ? '☀️' : '🌙'}
                            </button>
                            <label className={`rounded-md px-4 py-2 text-sm font-medium transition-colors cursor-pointer ${isDark ? 'bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}>
                                ↑ Import
                                <input
                                    type="file"
                                    onChange={handleImport}
                                    className="hidden"
                                    accept=".txt,.js,.py,.md,.html,.css,.json"
                                />
                            </label>
                            <button
                                onClick={handleDownload}
                                className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${isDark ? 'bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}
                            >
                                ↓ Download
                            </button>
                            <button
                                onClick={handleShare}
                                className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${isDark ? 'bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20' : 'bg-cyan-50 text-cyan-600 hover:bg-cyan-100'}`}
                            >
                                🔗 Share
                            </button>
                            <button
                                onClick={() => setShowChat(!showChat)}
                                className={`relative rounded-md px-4 py-2 text-sm font-medium transition-colors ${showChat
                                    ? (isDark ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-700')
                                    : (isDark ? 'bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100')
                                    }`}
                            >
                                💬 Chat
                                {unreadCount > 0 && (
                                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] text-white">
                                        {unreadCount > 9 ? '9+' : unreadCount}
                                    </span>
                                )}
                            </button>
                            <button
                                onClick={() => setShowHistory(true)}
                                className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${isDark ? 'bg-purple-500/10 text-purple-300 hover:bg-purple-500/20' : 'bg-purple-50 text-purple-600 hover:bg-purple-100'}`}
                            >
                                📜 History
                            </button>
                            <button
                                onClick={handleDelete}
                                className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${isDark ? 'bg-rose-500/10 text-rose-300 hover:bg-rose-500/20' : 'bg-rose-50 text-rose-600 hover:bg-rose-100'}`}
                            >
                                Delete
                            </button>
                            <div className="flex items-center gap-2 text-sm">
                                <span className={`h-2 w-2 rounded-full ${status === 'connected' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                                <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>
                                    {status === 'connected' ? 'Connected' : 'Reconnecting...'}
                                </span>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Editor */}
                <main className="flex-1 overflow-hidden p-6 flex flex-col">
                    <div className={`flex-1 rounded-t-2xl border shadow-xl overflow-hidden ${isDark ? 'border-white/5 bg-slate-900/60' : 'border-slate-200 bg-white'}`}>
                        <div ref={editorRef} className="h-full" />
                    </div>
                    {/* Footer Stats */}
                    <div className={`rounded-b-2xl border-x border-b px-4 py-2 text-xs flex justify-end gap-4 ${isDark ? 'border-white/5 bg-slate-900/80 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
                        <span>{stats.words} words</span>
                        <span>{stats.chars} characters</span>
                    </div>
                </main>
            </div>

            {/* Version History Sidebar */}
            {showHistory && (
                <VersionHistory
                    slug={slug}
                    currentContent={viewRef.current?.state.doc.toString() || ''}
                    onRestore={handleRestore}
                    onClose={() => setShowHistory(false)}
                />
            )}

            {/* Chat Sidebar */}
            {showChat && ydoc && provider && (
                <Chat
                    ydoc={ydoc}
                    provider={provider}
                    onClose={() => setShowChat(false)}
                />
            )}
        </div>
    );
};
