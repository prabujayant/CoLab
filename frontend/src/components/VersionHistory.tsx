import { useEffect, useState } from 'react';
import api from '../services/api.service';
import * as Diff from 'diff';

interface Snapshot {
    id: string;
    timestamp: string;
    size: number;
}

interface VersionHistoryProps {
    slug: string;
    currentContent: string;
    onRestore: (content: string) => void;
    onClose: () => void;
}

export const VersionHistory = ({ slug, currentContent, onRestore, onClose }: VersionHistoryProps) => {
    const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
    const [selectedSnapshot, setSelectedSnapshot] = useState<string | null>(null);
    const [snapshotContent, setSnapshotContent] = useState<string>('');
    const [showDiff, setShowDiff] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchHistory();
    }, [slug]);

    const fetchHistory = async () => {
        try {
            const { data } = await api.get(`/documents/${slug}/history`);
            setSnapshots(data.snapshots || []);
        } catch (error) {
            console.error('Failed to fetch history', error);
        } finally {
            setLoading(false);
        }
    };

    const viewSnapshot = async (snapshotId: string) => {
        try {
            const { data } = await api.get(`/documents/${slug}/snapshot/${snapshotId}`);
            setSnapshotContent(data.content);
            setSelectedSnapshot(snapshotId);
            setShowDiff(true);
        } catch (error) {
            console.error('Failed to fetch snapshot', error);
        }
    };

    const handleRestore = () => {
        if (confirm('Are you sure you want to restore this version? This will replace the current content.')) {
            onRestore(snapshotContent);
            onClose();
        }
    };

    const renderDiff = () => {
        const diff = Diff.diffLines(snapshotContent, currentContent);
        return (
            <div className="font-mono text-xs overflow-auto max-h-96">
                {diff.map((part, index) => {
                    const bgColor = part.added ? 'bg-emerald-900/30' : part.removed ? 'bg-rose-900/30' : '';
                    const textColor = part.added ? 'text-emerald-300' : part.removed ? 'text-rose-300' : 'text-slate-300';
                    const prefix = part.added ? '+ ' : part.removed ? '- ' : '  ';

                    return (
                        <div key={index} className={`${bgColor} ${textColor} px-2 py-0.5`}>
                            {part.value.split('\n').map((line, i) => (
                                <div key={i}>{prefix}{line}</div>
                            ))}
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="fixed right-0 top-0 h-full w-96 bg-slate-900 border-l border-white/10 shadow-2xl z-50 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
                <h2 className="text-lg font-semibold text-white">Version History</h2>
                <button
                    onClick={onClose}
                    className="text-slate-400 hover:text-white transition-colors"
                >
                    ✕
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
                {loading ? (
                    <div className="text-slate-400 text-center py-8">Loading...</div>
                ) : snapshots.length === 0 ? (
                    <div className="text-slate-400 text-center py-8">
                        No snapshots yet. Keep editing to create snapshots!
                    </div>
                ) : showDiff && selectedSnapshot ? (
                    <div>
                        <button
                            onClick={() => setShowDiff(false)}
                            className="text-indigo-400 hover:text-indigo-300 text-sm mb-4"
                        >
                            ← Back to timeline
                        </button>
                        <div className="mb-4">
                            <h3 className="text-white font-medium mb-2">Changes</h3>
                            <p className="text-slate-400 text-sm mb-4">
                                Comparing snapshot with current version
                            </p>
                            {renderDiff()}
                        </div>
                        <button
                            onClick={handleRestore}
                            className="w-full rounded-md bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-600 transition-colors"
                        >
                            Restore This Version
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {snapshots.map((snapshot) => (
                            <div
                                key={snapshot.id}
                                className="bg-slate-800/50 rounded-lg p-4 border border-white/5 hover:border-indigo-500/50 transition-colors cursor-pointer"
                                onClick={() => viewSnapshot(snapshot.id)}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-white font-medium">
                                        {snapshot.id === 'current' ? 'Current Version' : 'Snapshot'}
                                    </span>
                                    <span className="text-xs text-slate-400">
                                        {new Date(snapshot.timestamp).toLocaleString()}
                                    </span>
                                </div>
                                <div className="text-xs text-slate-400">
                                    {(snapshot.size / 1024).toFixed(1)} KB
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
