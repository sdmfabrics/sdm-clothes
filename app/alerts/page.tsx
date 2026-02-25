'use client';
import { useEffect, useState } from 'react';
import { AlertTriangle, Package, RefreshCw, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface InventoryItem {
    _id: string;
    fabricType: string;
    colour: string;
    price: number;
    stockQty: number;
    lowStockAlert: number;
}

function getStatus(item: InventoryItem) {
    if (item.stockQty === 0) return 'out';
    if (item.stockQty <= item.lowStockAlert) return 'low';
    return 'in';
}

export default function AlertsPage() {
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
                const url = online ? '/api/inventory' : '/api/inventory/local';
                const res = await fetch(url);
                const data = await res.json();
                setInventory(Array.isArray(data) ? data : []);
            } catch {
                try {
                    const res = await fetch('/api/inventory/local');
                    const data = await res.json();
                    setInventory(Array.isArray(data) ? data : []);
                } catch {
                    setInventory([]);
                }
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="animate-spin text-sky-500" size={36} />
            </div>
        );
    }

    const alertItems = inventory.filter(item => {
        const s = getStatus(item);
        return s === 'low' || s === 'out';
    });

    const outOfStock = alertItems.filter(i => i.stockQty === 0);
    const lowStock = alertItems.filter(i => i.stockQty > 0);

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <AlertTriangle className="text-amber-500" size={26} /> Low Stock Alerts
                    </h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        {alertItems.length} item{alertItems.length !== 1 ? 's' : ''} need attention
                    </p>
                </div>
                <Link href="/inventory" className="btn-primary flex items-center gap-2">
                    <RefreshCw size={15} /> Manage Inventory
                </Link>
            </div>

            {alertItems.length === 0 ? (
                <div className="card text-center py-16 space-y-3">
                    <Package size={48} className="text-emerald-400 mx-auto" />
                    <h2 className="font-semibold text-slate-700 text-lg">All Stock Levels OK!</h2>
                    <p className="text-slate-400 text-sm">No items are running low at the moment.</p>
                </div>
            ) : (
                <>
                    {/* Out of Stock */}
                    {outOfStock.length > 0 && (
                        <section>
                            <h2 className="text-base font-bold text-red-700 mb-3 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                                Out of Stock ({outOfStock.length})
                            </h2>
                            <div className="grid sm:grid-cols-2 gap-3">
                                {outOfStock.map(item => (
                                    <div
                                        key={item._id}
                                        className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-center justify-between"
                                    >
                                        <div>
                                            <p className="font-bold text-red-800 text-sm">{item.fabricType}</p>
                                            <p className="text-red-600 text-xs mt-0.5">{item.colour}</p>
                                            <p className="text-red-700 text-xs font-semibold mt-2">
                                                0 pcs — Rs. {item.price.toLocaleString()}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-600 text-white">
                                                OUT OF STOCK
                                            </span>
                                            <p className="text-xs text-red-500 mt-2">Alert at: {item.lowStockAlert}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Low Stock */}
                    {lowStock.length > 0 && (
                        <section>
                            <h2 className="text-base font-bold text-amber-700 mb-3 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                                Low Stock ({lowStock.length})
                            </h2>
                            <div className="grid sm:grid-cols-2 gap-3">
                                {lowStock.sort((a, b) => a.stockQty - b.stockQty).map(item => {
                                    const pct = Math.min(100, Math.round((item.stockQty / item.lowStockAlert) * 100));
                                    return (
                                        <div
                                            key={item._id}
                                            className="bg-amber-50 border border-amber-200 rounded-2xl p-5"
                                        >
                                            <div className="flex items-start justify-between mb-3">
                                                <div>
                                                    <p className="font-bold text-amber-900 text-sm">{item.fabricType}</p>
                                                    <p className="text-amber-700 text-xs mt-0.5">{item.colour}</p>
                                                </div>
                                                <span className="badge-orange">Low Stock</span>
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex justify-between text-xs text-amber-700">
                                                    <span>{item.stockQty} pcs remaining</span>
                                                    <span>Alert at ≤ {item.lowStockAlert}</span>
                                                </div>
                                                <div className="h-2 bg-amber-200 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-amber-500 rounded-full transition-all"
                                                        style={{ width: `${pct}%` }}
                                                    />
                                                </div>
                                            </div>
                                            <p className="text-xs text-amber-600 mt-2 font-medium">
                                                Rs. {item.price.toLocaleString()} per piece
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    )}

                    {/* Summary Table */}
                    <div className="card !p-0 overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-100">
                            <h2 className="font-semibold text-slate-700">All Alert Items — Summary</h2>
                        </div>
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-slate-50 text-left">
                                    <th className="px-5 py-3 font-semibold text-slate-600">Fabric Type</th>
                                    <th className="px-5 py-3 font-semibold text-slate-600">Colour</th>
                                    <th className="px-5 py-3 font-semibold text-slate-600">Stock</th>
                                    <th className="px-5 py-3 font-semibold text-slate-600">Alert At</th>
                                    <th className="px-5 py-3 font-semibold text-slate-600">Price</th>
                                    <th className="px-5 py-3 font-semibold text-slate-600">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {alertItems.map(item => {
                                    const isOut = item.stockQty === 0;
                                    return (
                                        <tr key={item._id} className={isOut ? 'bg-red-50/50' : 'bg-amber-50/30'}>
                                            <td className="px-5 py-3.5 font-medium">{item.fabricType}</td>
                                            <td className="px-5 py-3.5 text-slate-600">{item.colour}</td>
                                            <td className={`px-5 py-3.5 font-bold ${isOut ? 'text-red-600' : 'text-amber-600'}`}>
                                                {item.stockQty}
                                            </td>
                                            <td className="px-5 py-3.5 text-slate-500">{item.lowStockAlert}</td>
                                            <td className="px-5 py-3.5">Rs. {item.price.toLocaleString()}</td>
                                            <td className="px-5 py-3.5">
                                                {isOut
                                                    ? <span className="badge-red">Out of Stock</span>
                                                    : <span className="badge-orange">Low Stock</span>
                                                }
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
}
