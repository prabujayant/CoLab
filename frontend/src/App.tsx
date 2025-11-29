import { BrowserRouter, Navigate, Outlet, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { DocumentList } from './components/DocumentList';
import { CollaborativeEditor } from './components/Editor';
import { useAuthStore } from './stores/authStore';
import api from './services/api.service';

const PrivateRoute = () => {
    const token = useAuthStore((state) => state.token);
    return token ? <Outlet /> : <Navigate to="/login" replace />;
};

const EditorRoute = () => {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const [title, setTitle] = useState<string | undefined>();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDoc = async () => {
            if (!slug) return;
            try {
                const { data } = await api.get<{ document: { title: string } }>(`/documents/${slug}`);
                setTitle(data.document.title);
            } catch {
                navigate('/');
            } finally {
                setLoading(false);
            }
        };
        fetchDoc();
    }, [slug, navigate]);

    if (!slug) {
        return <Navigate to="/" replace />;
    }

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-950 text-white">
                Loading document...
            </div>
        );
    }

    return <CollaborativeEditor slug={slug} title={title} />;
};

import Dashboard from './pages/Dashboard';

const App = () => (
    <BrowserRouter>
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route element={<PrivateRoute />}>
                <Route path="/" element={<DocumentList />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/documents/:slug" element={<EditorRoute />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    </BrowserRouter>
);

export default App;
