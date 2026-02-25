'use client';
import { useState, useMemo, useEffect } from 'react';
import {
    Search, Plus, Pencil, Package2, Trash2, X, Check, RefreshCw, Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

interface InventoryItem {
    _id: string;
    fabricType: string;
    colour: string;
    price: number;
    stockQty: number;
    lowStockAlert: number;
}

type Status = 'in' | 'low' | 'out';

function getStatus(item: InventoryItem): Status {
    if (item.stockQty === 0) return 'out';
    if (item.stockQty <= item.lowStockAlert) return 'low';
    return 'in';
}

const StatusBadge = ({ status }: { status: Status }) => {
    if (status === 'in') return <span className="badge-green">● In Stock</span>;
    if (status === 'low') return <span className="badge-orange">● Low Stock</span>;
    return <span className="badge-red">● Out of Stock</span>;
};

export default function InventoryPage() {
    const { data: session } = useSession();
    const role = (session?.user as any)?.role as string | undefined;
    const canAdd = role === 'owner' || role === 'cashier_inventory';
    const canDelete = role === 'owner';
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterFabric, setFilterFabric] = useState('All');
    const [editItem, setEditItem] = useState<InventoryItem | null>(null);
    const [restockItem, setRestockItem] = useState<InventoryItem | null>(null);
    const [restockQty, setRestockQty] = useState('');
    const [editPrice, setEditPrice] = useState('');
    const [editAlert, setEditAlert] = useState('');
    const [toast, setToast] = useState<string | null>(null);
    const [toastType, setToastType] = useState<'success' | 'error'>('success');
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    // Fetch from API (online) or local cache (offline fallback)
    useEffect(() => {
        const load = async () => {
            try {
                const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
                const url = online ? '/api/inventory' : '/api/inventory/local';
                const res = await fetch(url);
                const data = await res.json();
                if (Array.isArray(data)) {
                    setItems(data);
                } else {
                    setItems([]);
                }
            } catch {
                try {
                    const res = await fetch('/api/inventory/local');
                    const data = await res.json();
                    setItems(Array.isArray(data) ? data : []);
                } catch {
                    setItems([]);
                }
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const fabrics = useMemo(() => ['All', ...Array.from(new Set(items.map(i => i.fabricType)))], [items]);

    const filtered = useMemo(() => items.filter(i => {
        const matchSearch = `${i.fabricType} ${i.colour}`.toLowerCase().includes(search.toLowerCase());
        const matchFabric = filterFabric === 'All' || i.fabricType === filterFabric;
        return matchSearch && matchFabric;
    }), [items, search, filterFabric]);

    function showToast(msg: string, type: 'success' | 'error' = 'success') {
        setToast(msg);
        setToastType(type);
        setTimeout(() => setToast(null), 3000);
    }

    function openEdit(item: InventoryItem) {
        setEditItem(item);
        setEditPrice(String(item.price));
        setEditAlert(String(item.lowStockAlert));
    }

    async function saveEdit() {
        if (!editItem) return;
        setSaving(true);
        try {
            const res = await fetch(`/api/inventory/${editItem._id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    price: Number(editPrice),
                    lowStockAlert: Number(editAlert),
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to update');
            setItems(prev => prev.map(i => i._id === editItem._id ? data : i));
            setEditItem(null);
            showToast('Item updated successfully!');
        } catch (err: any) {
            showToast(err.message, 'error');
        } finally {
            setSaving(false);
        }
    }

    function openRestock(item: InventoryItem) {
        setRestockItem(item);
        setRestockQty('');
    }

    async function saveRestock() {
        if (!restockItem || !restockQty || Number(restockQty) <= 0) return;
        setSaving(true);
        try {
            const res = await fetch(`/api/inventory/${restockItem._id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ addStock: Number(restockQty) }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to restock');
            setItems(prev => prev.map(i => i._id === restockItem._id ? data : i));
            showToast(`Restocked: +${restockQty} pcs added`);
            setRestockItem(null);
        } catch (err: any) {
            showToast(err.message, 'error');
        } finally {
            setSaving(false);
        }
    }

    async function deleteItem(id: string) {
        setSaving(true);
        try {
            const res = await fetch(`/api/inventory/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete');
            setItems(prev => prev.filter(i => i._id !== id));
            setDeleteId(null);
            showToast('Item deleted.');
        } catch (err: any) {
            showToast(err.message, 'error');
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="animate-spin text-sky-500" size={36} />
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-4 right-4 z-[100] text-white text-sm px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 ${toastType === 'error' ? 'bg-red-600' : 'bg-slate-800'}`}>
                    <Check size={16} className={toastType === 'error' ? 'text-red-200' : 'text-emerald-400'} /> {toast}
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Inventory</h1>
                    <p className="text-sm text-slate-500">{items.length} total items</p>
                </div>
                {canAdd && (
                    <Link href="/inventory/add" className="btn-primary flex items-center gap-2">
                        <Plus size={16} /> Add New Item
                    </Link>
                )}
            </div>

            {/* Filters */}
            <div className="card !p-4 flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-[200px]">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        className="input pl-9"
                        placeholder="Search fabric or colour…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 flex-wrap">
                    {fabrics.map(f => (
                        <button
                            key={f}
                            onClick={() => setFilterFabric(f)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${filterFabric === f
                                ? 'bg-sky-600 text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="card !p-0 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100 text-left">
                                <th className="px-5 py-3.5 font-semibold text-slate-600">Fabric Type</th>
                                <th className="px-5 py-3.5 font-semibold text-slate-600">Colour</th>
                                <th className="px-5 py-3.5 font-semibold text-slate-600">Price</th>
                                <th className="px-5 py-3.5 font-semibold text-slate-600">Stock</th>
                                <th className="px-5 py-3.5 font-semibold text-slate-600">Alert At</th>
                                <th className="px-5 py-3.5 font-semibold text-slate-600">Status</th>
                                <th className="px-5 py-3.5 font-semibold text-slate-600 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filtered.length === 0 && (
                                <tr><td colSpan={7} className="text-center py-12 text-slate-400">No items found.</td></tr>
                            )}
                            {filtered.map(item => {
                                const status = getStatus(item);
                                return (
                                    <tr
                                        key={item._id}
                                        className={`hover:bg-slate-50 transition ${status === 'out' ? 'bg-red-50/30' : status === 'low' ? 'bg-amber-50/30' : ''}`}
                                    >
                                        <td className="px-5 py-4 font-medium text-slate-800">{item.fabricType}</td>
                                        <td className="px-5 py-4 text-slate-600">{item.colour}</td>
                                        <td className="px-5 py-4 font-semibold text-slate-800">Rs. {item.price.toLocaleString()}</td>
                                        <td className="px-5 py-4">
                                            <span className={`font-bold ${status === 'out' ? 'text-red-600' : status === 'low' ? 'text-amber-600' : 'text-slate-800'}`}>
                                                {item.stockQty}
                                            </span>
                                            <span className="text-slate-400 ml-1 text-xs">pcs</span>
                                        </td>
                                        <td className="px-5 py-4 text-slate-500">{item.lowStockAlert}</td>
                                        <td className="px-5 py-4"><StatusBadge status={status} /></td>
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-2 justify-end">
                                                <button onClick={() => openEdit(item)} className="p-2 rounded-lg hover:bg-sky-50 text-sky-600 transition" title="Edit">
                                                    <Pencil size={15} />
                                                </button>
                                                <button onClick={() => openRestock(item)} className="p-2 rounded-lg hover:bg-emerald-50 text-emerald-600 transition" title="Restock">
                                                    <Package2 size={15} />
                                                </button>
                                                {canDelete && (
                                                    <button onClick={() => setDeleteId(item._id)} className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition" title="Delete">
                                                        <Trash2 size={15} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── Edit Modal ── */}
            {editItem && (
                <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
                        <div className="flex items-center justify-between">
                            <h2 className="font-bold text-lg text-slate-800">Edit Item</h2>
                            <button onClick={() => setEditItem(null)} className="p-2 rounded-lg hover:bg-slate-100">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="bg-slate-50 rounded-xl px-4 py-3">
                            <p className="text-sm font-semibold text-slate-700">{editItem.fabricType} — {editItem.colour}</p>
                            <p className="text-xs text-slate-400 mt-0.5">Fabric type and colour cannot be changed</p>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-semibold text-slate-600 mb-1 block">Price (Rs.)</label>
                                <input type="number" className="input" value={editPrice} onChange={e => setEditPrice(e.target.value)} />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-600 mb-1 block">Low Stock Alert Qty</label>
                                <input type="number" className="input" value={editAlert} onChange={e => setEditAlert(e.target.value)} />
                            </div>
                        </div>
                        <div className="flex gap-3 pt-1">
                            <button onClick={() => setEditItem(null)} className="btn-secondary flex-1">Cancel</button>
                            <button onClick={saveEdit} disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
                                {saving && <Loader2 size={15} className="animate-spin" />} Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Restock Modal ── */}
            {restockItem && (
                <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5">
                        <div className="flex items-center justify-between">
                            <h2 className="font-bold text-lg text-slate-800">Restock Item</h2>
                            <button onClick={() => setRestockItem(null)} className="p-2 rounded-lg hover:bg-slate-100">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="bg-emerald-50 rounded-xl px-4 py-3">
                            <p className="text-sm font-semibold text-emerald-800">{restockItem.fabricType} — {restockItem.colour}</p>
                            <p className="text-xs text-emerald-600 mt-0.5">Current stock: <strong>{restockItem.stockQty} pcs</strong></p>
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-600 mb-1 block">Quantity to Add</label>
                            <input
                                type="number"
                                min="1"
                                className="input"
                                placeholder="Enter qty…"
                                value={restockQty}
                                onChange={e => setRestockQty(e.target.value)}
                                autoFocus
                            />
                        </div>
                        {restockQty && Number(restockQty) > 0 && (
                            <p className="text-xs text-emerald-600 font-medium">
                                New stock will be: <strong>{restockItem.stockQty + Number(restockQty)} pcs</strong>
                            </p>
                        )}
                        <div className="flex gap-3">
                            <button onClick={() => setRestockItem(null)} className="btn-secondary flex-1">Cancel</button>
                            <button onClick={saveRestock} disabled={saving} className="btn-success flex-1 flex items-center justify-center gap-2">
                                {saving ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />} Add Stock
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Delete Confirm Modal ── */}
            {deleteId && (
                <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
                        <h2 className="font-bold text-lg text-slate-800">Delete Item?</h2>
                        <p className="text-sm text-slate-500">This action cannot be undone. The item will be permanently removed from inventory.</p>
                        <div className="flex gap-3 pt-1">
                            <button onClick={() => setDeleteId(null)} className="btn-secondary flex-1">Cancel</button>
                            <button onClick={() => deleteItem(deleteId)} disabled={saving} className="btn-danger flex-1 !bg-red-600 !text-white hover:!bg-red-700 flex items-center justify-center gap-2">
                                {saving && <Loader2 size={15} className="animate-spin" />} Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
