'use client';
import { useEffect, useState, useCallback } from 'react';
import {
    Search, Calendar, ShoppingBag, Eye, Loader2, BarChart3, TrendingUp,
    Pencil, Trash2, X, Plus, Minus, Save, AlertTriangle, CheckCircle2,
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

interface Toast {
    id: number;
    type: 'success' | 'error';
    message: string;
}

let toastId = 0;

export default function SalesHistoryPage() {
    const [sales, setSales] = useState<Sale[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterDate, setFilterDate] = useState('');
    const [toasts, setToasts] = useState<Toast[]>([]);

    // Delete state
    const [deleteTarget, setDeleteTarget] = useState<Sale | null>(null);
    const [deleting, setDeleting] = useState(false);

    // Edit state
    const [editTarget, setEditTarget] = useState<Sale | null>(null);
    const [editItems, setEditItems] = useState<SaleItem[]>([]);
    const [saving, setSaving] = useState(false);

    const showToast = useCallback((type: 'success' | 'error', message: string) => {
        const id = ++toastId;
        setToasts(prev => [...prev, { id, type, message }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
    }, []);

    const loadSales = useCallback(() => {
        setLoading(true);
        fetch('/api/sales')
            .then(r => r.json())
            .then(data => {
                setSales(Array.isArray(data) ? data : []);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    useEffect(() => { loadSales(); }, [loadSales]);

    const filtered = sales.filter(sale => {
        const matchSearch = sale.items.some(i =>
            `${i.fabricType} ${i.colour}`.toLowerCase().includes(search.toLowerCase())
        );
        const matchDate = !filterDate || sale.date.startsWith(filterDate);
        return matchSearch && matchDate;
    });

    const totalRevenue = filtered.reduce((acc, s) => acc + s.totalAmount, 0);
    const totalItems = filtered.reduce((acc, s) => acc + s.items.reduce((sum, i) => sum + i.qty, 0), 0);

    // ── Delete ──────────────────────────────────────────────────────────────
    const confirmDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            const res = await fetch(`/api/sales/${deleteTarget._id}`, { method: 'DELETE' });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to delete sale.');
            }
            setSales(prev => prev.filter(s => s._id !== deleteTarget._id));
            showToast('success', 'Sale deleted and inventory restored.');
        } catch (err: any) {
            showToast('error', err.message);
        } finally {
            setDeleting(false);
            setDeleteTarget(null);
        }
    };

    // ── Edit helpers ────────────────────────────────────────────────────────
    const openEdit = (sale: Sale) => {
        setEditTarget(sale);
        setEditItems(sale.items.map(i => ({ ...i })));
    };

    const closeEdit = () => {
        setEditTarget(null);
        setEditItems([]);
    };

    const updateEditItem = (idx: number, field: keyof SaleItem, value: string | number) => {
        setEditItems(prev => {
            const next = [...prev];
            const item = { ...next[idx], [field]: field === 'fabricType' || field === 'colour' ? String(value) : Number(value) };
            item.subtotal = item.price * item.qty;
            next[idx] = item;
            return next;
        });
    };

    const removeEditItem = (idx: number) => {
        setEditItems(prev => prev.filter((_, i) => i !== idx));
    };

    const addEditItem = () => {
        setEditItems(prev => [...prev, { fabricType: '', colour: '', price: 0, qty: 1, subtotal: 0 }]);
    };

    const editTotal = editItems.reduce((sum, i) => sum + i.subtotal, 0);

    const saveEdit = async () => {
        if (!editTarget) return;
        if (editItems.length === 0) {
            showToast('error', 'A sale must have at least one item. Use delete if you want to remove the sale entirely.');
            return;
        }
        for (const item of editItems) {
            if (!item.fabricType.trim() || !item.colour.trim()) {
                showToast('error', 'All items must have a fabric type and colour.');
                return;
            }
            if (item.qty <= 0) {
                showToast('error', 'Quantity must be at least 1 for each item.');
                return;
            }
            if (item.price <= 0) {
                showToast('error', 'Price must be greater than 0 for each item.');
                return;
            }
        }
        setSaving(true);
        try {
            const res = await fetch(`/api/sales/${editTarget._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items: editItems }),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to update sale.');
            }
            const updated: Sale = await res.json();
            setSales(prev => prev.map(s => s._id === updated._id ? updated : s));
            showToast('success', 'Sale updated successfully. Inventory adjusted.');
            closeEdit();
        } catch (err: any) {
            showToast('error', err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="animate-spin text-sky-500" size={36} />
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Toast Notifications */}
            <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
                {toasts.map(t => (
                    <div key={t.id} className={`flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white transition-all animate-fade-in
                        ${t.type === 'success' ? 'bg-emerald-600' : 'bg-red-500'}`}>
                        {t.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                        {t.message}
                    </div>
                ))}
            </div>

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
                                <th className="px-5 py-3.5 font-semibold text-slate-600">Date &amp; Time</th>
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
                                        <td className="px-5 py-4">
                                            <div className="flex items-center justify-end gap-2 flex-wrap">
                                                <Link
                                                    href={`/receipt/${sale._id}`}
                                                    className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-sky-50 hover:text-sky-600 transition"
                                                >
                                                    <Eye size={13} /> Receipt
                                                </Link>
                                                <button
                                                    onClick={() => openEdit(sale)}
                                                    className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-amber-100 transition"
                                                >
                                                    <Pencil size={13} /> Edit
                                                </button>
                                                <button
                                                    onClick={() => setDeleteTarget(sale)}
                                                    className="inline-flex items-center gap-1.5 bg-red-50 text-red-600 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-red-100 transition"
                                                >
                                                    <Trash2 size={13} /> Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── DELETE CONFIRMATION MODAL ─────────────────────────────── */}
            {deleteTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="bg-red-100 text-red-600 p-2.5 rounded-xl">
                                <Trash2 size={20} />
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-slate-800">Delete Sale?</h2>
                                <p className="text-xs text-slate-500 mt-0.5">This action cannot be undone.</p>
                            </div>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-700 space-y-1">
                            <p><span className="font-semibold">Amount:</span> Rs. {deleteTarget.totalAmount.toLocaleString()}</p>
                            <p><span className="font-semibold">Items:</span> {deleteTarget.items.map(i => `${i.fabricType} ${i.colour} ×${i.qty}`).join(', ')}</p>
                            <p className="text-xs text-emerald-600 font-medium pt-1">Stock for all items will be restored.</p>
                        </div>
                        <div className="flex gap-3 pt-1">
                            <button
                                onClick={() => setDeleteTarget(null)}
                                disabled={deleting}
                                className="btn-secondary flex-1"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                disabled={deleting}
                                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2.5 rounded-xl transition-all duration-150 active:scale-95 text-sm flex items-center justify-center gap-2"
                            >
                                {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                                {deleting ? 'Deleting…' : 'Yes, Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── EDIT SALE MODAL ───────────────────────────────────────── */}
            {editTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4 py-6">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                            <div className="flex items-center gap-3">
                                <div className="bg-amber-100 text-amber-700 p-2.5 rounded-xl">
                                    <Pencil size={18} />
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-slate-800">Edit Sale</h2>
                                    <p className="text-xs text-slate-500">
                                        {new Date(editTarget.date).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        {' · '}Receipt #{editTarget._id.slice(-6).toUpperCase()}
                                    </p>
                                </div>
                            </div>
                            <button onClick={closeEdit} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition">
                                <X size={18} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-3">
                            <p className="text-xs text-slate-500 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                                ⚠️ Editing adjusts inventory automatically — removed items restore stock, added items consume stock.
                            </p>

                            {/* Items List */}
                            {editItems.map((item, idx) => (
                                <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Item {idx + 1}</span>
                                        <button
                                            onClick={() => removeEditItem(idx)}
                                            disabled={editItems.length === 1}
                                            className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-700 disabled:opacity-40 disabled:cursor-not-allowed font-medium px-2 py-1 rounded-lg hover:bg-red-50 transition"
                                        >
                                            <Minus size={12} /> Remove
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 mb-1">Fabric Type</label>
                                            <input
                                                className="input text-sm"
                                                value={item.fabricType}
                                                onChange={e => updateEditItem(idx, 'fabricType', e.target.value)}
                                                placeholder="e.g. Lawn"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 mb-1">Colour</label>
                                            <input
                                                className="input text-sm"
                                                value={item.colour}
                                                onChange={e => updateEditItem(idx, 'colour', e.target.value)}
                                                placeholder="e.g. Red"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 mb-1">Price (Rs.)</label>
                                            <input
                                                type="number"
                                                className="input text-sm"
                                                value={item.price}
                                                min={1}
                                                onChange={e => updateEditItem(idx, 'price', e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 mb-1">Quantity (pcs)</label>
                                            <input
                                                type="number"
                                                className="input text-sm"
                                                value={item.qty}
                                                min={1}
                                                onChange={e => updateEditItem(idx, 'qty', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div className="text-right text-sm font-semibold text-slate-700">
                                        Subtotal: <span className="text-sky-600">Rs. {item.subtotal.toLocaleString()}</span>
                                    </div>
                                </div>
                            ))}

                            <button
                                onClick={addEditItem}
                                className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-slate-300 text-slate-500 hover:border-sky-400 hover:text-sky-600 rounded-xl py-3 text-sm font-medium transition"
                            >
                                <Plus size={15} /> Add Another Item
                            </button>
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-4">
                            <div className="text-sm font-bold text-slate-800">
                                New Total: <span className="text-sky-600 text-base">Rs. {editTotal.toLocaleString()}</span>
                                {editTotal !== editTarget.totalAmount && (
                                    <span className={`ml-2 text-xs font-semibold ${editTotal > editTarget.totalAmount ? 'text-emerald-600' : 'text-red-500'}`}>
                                        ({editTotal > editTarget.totalAmount ? '+' : ''}Rs. {(editTotal - editTarget.totalAmount).toLocaleString()})
                                    </span>
                                )}
                            </div>
                            <div className="flex gap-3">
                                <button onClick={closeEdit} disabled={saving} className="btn-secondary">
                                    Cancel
                                </button>
                                <button
                                    onClick={saveEdit}
                                    disabled={saving}
                                    className="btn-primary flex items-center gap-2"
                                >
                                    {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                                    {saving ? 'Saving…' : 'Save Changes'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
