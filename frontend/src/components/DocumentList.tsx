import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api.service';
import { useAuthStore } from '../stores/authStore';

interface DocumentSummary {
    id: string;
    title: string;
    slug: string;
    createdAt: string;
    updatedAt: string;
}

export const DocumentList = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuthStore();
    const [documents, setDocuments] = useState<DocumentSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchDocuments = async () => {
            try {
                const { data } = await api.get<{ documents: DocumentSummary[] }>('/documents');
                setDocuments(data.documents);
                setError(null);
            } catch (err: any) {
                if (err?.response?.status === 401) {
                    logout();
                    navigate('/login');
                } else {
                    setError('Failed to load documents');
                }
            } finally {
                setLoading(false);
            }
        };

        fetchDocuments();
    }, [logout, navigate]);

    const handleCreateDocument = async () => {
        try {
            const { data } = await api.post<{ document: DocumentSummary }>('/documents', {
                title: `Document ${documents.length + 1}`
            });
            setDocuments((prev) => [data.document, ...prev]);
            navigate(`/documents/${data.document.slug}`);
        } catch (err: any) {
            if (err?.response?.status === 401) {
                logout();
                navigate('/login');
            } else {
                setError('Unable to create document');
            }
        }
    };

    const emptyState = !loading && documents.length === 0;

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            <header className="flex items-center justify-between border-b border-white/5 px-8 py-6">
                <div>
                    <p className="text-sm text-slate-400">Welcome back</p>
                    <h1 className="text-2xl font-semibold">{user?.displayName ?? user?.email}</h1>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => {
                            logout();
                            navigate('/login');
                        }}
                        className="rounded-md border border-white/20 px-3 py-2 text-sm text-slate-300 hover:border-white/40"
                    >
                        Logout
                    </button>
                    <button
                        onClick={handleCreateDocument}
                        className="rounded-md bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400"
                    >
                        + New Document
                    </button>
                </div>
            </header>

            <main className="px-8 py-10">
                {loading && <p className="text-slate-400">Loading your workspace...</p>}
                {error && <p className="text-rose-400">{error}</p>}
                {emptyState && (
                    <div className="rounded-lg border border-dashed border-white/10 p-10 text-center text-slate-400">
                        <p>No documents yet.</p>
                        <p className="text-sm">Click "New Document" to start collaborating.</p>
                    </div>
                )}

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {documents.map((doc) => (
                        <article
                            key={doc.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => navigate(`/documents/${doc.slug}`)}
                            className="rounded-xl border border-white/5 bg-white/5 p-5 transition hover:border-indigo-500/60 hover:bg-white/10"
                        >
                            <h2 className="text-lg font-semibold">{doc.title}</h2>
                            <p className="text-sm text-slate-400">{formatDate(doc.updatedAt)}</p>
                            <p className="mt-4 text-xs uppercase tracking-wide text-slate-500">{doc.slug}</p>
                        </article>
                    ))}
                </div>
            </main>
        </div>
    );
};

const formatDate = (iso: string) => {
    const date = new Date(iso);
    return date.toLocaleString();
};
