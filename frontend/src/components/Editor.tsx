import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightSpecialChars, drawSelection, dropCursor, rectangularSelection, crosshairCursor, highlightActiveLine } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { javascript } from '@codemirror/lang-javascript';
import { yCollab } from 'y-codemirror.next';
import { useCollaborativeDocument } from '../hooks/useCollaborativeDocument';
import { useAuthStore } from '../stores/authStore';
import api from '../services/api.service';
import { VersionHistory } from './VersionHistory';
import { Chat } from './Chat';

interface EditorProps {
    slug: string;
    title?: string;
}

export const CollaborativeEditor = ({ slug, title }: EditorProps) => {
    const { user } = useAuthStore();
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
                EditorView.theme({
                    '&': {
                        height: '100%',
                        backgroundColor: '#0f172a',
                        color: '#e2e8f0'
                    },
                    '.cm-content': {
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                        fontSize: '14px',
                        padding: '16px 0'
                    },
                    '.cm-gutters': {
                        backgroundColor: '#1e293b',
                        color: '#64748b',
                        border: 'none',
                        paddingRight: '8px'
                    },
                    '.cm-activeLineGutter': {
                        backgroundColor: '#334155'
                    },
                    '.cm-activeLine': {
                        backgroundColor: 'rgba(99, 102, 241, 0.05)'
                    },
                    '.cm-selectionBackground': {
                        backgroundColor: 'rgba(99, 102, 241, 0.2) !important'
                    },
                    '&.cm-focused .cm-selectionBackground': {
                        backgroundColor: 'rgba(99, 102, 241, 0.3) !important'
                    },
                    '.cm-cursor': {
                        borderLeftColor: '#6366f1'
                    },
                    '.cm-ySelectionInfo': {
                        position: 'absolute',
                        top: '-1.4em',
                        left: '-1px',
                        fontSize: '11px',
                        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
                        fontWeight: '500',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        color: 'white',
                        whiteSpace: 'nowrap',
                        zIndex: '101',
                        transition: 'opacity 0.3s ease',
                        pointerEvents: 'none'
                    },
                    '.cm-ySelectionCaret': {
                        position: 'relative',
                        borderLeft: '2px solid',
                        marginLeft: '-1px',
                        marginRight: '-1px',
                        boxSizing: 'border-box'
                    },
                    '.cm-ySelection': {
                        opacity: '0.3'
                    }
                })
            ]
        });

        const view = new EditorView({
            state,
            parent: editorRef.current
        });

        viewRef.current = view;

        return () => {
            view.destroy();
            viewRef.current = null;
        };
    }, [ydoc, provider]);

    return (
        <div className="flex min-h-screen bg-slate-950">
            <div className="flex flex-1 flex-col">
                {/* Header */}
                <header className="border-b border-white/5 bg-slate-900/60 px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link
                                to="/"
                                className="text-slate-400 hover:text-indigo-400 transition-colors text-sm font-medium"
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
                                    className="rounded-md border border-white/10 bg-slate-900 px-3 py-1 text-lg font-semibold text-white outline-none focus:border-indigo-500"
                                    autoFocus
                                />
                            ) : (
                                <h1
                                    className="text-lg font-semibold text-white cursor-pointer hover:text-slate-300 transition-colors"
                                    onClick={() => setIsEditingTitle(true)}
                                >
                                    {title ?? slug}
                                </h1>
                            )}
                        </div>
                        <div className="flex items-center gap-4">
                            <label className="rounded-md bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-300 hover:bg-emerald-500/20 transition-colors cursor-pointer">
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
                                className="rounded-md bg-indigo-500/10 px-4 py-2 text-sm font-medium text-indigo-300 hover:bg-indigo-500/20 transition-colors"
                            >
                                ↓ Download
                            </button>
                            <button
                                onClick={handleShare}
                                className="rounded-md bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-300 hover:bg-cyan-500/20 transition-colors"
                            >
                                🔗 Share
                            </button>
                            <button
                                onClick={() => setShowChat(!showChat)}
                                className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${showChat
                                    ? 'bg-emerald-500/20 text-emerald-300'
                                    : 'bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                                    }`}
                            >
                                💬 Chat
                            </button>
                            <button
                                onClick={() => setShowHistory(true)}
                                className="rounded-md bg-purple-500/10 px-4 py-2 text-sm font-medium text-purple-300 hover:bg-purple-500/20 transition-colors"
                            >
                                📜 History
                            </button>
                            <button
                                onClick={handleDelete}
                                className="rounded-md bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-300 hover:bg-rose-500/20 transition-colors"
                            >
                                Delete
                            </button>
                            <div className="flex items-center gap-2 text-sm">
                                <span className={`h-2 w-2 rounded-full ${status === 'connected' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                                <span className="text-slate-400">
                                    {status === 'connected' ? 'Connected' : 'Reconnecting...'}
                                </span>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Editor */}
                <main className="flex-1 overflow-hidden p-6">
                    <div className="h-full rounded-2xl border border-white/5 bg-slate-900/60 shadow-xl overflow-hidden">
                        <div ref={editorRef} className="h-full" />
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
