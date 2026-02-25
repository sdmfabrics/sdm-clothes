'use client';
import { useState } from 'react';
import { CheckCircle, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function AddProductPage() {
    const [form, setForm] = useState({
        fabricType: '',
        colour: '',
        price: '',
        stockQty: '',
        lowStockAlert: '3',
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
        setError('');
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        if (!form.fabricType.trim() || !form.colour.trim()) {
            setError('Fabric Type and Colour are required.');
            return;
        }
        if (!form.price || Number(form.price) <= 0) {
            setError('Please enter a valid price.');
            return;
        }
        if (!form.stockQty || Number(form.stockQty) < 0) {
            setError('Opening stock cannot be negative.');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/inventory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fabricType: form.fabricType.trim(),
                    colour: form.colour.trim(),
                    price: Number(form.price),
                    stockQty: Number(form.stockQty),
                    lowStockAlert: Number(form.lowStockAlert),
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to add item');
            setSuccess(true);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    if (success) {
        return (
            <div className="p-6 max-w-lg mx-auto">
                <div className="card text-center py-14 space-y-4">
                    <CheckCircle size={56} className="text-emerald-500 mx-auto" />
                    <h2 className="text-xl font-bold text-slate-800">Item Added Successfully!</h2>
                    <p className="text-slate-500 text-sm">
                        <strong>{form.fabricType} {form.colour}</strong> has been added to inventory with {form.stockQty} pcs opening stock.
                    </p>
                    <div className="flex gap-3 justify-center pt-2">
                        <Link href="/inventory" className="btn-secondary">View Inventory</Link>
                        <button
                            className="btn-primary"
                            onClick={() => { setForm({ fabricType: '', colour: '', price: '', stockQty: '', lowStockAlert: '3' }); setSuccess(false); }}
                        >
                            Add Another
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-lg mx-auto space-y-6">
            {/* Back */}
            <Link href="/inventory" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition">
                <ArrowLeft size={16} /> Back to Inventory
            </Link>

            <div>
                <h1 className="text-2xl font-bold text-slate-800">Add New Item</h1>
                <p className="text-sm text-slate-500 mt-0.5">Create a new Fabric + Colour inventory entry</p>
            </div>

            <form onSubmit={handleSubmit} className="card space-y-5">
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 font-medium">
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Fabric Type *</label>
                        <input
                            name="fabricType"
                            className="input"
                            placeholder="e.g. Wash & Wear"
                            value={form.fabricType}
                            onChange={handleChange}
                        />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Colour *</label>
                        <input
                            name="colour"
                            className="input"
                            placeholder="e.g. Black"
                            value={form.colour}
                            onChange={handleChange}
                        />
                    </div>
                </div>

                {form.fabricType && form.colour && (
                    <div className="bg-sky-50 rounded-xl px-4 py-3 text-sm text-sky-700 font-medium">
                        Preview: <strong>{form.fabricType} {form.colour}</strong>
                    </div>
                )}

                <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Price (Rs.) *</label>
                    <input
                        name="price"
                        type="number"
                        min="1"
                        className="input"
                        placeholder="e.g. 1200"
                        value={form.price}
                        onChange={handleChange}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Opening Stock (pcs) *</label>
                        <input
                            name="stockQty"
                            type="number"
                            min="0"
                            className="input"
                            placeholder="e.g. 20"
                            value={form.stockQty}
                            onChange={handleChange}
                        />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Low Stock Alert At</label>
                        <input
                            name="lowStockAlert"
                            type="number"
                            min="1"
                            className="input"
                            value={form.lowStockAlert}
                            onChange={handleChange}
                        />
                    </div>
                </div>

                <p className="text-xs text-slate-400">
                    * Fabric Type + Colour must be unique. You cannot have duplicate entries.
                </p>

                <div className="flex gap-3 pt-1">
                    <Link href="/inventory" className="btn-secondary flex-1 text-center">Cancel</Link>
                    <button type="submit" disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2">
                        {loading && <Loader2 size={15} className="animate-spin" />}
                        Add to Inventory
                    </button>
                </div>
            </form>
        </div>
    );
}
