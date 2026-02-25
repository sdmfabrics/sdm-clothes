'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shirt, Loader2, AlertCircle } from 'lucide-react';

export default function SetupPage() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [allowed, setAllowed] = useState<boolean | null>(null);

    useEffect(() => {
        fetch('/api/setup')
            .then((r) => r.json())
            .then((data) => setAllowed(data.allowed === true))
            .catch(() => setAllowed(false));
    }, []);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!name.trim() || !email.trim() || !password) {
            setError('Name, email, and password are required.');
            return;
        }
        if (password.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/setup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Setup failed');
            router.push('/login');
            router.refresh();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    if (allowed === null) {
        return (
            <div className="min-h-screen bg-slate-100 flex items-center justify-center">
                <Loader2 className="animate-spin text-sky-500" size={36} />
            </div>
        );
    }

    if (allowed === false) {
        return (
            <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 max-w-sm text-center">
                    <p className="text-slate-600 mb-4">Setup is already complete. Users exist.</p>
                    <a href="/login" className="btn-primary inline-block">Go to Login</a>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-12 h-12 rounded-xl bg-sky-600 flex items-center justify-center">
                        <Shirt className="text-white" size={26} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800">SDM Fabrics</h1>
                        <p className="text-xs text-slate-500">Create owner account</p>
                    </div>
                </div>
                <h2 className="text-lg font-semibold text-slate-800 mb-6">First-time setup</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                            <AlertCircle size={16} className="flex-shrink-0" /> {error}
                        </div>
                    )}
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Name</label>
                        <input className="input w-full" value={name} onChange={(e) => setName(e.target.value)} placeholder="Owner name" required />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Email</label>
                        <input type="email" className="input w-full" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="owner@example.com" required />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Password (min 6)</label>
                        <input type="password" className="input w-full" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} />
                    </div>
                    <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 py-3">
                        {loading && <Loader2 size={18} className="animate-spin" />} Create owner
                    </button>
                </form>
                <p className="text-xs text-slate-500 mt-4 text-center">
                    <a href="/login" className="text-sky-600 hover:underline">Back to login</a>
                </p>
            </div>
        </div>
    );
}
