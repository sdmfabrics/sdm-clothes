'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import {
    LayoutDashboard,
    ShoppingCart,
    Package,
    AlertTriangle,
    Shirt,
    Menu,
    X,
    ClipboardList,
    Users,
} from 'lucide-react';
import { useState } from 'react';
import ConnectionStatus from '@/components/ConnectionStatus';

type Role = 'owner' | 'cashier_pos' | 'cashier_inventory';

const ALL_NAV_ITEMS = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['owner'] as Role[] },
    { label: 'POS / Billing', href: '/pos', icon: ShoppingCart, roles: ['owner', 'cashier_pos', 'cashier_inventory'] as Role[] },
    { label: 'Sales History', href: '/sales', icon: ClipboardList, roles: ['owner'] as Role[] },
    { label: 'Inventory', href: '/inventory', icon: Package, roles: ['owner', 'cashier_inventory'] as Role[] },
    { label: 'Low Stock Alerts', href: '/alerts', icon: AlertTriangle, roles: ['owner'] as Role[] },
    { label: 'Users', href: '/users', icon: Users, roles: ['owner'] as Role[] },
];

function navItemsForRole(role: Role | undefined) {
    if (!role) return ALL_NAV_ITEMS.filter((i) => i.href === '/pos');
    return ALL_NAV_ITEMS.filter((item) => item.roles.includes(role));
}

export default function Sidebar() {
    const pathname = usePathname();
    const { data: session, status } = useSession();
    const role = (session?.user as any)?.role as Role | undefined;
    const items = navItemsForRole(role);
    const [open, setOpen] = useState(false);

    return (
        <>
            {/* Mobile top bar */}
            <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-200 flex items-center justify-between px-4 h-14">
                <div className="flex items-center gap-2">
                    <Shirt className="text-sky-600" size={22} />
                    <span className="font-bold text-slate-800 text-sm">SDM Fabrics</span>
                </div>
                <div className="flex items-center gap-3">
                    <ConnectionStatus />
                    <button onClick={() => setOpen(!open)} className="p-2 rounded-lg hover:bg-slate-100">
                        {open ? <X size={20} /> : <Menu size={20} />}
                    </button>
                </div>
            </div>

            {open && (
                <div
                    className="lg:hidden fixed inset-0 z-40 bg-black/30"
                    onClick={() => setOpen(false)}
                />
            )}

            <aside
                className={`
          fixed top-0 left-0 h-full w-60 bg-white border-r border-slate-100 z-50 flex flex-col
          transform transition-transform duration-200 ease-in-out
          ${open ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
            >
                <div className="flex items-center gap-3 px-5 py-6 border-b border-slate-100">
                    <div className="w-9 h-9 rounded-xl bg-sky-600 flex items-center justify-center flex-shrink-0">
                        <Shirt size={18} className="text-white" />
                    </div>
                    <div>
                        <p className="font-bold text-slate-800 text-sm leading-tight">SDM Fabrics</p>
                        <p className="text-xs text-slate-400">POS & Inventory</p>
                        <div className="mt-1">
                            <ConnectionStatus />
                        </div>
                    </div>
                </div>

                <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
                    {items.map(({ label, href, icon: Icon }) => {
                        const active = pathname === href || pathname.startsWith(href + '/');
                        return (
                            <Link
                                key={href}
                                href={href}
                                onClick={() => setOpen(false)}
                                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                  ${active
                                    ? 'bg-sky-600 text-white shadow-sm shadow-sky-200'
                                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                }
                `}
                            >
                                <Icon size={18} className={active ? 'text-white' : 'text-slate-400'} />
                                {label}
                            </Link>
                        );
                    })}
                </nav>

                <div className="px-5 py-4 border-t border-slate-100 space-y-2">
                    {session?.user && (
                        <p className="text-xs text-slate-500 truncate" title={session.user.email ?? ''}>
                            {session.user.name ?? session.user.email}
                        </p>
                    )}
                    <button
                        onClick={() => signOut({ callbackUrl: '/login' })}
                        className="text-xs font-medium text-slate-500 hover:text-red-600 transition"
                    >
                        Sign out
                    </button>
                </div>
            </aside>
        </>
    );
}
