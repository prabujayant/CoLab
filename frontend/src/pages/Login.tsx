import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api.service';
import { useAuthStore } from '../stores/authStore';

export const Login = () => {
    const navigate = useNavigate();
    const setAuth = useAuthStore((state) => state.setAuth);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const { data } = await api.post('/auth/login', { email, password });
            setAuth(data.token, data.refreshToken, data.user);
            navigate('/');
        } catch (err: any) {
            setError(err?.response?.data?.error ?? 'Unable to log in');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6">
            <form
                onSubmit={handleSubmit}
                className="w-full max-w-md space-y-6 rounded-2xl border border-white/5 bg-slate-900/60 p-8 shadow-xl"
            >
                <div>
                    <h1 className="text-2xl font-semibold text-white">Sign in</h1>
                    <p className="text-sm text-slate-400">Collaborate in real-time with your team.</p>
                </div>
                {error && <p className="rounded-md bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</p>}
                <label className="block text-sm text-slate-300">
                    Email
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="mt-1 w-full rounded-md border border-white/10 bg-slate-900 px-3 py-2 text-white outline-none focus:border-indigo-500"
                        required
                    />
                </label>
                <label className="block text-sm text-slate-300">
                    Password
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="mt-1 w-full rounded-md border border-white/10 bg-slate-900 px-3 py-2 text-white outline-none focus:border-indigo-500"
                        required
                    />
                </label>
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-md bg-indigo-500 py-2 font-semibold text-white hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {loading ? 'Signing in...' : 'Sign in'}
                </button>
                <p className="text-center text-sm text-slate-400">
                    Need an account?{' '}
                    <Link to="/signup" className="text-indigo-400 hover:text-indigo-300">
                        Sign up
                    </Link>
                </p>
            </form>
        </div>
    );
};
