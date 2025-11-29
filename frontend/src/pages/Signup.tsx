import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api.service';

export const Signup = () => {
    const navigate = useNavigate();
    const [form, setForm] = useState({ email: '', password: '', displayName: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);
        try {
            await api.post('/auth/register', form);
            setSuccess('Account created! Please sign in.');
            setTimeout(() => navigate('/login'), 1200);
        } catch (err: any) {
            console.error('Signup error:', err);
            const status = err?.response?.status;
            const statusText = err?.response?.statusText;
            const serverError = err?.response?.data?.error;

            let errorMessage = 'Unable to sign up';
            if (serverError) errorMessage = serverError;
            else if (status) errorMessage = `Error ${status}: ${statusText || 'Unknown error'}`;
            else if (err.message) errorMessage = err.message;

            setError(errorMessage);
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
                    <h1 className="text-2xl font-semibold text-white">Create account</h1>
                    <p className="text-sm text-slate-400">Invite your team and start collaborating.</p>
                </div>
                {error && <p className="rounded-md bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</p>}
                {success && <p className="rounded-md bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">{success}</p>}
                <label className="block text-sm text-slate-300">
                    Display name
                    <input
                        name="displayName"
                        value={form.displayName}
                        onChange={handleChange}
                        className="mt-1 w-full rounded-md border border-white/10 bg-slate-900 px-3 py-2 text-white outline-none focus:border-indigo-500"
                        required
                    />
                </label>
                <label className="block text-sm text-slate-300">
                    Email
                    <input
                        name="email"
                        type="email"
                        value={form.email}
                        onChange={handleChange}
                        className="mt-1 w-full rounded-md border border-white/10 bg-slate-900 px-3 py-2 text-white outline-none focus:border-indigo-500"
                        required
                    />
                </label>
                <label className="block text-sm text-slate-300">
                    Password
                    <input
                        name="password"
                        type="password"
                        value={form.password}
                        onChange={handleChange}
                        className="mt-1 w-full rounded-md border border-white/10 bg-slate-900 px-3 py-2 text-white outline-none focus:border-indigo-500"
                        required
                        minLength={8}
                    />
                </label>
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-md bg-indigo-500 py-2 font-semibold text-white hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {loading ? 'Creating account...' : 'Sign up'}
                </button>
                <p className="text-center text-sm text-slate-400">
                    Already have an account?{' '}
                    <Link to="/login" className="text-indigo-400 hover:text-indigo-300">
                        Sign in
                    </Link>
                </p>
            </form>
        </div>
    );
};
