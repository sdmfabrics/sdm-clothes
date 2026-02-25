'use client';
import { useEffect, useState } from 'react';
import {
    TrendingUp, Package, AlertTriangle, ShoppingBag,
    Banknote, BarChart3, Clock, Loader2,
} from 'lucide-react';

interface InventoryItem {
    _id: string;
    fabricType: string;
    colour: string;
    price: number;
    stockQty: number;
    lowStockAlert: number;
}

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

function getStatus(item: InventoryItem) {
    if (item.stockQty === 0) return 'out';
    if (item.stockQty <= item.lowStockAlert) return 'low';
    return 'in';
}

export default function DashboardPage() {
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [sales, setSales] = useState<Sale[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
                const invUrl = online ? '/api/inventory' : '/api/inventory/local';
                const [invRes, salesRes] = await Promise.all([
                    fetch(invUrl),
                    fetch('/api/sales'),
                ]);
                const inv = await invRes.json();
                const sal = await salesRes.json();
                setInventory(Array.isArray(inv) ? inv : []);
                setSales(Array.isArray(sal) ? sal : []);
            } catch {
                try {
                    const invRes = await fetch('/api/inventory/local');
                    const inv = await invRes.json();
                    setInventory(Array.isArray(inv) ? inv : []);
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

    const today = new Date().toISOString().split('T')[0];
    const thisMonth = new Date().toISOString().slice(0, 7);

    const todaySales = sales.filter(s => s.date.startsWith(today));
    const monthSales = sales.filter(s => s.date.startsWith(thisMonth));
    const todayAmount = todaySales.reduce((s, x) => s + x.totalAmount, 0);
    const monthAmount = monthSales.reduce((s, x) => s + x.totalAmount, 0);
    const todayPieces = todaySales.reduce((s, x) => s + x.items.reduce((a, i) => a + i.qty, 0), 0);
    const totalStock = inventory.reduce((s, i) => s + i.stockQty, 0);
    const lowStock = inventory.filter(i => getStatus(i) !== 'in');
    const recent5 = [...sales].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);

    // Top selling fabric
    const fabricCount: Record<string, number> = {};
    sales.forEach(s => s.items.forEach(i => {
        fabricCount[i.fabricType] = (fabricCount[i.fabricType] || 0) + i.qty;
    }));
    const topFabric = Object.entries(fabricCount).sort((a, b) => b[1] - a[1])[0];

    // Stock bar chart data
    const maxStock = Math.max(...inventory.map(x => x.stockQty), 1);
    const chartData = inventory.slice(0, 6).map(i => ({
        label: `${i.fabricType.split(' ')[0]} ${i.colour}`,
        val: i.stockQty,
        max: maxStock,
    }));

    const statCards = [
        { title: "Today's Sales", value: `Rs. ${todayAmount.toLocaleString()}`, icon: Banknote, light: 'bg-sky-50', text: 'text-sky-600' },
        { title: "Today's Pieces", value: `${todayPieces} pcs`, icon: ShoppingBag, light: 'bg-violet-50', text: 'text-violet-600' },
        { title: 'Monthly Sales', value: `Rs. ${monthAmount.toLocaleString()}`, icon: TrendingUp, light: 'bg-emerald-50', text: 'text-emerald-600' },
        { title: 'Total Stock', value: `${totalStock} pcs`, icon: Package, light: 'bg-amber-50', text: 'text-amber-600' },
        { title: 'Low / Out of Stock', value: `${lowStock.length} items`, icon: AlertTriangle, light: 'bg-red-50', text: 'text-red-600' },
        { title: 'Top Fabric', value: topFabric ? `${topFabric[0]} (${topFabric[1]} pcs)` : '—', icon: BarChart3, light: 'bg-teal-50', text: 'text-teal-600' },
    ];

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        {new Date().toLocaleDateString('en-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                </div>
                {lowStock.length > 0 && (
                    <a href="/alerts" className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-600 text-sm font-semibold rounded-xl border border-red-200 hover:bg-red-100 transition">
                        <AlertTriangle size={15} />
                        {lowStock.length} Low Stock
                    </a>
                )}
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {statCards.map(({ title, value, icon: Icon, light, text }) => (
                    <div key={title} className="card flex items-start gap-4">
                        <div className={`${light} ${text} p-3 rounded-xl flex-shrink-0`}>
                            <Icon size={22} />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 font-medium">{title}</p>
                            <p className="text-xl font-bold text-slate-800 mt-0.5 leading-tight">{value}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
                {/* Stock Mini Chart */}
                <div className="card">
                    <h2 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
                        <BarChart3 size={18} className="text-sky-500" /> Stock Overview (Top 6)
                    </h2>
                    {chartData.length === 0 ? (
                        <p className="text-sm text-slate-400 text-center py-6">No inventory yet. Add items first.</p>
                    ) : (
                        <div className="space-y-3">
                            {chartData.map(({ label, val, max }) => (
                                <div key={label}>
                                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                                        <span className="truncate max-w-[60%]">{label}</span>
                                        <span className="font-semibold text-slate-700">{val} pcs</span>
                                    </div>
                                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full bg-sky-500 transition-all duration-500"
                                            style={{ width: `${(val / max) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Recent Sales */}
                <div className="card">
                    <h2 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
                        <Clock size={18} className="text-sky-500" /> Recent 5 Sales
                    </h2>
                    {recent5.length === 0 ? (
                        <p className="text-sm text-slate-400 text-center py-6">No sales recorded yet.</p>
                    ) : (
                        <div className="space-y-3">
                            {recent5.map(sale => (
                                <a key={sale._id} href={`/receipt/${sale._id}`} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition cursor-pointer">
                                    <div>
                                        <p className="text-sm font-semibold text-slate-700">
                                            {sale.items.map(i => `${i.fabricType} ${i.colour}`).join(', ').slice(0, 40)}
                                            {sale.items.length > 1 ? '…' : ''}
                                        </p>
                                        <p className="text-xs text-slate-400 mt-0.5">
                                            {new Date(sale.date).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}
                                            {' · '}
                                            {sale.items.reduce((s, i) => s + i.qty, 0)} pcs
                                        </p>
                                    </div>
                                    <span className="font-bold text-sky-600 text-sm">Rs. {sale.totalAmount.toLocaleString()}</span>
                                </a>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Low Stock Warning */}
            {lowStock.length > 0 && (
                <div className="card border-red-100 bg-red-50">
                    <h2 className="font-semibold text-red-700 mb-3 flex items-center gap-2">
                        <AlertTriangle size={18} /> Low / Out of Stock Items
                    </h2>
                    <div className="flex flex-wrap gap-2">
                        {lowStock.map(item => (
                            <span
                                key={item._id}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${item.stockQty === 0 ? 'bg-red-200 text-red-800' : 'bg-amber-100 text-amber-800'}`}
                            >
                                {item.fabricType} {item.colour} — {item.stockQty === 0 ? 'Out of Stock' : `${item.stockQty} left`}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
