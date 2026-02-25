'use client';

import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import ConnectionStatus from '@/components/ConnectionStatus';

export default function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    if (pathname === '/login' || pathname === '/setup') {
        return <>{children}</>;
    }
    return (
        <div className="flex min-h-screen">
            <Sidebar />
            <div className="flex-1 lg:ml-60 flex flex-col min-h-screen">
                <div className="pt-14 lg:pt-0 flex-1 flex flex-col">
                    <div className="hidden lg:flex items-center justify-end h-14 px-6 bg-white border-b border-slate-200 sticky top-0 z-40">
                        <ConnectionStatus />
                    </div>
                    <div className="flex-1">{children}</div>
                </div>
            </div>
        </div>
    );
}
