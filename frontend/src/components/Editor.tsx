import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightSpecialChars, drawSelection, dropCursor, rectangularSelection, crosshairCursor, highlightActiveLine } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { javascript } from '@codemirror/lang-javascript';
import { yCollab } from 'y-codemirror.next';
import { jsPDF } from 'jspdf';
import { Menu, X, Upload } from 'lucide-react';
import { useCollaborativeDocument } from '../hooks/useCollaborativeDocument';
import { useAuthStore } from '../stores/authStore';
import { useUiStore } from '../stores/uiStore';
import { darkTheme, lightTheme } from '../utils/editorThemes';
import api from '../services/api.service';
import { VersionHistory } from './VersionHistory';
import { Chat } from './Chat';
import { UserAvatars } from './UserAvatars';

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
    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [stats, setStats] = useState({ words: 0, chars: 0 });
    // Force re-render to pass view to toolbar
    const [, setTick] = useState(0);

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

    const handleExportPdf = () => {
        if (!viewRef.current) return;
        const content = viewRef.current.state.doc.toString();
        const doc = new jsPDF();

        doc.setFont("courier");
        doc.setFontSize(10);

        const splitText = doc.splitTextToSize(content, 190);
        doc.text(splitText, 10, 10);

        doc.save(`${title || slug}.pdf`);
    };

    const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !ydoc) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target?.result as string;
            const ytext = ydoc.getText('monaco');

            // Append content to the end of the document
            ydoc.transact(() => {
                const length = ytext.length;
                if (length > 0) {
                    ytext.insert(length, '\n' + content);
                } else {
                    ytext.insert(0, content);
                }
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
                EditorView.theme({
                    '.cm-content': {
                        fontFamily: useUiStore.getState().fontFamily,
                        fontSize: `${useUiStore.getState().fontSize}px`,
                    }
                }),
                EditorView.lineWrapping,
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
        setTick(t => t + 1); // Trigger re-render to pass view to toolbar

        return () => {
            view.destroy();
            viewRef.current = null;
        };
    }, [ydoc, provider, theme, useUiStore.getState().fontFamily, useUiStore.getState().fontSize]);

    const isDark = theme === 'dark';
    const { fontFamily, fontSize, setFontFamily, setFontSize } = useUiStore();

    return (
        <div className={`flex h-screen overflow-hidden ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}>
            <div className="flex flex-1 flex-col">
                {/* Header */}
                <header className={`border-b px-6 py-4 ${isDark ? 'border-white/5 bg-slate-900/60' : 'border-slate-200 bg-white'}`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link
                                to="/"
                                className={`${isDark ? 'text-slate-400 hover:text-indigo-400' : 'text-slate-500 hover:text-indigo-600'} transition-colors text-sm font-medium`}
                            >
                                ←
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
                                    className={`w-32 md:w-auto rounded-md border px-3 py-1 text-lg font-semibold outline-none focus:border-indigo-500 ${isDark ? 'border-white/10 bg-slate-900 text-white' : 'border-slate-300 bg-white text-slate-900'}`}
                                    autoFocus
                                />
                            ) : (
                                <h1
                                    className={`text-lg font-semibold cursor-pointer transition-colors truncate max-w-[150px] md:max-w-none ${isDark ? 'text-white hover:text-slate-300' : 'text-slate-900 hover:text-slate-600'}`}
                                    onClick={() => setIsEditingTitle(true)}
                                >
                                    {title ?? slug}
                                </h1>
                            )}
                            {provider && <div className="hidden md:block"><UserAvatars provider={provider} /></div>}
                        </div>

                        {/* Desktop Actions */}
                        <div className="hidden md:flex items-center gap-4">
                            <select
                                value={fontFamily}
                                onChange={(e) => setFontFamily(e.target.value)}
                                className={`rounded-md px-2 py-1 text-sm border outline-none ${isDark ? 'bg-slate-800 border-white/10 text-slate-300' : 'bg-white border-slate-200 text-slate-700'}`}
                            >
                                <option value="Inter">Inter</option>
                                <option value="Roboto">Roboto</option>
                                <option value="Fira Code">Fira Code</option>
                                <option value="Merriweather">Merriweather</option>
                                <option value="Comic Sans MS">Comic Sans</option>
                            </select>
                            <select
                                value={fontSize}
                                onChange={(e) => setFontSize(Number(e.target.value))}
                                className={`rounded-md px-2 py-1 text-sm border outline-none ${isDark ? 'bg-slate-800 border-white/10 text-slate-300' : 'bg-white border-slate-200 text-slate-700'}`}
                            >
                                {[12, 14, 16, 18, 20, 24, 28, 32].map(size => (
                                    <option key={size} value={size}>{size}px</option>
                                ))}
                            </select>
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
                            <div className="relative group">
                                <button
                                    className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${isDark ? 'bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}
                                >
                                    ↓ Download
                                </button>
                                <div className={`absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 z-50 hidden group-hover:block ${isDark ? 'bg-slate-800 border border-white/10' : 'bg-white border border-slate-200'}`}>
                                    <button
                                        onClick={handleDownload}
                                        className={`block w-full text-left px-4 py-2 text-sm ${isDark ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-700 hover:bg-slate-100'}`}
                                    >
                                        Text File (.txt)
                                    </button>
                                    <button
                                        onClick={handleExportPdf}
                                        className={`block w-full text-left px-4 py-2 text-sm ${isDark ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-700 hover:bg-slate-100'}`}
                                    >
                                        PDF Document (.pdf)
                                    </button>
                                </div>
                            </div>
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

                        {/* Mobile Actions */}
                        <div className="flex md:hidden items-center gap-2">
                            {provider && <UserAvatars provider={provider} />}
                            <button
                                onClick={() => setShowChat(!showChat)}
                                className={`relative p-2 rounded-md transition-colors ${showChat
                                    ? (isDark ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-700')
                                    : (isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900')
                                    }`}
                            >
                                💬
                                {unreadCount > 0 && (
                                    <span className="absolute top-0 right-0 flex h-3 w-3 items-center justify-center rounded-full bg-rose-500 text-[8px] text-white">
                                        {unreadCount}
                                    </span>
                                )}
                            </button>
                            <button
                                onClick={() => setShowMobileMenu(!showMobileMenu)}
                                className={`p-2 rounded-md transition-colors ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}
                            >
                                {showMobileMenu ? <X size={20} /> : <Menu size={20} />}
                            </button>
                        </div>
                    </div>

                    {/* Mobile Menu */}
                    {showMobileMenu && (
                        <div className="md:hidden mt-4 pt-4 border-t border-white/5 space-y-2 animate-in slide-in-from-top-2">
                            <div className="flex items-center justify-between mb-4">
                                <span className={`text-xs font-medium ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                    {status === 'connected' ? '🟢 Connected' : '🟡 Reconnecting...'}
                                </span>
                                <button
                                    onClick={toggleTheme}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'}`}
                                >
                                    {isDark ? '☀️ Light Mode' : '🌙 Dark Mode'}
                                </button>
                            </div>

                            <div className="grid grid-cols-1 gap-2">
                                <label className={`flex items-center justify-center gap-2 rounded-md px-4 py-3 text-sm font-medium transition-colors cursor-pointer ${isDark ? 'bg-emerald-500/10 text-emerald-300' : 'bg-emerald-50 text-emerald-600'}`}>
                                    <Upload size={16} className="mr-2" />
                                    Import
                                    <input
                                        type="file"
                                        onChange={handleImport}
                                        className="hidden"
                                        accept=".txt,.js,.py,.md,.html,.css,.json"
                                    />
                                </label>
                            </div>

                            <button
                                onClick={handleShare}
                                className={`w-full rounded-md px-4 py-3 text-sm font-medium transition-colors ${isDark ? 'bg-cyan-500/10 text-cyan-300' : 'bg-cyan-50 text-cyan-600'}`}
                            >
                                🔗 Share
                            </button>

                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={handleDownload}
                                    className={`rounded-md px-4 py-3 text-sm font-medium transition-colors ${isDark ? 'bg-indigo-500/10 text-indigo-300' : 'bg-indigo-50 text-indigo-600'}`}
                                >
                                    ↓ Text
                                </button>
                                <button
                                    onClick={handleExportPdf}
                                    className={`rounded-md px-4 py-3 text-sm font-medium transition-colors ${isDark ? 'bg-indigo-500/10 text-indigo-300' : 'bg-indigo-50 text-indigo-600'}`}
                                >
                                    ↓ PDF
                                </button>
                            </div>

                            <button
                                onClick={() => { setShowHistory(true); setShowMobileMenu(false); }}
                                className={`w-full rounded-md px-4 py-3 text-sm font-medium transition-colors ${isDark ? 'bg-purple-500/10 text-purple-300' : 'bg-purple-50 text-purple-600'}`}
                            >
                                📜 Version History
                            </button>

                            <button
                                onClick={handleDelete}
                                className={`w-full rounded-md px-4 py-3 text-sm font-medium transition-colors ${isDark ? 'bg-rose-500/10 text-rose-300' : 'bg-rose-50 text-rose-600'}`}
                            >
                                🗑️ Delete Document
                            </button>
                        </div>
                    )}
                </header>

                {/* Editor */}
                <main className="flex-1 overflow-hidden flex flex-col relative">
                    <div className={`flex-1 overflow-hidden flex flex-col ${isDark ? 'bg-slate-950' : 'bg-white'}`}>
                        <div ref={editorRef} className="flex-1 overflow-auto" />
                    </div>
                    {/* Footer Stats */}
                    <div className={`border-t px-6 py-3 text-xs flex justify-end gap-4 ${isDark ? 'border-white/5 text-slate-500' : 'border-slate-100 text-slate-400'}`}>
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
