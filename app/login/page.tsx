'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Shirt, Loader2, AlertCircle } from 'lucide-react';

export default function LoginPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await signIn('credentials', {
                email: email.trim().toLowerCase(),
                password,
                redirect: false,
            });
            if (res?.error) {
                setError('Invalid email or password.');
                setLoading(false);
                return;
            }
            router.push(callbackUrl);
            router.refresh();
        } catch {
            setError('Something went wrong.');
            setLoading(false);
        }
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
                        <p className="text-xs text-slate-500">POS & Inventory</p>
                    </div>
                </div>
                <h2 className="text-lg font-semibold text-slate-800 mb-6">Sign in</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                            <AlertCircle size={16} className="flex-shrink-0" /> {error}
                        </div>
                    )}
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Email</label>
                        <input
                            type="email"
                            className="input w-full"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            autoComplete="email"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Password</label>
                        <input
                            type="password"
                            className="input w-full"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            autoComplete="current-password"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary w-full flex items-center justify-center gap-2 py-3"
                    >
                        {loading ? <Loader2 size={18} className="animate-spin" /> : null}
                        Sign in
                    </button>
                </form>
                <p className="text-xs text-slate-500 mt-4 text-center">
                    First time? <a href="/setup" className="text-sky-600 hover:underline">Create owner account</a>
                </p>
            </div>
        </div>
    );
}
