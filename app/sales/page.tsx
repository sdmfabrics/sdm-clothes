'use client';
import { useEffect, useState } from 'react';
import {
    Search, Calendar, ShoppingBag, Eye, Loader2, BarChart3, TrendingUp,
} from 'lucide-react';
import Link from 'next/link';

interface SaleItem {
    fabricType: string;
    colour: string;
    price: number;
    qty: number;
    subtotal: number;
}

interface Sale {
    _id: string;
    date: string;
    items: SaleItem[];
    totalAmount: number;
    paymentMethod?: 'cash' | 'card';
}

export default function SalesHistoryPage() {
    const [sales, setSales] = useState<Sale[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterDate, setFilterDate] = useState('');

    useEffect(() => {
        fetch('/api/sales')
            .then(r => r.json())
            .then(data => {
                setSales(Array.isArray(data) ? data : []);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    const filtered = sales.filter(sale => {
        const matchSearch = sale.items.some(i =>
            `${i.fabricType} ${i.colour}`.toLowerCase().includes(search.toLowerCase())
        );
        const matchDate = !filterDate || sale.date.startsWith(filterDate);
        return matchSearch && matchDate;
    });

    const totalRevenue = filtered.reduce((acc, s) => acc + s.totalAmount, 0);
    const totalItems = filtered.reduce((acc, s) => acc + s.items.reduce((sum, i) => sum + i.qty, 0), 0);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="animate-spin text-sky-500" size={36} />
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Sales History</h1>
                    <p className="text-sm text-slate-500">{sales.length} total transactions</p>
                </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="card flex items-center gap-4">
                    <div className="bg-sky-50 text-sky-600 p-3 rounded-xl">
                        <TrendingUp size={22} />
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 font-medium">Filtered Revenue</p>
                        <p className="text-xl font-bold text-slate-800">Rs. {totalRevenue.toLocaleString()}</p>
                    </div>
                </div>
                <div className="card flex items-center gap-4">
                    <div className="bg-violet-50 text-violet-600 p-3 rounded-xl">
                        <ShoppingBag size={22} />
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 font-medium">Filtered Quantity</p>
                        <p className="text-xl font-bold text-slate-800">{totalItems} pcs</p>
                    </div>
                </div>
                <div className="card flex items-center gap-4">
                    <div className="bg-emerald-50 text-emerald-600 p-3 rounded-xl">
                        <BarChart3 size={22} />
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 font-medium">Transactions</p>
                        <p className="text-xl font-bold text-slate-800">{filtered.length}</p>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="card !p-4 flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-[200px]">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        className="input pl-9"
                        placeholder="Search items in sales…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <div className="relative w-full md:w-auto">
                    <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="date"
                        className="input pl-9"
                        value={filterDate}
                        onChange={e => setFilterDate(e.target.value)}
                    />
                </div>
                <button
                    onClick={() => { setSearch(''); setFilterDate(''); }}
                    className="text-sm text-sky-600 font-medium hover:underline px-2"
                >
                    Reset
                </button>
            </div>

            {/* Table */}
            <div className="card !p-0 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100 text-left">
                                <th className="px-5 py-3.5 font-semibold text-slate-600">Date & Time</th>
                                <th className="px-5 py-3.5 font-semibold text-slate-600">Items Sold</th>
                                <th className="px-5 py-3.5 font-semibold text-slate-600">Total Pieces</th>
                                <th className="px-5 py-3.5 font-semibold text-slate-600 font-bold">Total Amount</th>
                                <th className="px-5 py-3.5 font-semibold text-slate-600 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="text-center py-12 text-slate-400">
                                        No transactions found.
                                    </td>
                                </tr>
                            )}
                            {filtered.map(sale => {
                                const saleDate = new Date(sale.date);
                                const totalQty = sale.items.reduce((s, i) => s + i.qty, 0);
                                return (
                                    <tr key={sale._id} className="hover:bg-slate-50 transition">
                                        <td className="px-5 py-4">
                                            <div className="font-medium text-slate-800">
                                                {saleDate.toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </div>
                                            <div className="text-xs text-slate-400 mt-0.5">
                                                {saleDate.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="max-w-xs truncate text-slate-600" title={sale.items.map(i => `${i.fabricType} ${i.colour}`).join(', ')}>
                                                {sale.items.map(i => `${i.fabricType} ${i.colour}`).join(', ')}
                                            </div>
                                            {sale.items.length > 1 && (
                                                <div className="text-xs text-sky-600 font-medium mt-0.5">
                                                    +{sale.items.length - 1} more items
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-5 py-4 text-slate-600">
                                            {totalQty} pcs
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className="font-bold text-slate-800 text-base">
                                                Rs. {sale.totalAmount.toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            <Link
                                                href={`/receipt/${sale._id}`}
                                                className="inline-flex items-center gap-2 bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-sky-50 hover:text-sky-600 transition"
                                            >
                                                <Eye size={14} /> View Receipt
                                            </Link>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
