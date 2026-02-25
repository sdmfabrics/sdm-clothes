'use client';
import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
            <div className="card text-center py-14 space-y-4 max-w-sm w-full">
                <AlertTriangle size={48} className="text-red-400 mx-auto" />
                <h2 className="text-xl font-bold text-slate-800">Something went wrong</h2>
                <p className="text-sm text-slate-500 break-words">{error.message || 'An unexpected error occurred.'}</p>
                <button
                    onClick={() => reset()}
                    className="btn-primary inline-flex items-center gap-2 mx-auto"
                >
                    <RefreshCw size={15} /> Try Again
                </button>
            </div>
        </div>
    );
}
