import Link from 'next/link';
import { Home } from 'lucide-react';

export default function NotFound() {
    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
            <div className="card text-center py-14 space-y-4 max-w-sm w-full">
                <p className="text-6xl font-black text-slate-200">404</p>
                <h2 className="text-xl font-bold text-slate-800">Page Not Found</h2>
                <p className="text-sm text-slate-500">The page you're looking for doesn't exist.</p>
                <Link href="/dashboard" className="btn-primary inline-flex items-center gap-2 mx-auto">
                    <Home size={15} /> Go to Dashboard
                </Link>
            </div>
        </div>
    );
}
