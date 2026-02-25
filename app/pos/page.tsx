'use client';
import { useState, useMemo, useEffect } from 'react';
import {
    Search, ShoppingCart, Plus, Minus, Trash2, Printer,
    CheckCircle, X, AlertCircle, Loader2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface InventoryItem {
    _id: string;
    fabricType: string;
    colour: string;
    price: number;
    stockQty: number;
    lowStockAlert: number;
}

interface CartItem {
    inventoryId: string;
    fabricType: string;
    colour: string;
    price: number;
    qty: number;
    maxQty: number;
}

export default function POSPage() {
    const router = useRouter();
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [cart, setCart] = useState<CartItem[]>([]);
    const [saleError, setSaleError] = useState('');
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [showMobileCart, setShowMobileCart] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash');
    const [online, setOnline] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
                setOnline(isOnline);
                const url = isOnline ? '/api/inventory' : '/api/inventory/local';
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

        const updateStatus = () => {
            if (typeof navigator === 'undefined') return;
            setOnline(navigator.onLine);
        };
        window.addEventListener('online', updateStatus);
        window.addEventListener('offline', updateStatus);
        return () => {
            window.removeEventListener('online', updateStatus);
            window.removeEventListener('offline', updateStatus);
        };
    }, []);

    const searchResults = useMemo(() => {
        if (!search.trim()) return [];
        return inventory.filter(item =>
            `${item.fabricType} ${item.colour}`.toLowerCase().includes(search.toLowerCase())
        );
    }, [search, inventory]);

    const total = cart.reduce((s, i) => s + i.price * i.qty, 0);

    function addToCart(item: InventoryItem) {
        if (!online) {
            setSaleError('POS is disabled while offline. Please connect to the internet.');
            return;
        }
        if (item.stockQty === 0) return;
        setCart(prev => {
            const exists = prev.find(c => c.inventoryId === item._id);
            if (exists) {
                if (exists.qty >= item.stockQty) return prev;
                return prev.map(c => c.inventoryId === item._id ? { ...c, qty: c.qty + 1 } : c);
            }
            return [...prev, {
                inventoryId: item._id,
                fabricType: item.fabricType,
                colour: item.colour,
                price: item.price,
                qty: 1,
                maxQty: item.stockQty,
            }];
        });
        setSaleError('');
    }

    function updateQty(id: string, delta: number) {
        setCart(prev => prev.map(c => {
            if (c.inventoryId !== id) return c;
            const newQty = c.qty + delta;
            if (newQty < 1) return c;
            if (newQty > c.maxQty) return c;
            return { ...c, qty: newQty };
        }));
    }

    function removeFromCart(id: string) {
        setCart(prev => prev.filter(c => c.inventoryId !== id));
    }

    function clearBill() {
        setCart([]);
        setSearch('');
        setShowClearConfirm(false);
        setSaleError('');
        setPaymentMethod('cash');
    }

    async function completeSale() {
        if (cart.length === 0) {
            setSaleError('Cart is empty. Add items before completing sale.');
            return;
        }
        if (!online) {
            setSaleError('POS is disabled while offline. Please connect to the internet.');
            return;
        }
        setSubmitting(true);
        setSaleError('');
        try {
            const res = await fetch('/api/sales', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: cart.map(c => ({
                        fabricType: c.fabricType,
                        colour: c.colour,
                        price: c.price,
                        qty: c.qty,
                    })),
                    paymentMethod,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Sale failed');

            // Update local inventory stock cache in UI
            setInventory(prev => prev.map(inv => {
                const cartItem = cart.find(c => c.inventoryId === inv._id);
                if (cartItem) return { ...inv, stockQty: inv.stockQty - cartItem.qty };
                return inv;
            }));

            // Navigate directly to receipt page
            router.push(`/receipt/${data._id}`);
            setCart([]);
            setSearch('');
            setShowMobileCart(false);
            setPaymentMethod('cash');
        } catch (err: any) {
            setSaleError(err.message);
        } finally {
            setSubmitting(false);
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
        <div className="flex h-[calc(100dvh-56px)] overflow-hidden">

            {/* ── LEFT: Search + Product List ── */}
            <div className="w-full lg:w-[45%] xl:w-[40%] flex flex-col border-r border-slate-100 bg-white overflow-hidden">
                {/* Header */}
                <div className="px-5 py-4 border-b border-slate-100">
                    <h1 className="font-bold text-lg text-slate-800 mb-3">POS – Billing</h1>
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            className="input pl-9 pr-4"
                            placeholder="Search fabric or colour…"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            autoFocus
                        />
                    </div>
                </div>

                {/* Product List */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {!search.trim() ? (
                        <div className="text-center py-16 text-slate-400">
                            <Search size={36} className="mx-auto mb-3 opacity-40" />
                            <p className="text-sm">Type to search fabric or colour</p>
                        </div>
                    ) : searchResults.length === 0 ? (
                        <div className="text-center py-12 text-slate-400 text-sm">No items found for &quot;{search}&quot;</div>
                    ) : (
                        searchResults.map(item => {
                            const inCart = cart.find(c => c.inventoryId === item._id);
                            const isOut = item.stockQty === 0;
                            return (
                                <button
                                    key={item._id}
                                    onClick={() => addToCart(item)}
                                    disabled={isOut}
                                    className={`w-full text-left px-4 py-3.5 rounded-xl border transition-all flex items-center justify-between
                    ${isOut
                                            ? 'bg-slate-50 border-slate-100 opacity-50 cursor-not-allowed'
                                            : inCart
                                                ? 'bg-sky-50 border-sky-200 shadow-sm'
                                                : 'bg-white border-slate-100 hover:border-sky-200 hover:bg-sky-50'
                                        }
                  `}
                                >
                                    <div>
                                        <p className="font-semibold text-slate-800 text-sm">{item.fabricType} — {item.colour}</p>
                                        <p className="text-xs text-slate-400 mt-0.5">
                                            {isOut ? 'Out of Stock' : `${item.stockQty} pcs available`}
                                            {inCart ? ` · ${inCart.qty} in cart` : ''}
                                        </p>
                                    </div>
                                    <div className="text-right flex-shrink-0 ml-3">
                                        <p className="font-bold text-sky-600 text-sm">Rs. {item.price.toLocaleString()}</p>
                                        {!isOut && (
                                            <div className="mt-1 w-6 h-6 bg-sky-600 rounded-full flex items-center justify-center ml-auto">
                                                <Plus size={13} className="text-white" />
                                            </div>
                                        )}
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>
            </div>

            {/* ── RIGHT: Cart / Bill ── */}
            <div className="hidden lg:flex flex-col flex-1 bg-slate-50 overflow-hidden">
                {/* Bill Header */}
                <div className="px-5 py-4 bg-white border-b border-slate-100 flex items-center gap-2">
                    <ShoppingCart size={18} className="text-sky-600" />
                    <h2 className="font-bold text-slate-800">Bill</h2>
                    {cart.length > 0 && (
                        <span className="ml-auto text-xs bg-sky-600 text-white px-2.5 py-1 rounded-full font-semibold">
                            {cart.length} item{cart.length > 1 ? 's' : ''}
                        </span>
                    )}
                </div>

                {/* Cart Items */}
                <div className="flex-1 overflow-y-auto p-4">
                    {cart.length === 0 ? (
                        <div className="text-center py-20 text-slate-400">
                            <ShoppingCart size={40} className="mx-auto mb-3 opacity-30" />
                            <p className="text-sm">Your bill is empty</p>
                            <p className="text-xs mt-1">Search and click items to add</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {cart.map(item => (
                                <div key={item.inventoryId} className="bg-white rounded-xl border border-slate-100 px-4 py-3 flex items-center gap-3">
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-slate-800 text-sm truncate">{item.fabricType}</p>
                                        <p className="text-xs text-slate-400">{item.colour} · Rs. {item.price.toLocaleString()} each</p>
                                    </div>
                                    {/* Qty controls */}
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => item.qty === 1 ? removeFromCart(item.inventoryId) : updateQty(item.inventoryId, -1)}
                                            className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-red-100 hover:text-red-600 flex items-center justify-center transition"
                                        >
                                            <Minus size={13} />
                                        </button>
                                        <span className="w-8 text-center font-bold text-slate-800 text-sm">{item.qty}</span>
                                        <button
                                            onClick={() => updateQty(item.inventoryId, 1)}
                                            disabled={item.qty >= item.maxQty}
                                            className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-sky-100 hover:text-sky-600 flex items-center justify-center transition disabled:opacity-40"
                                        >
                                            <Plus size={13} />
                                        </button>
                                    </div>
                                    <div className="text-right w-20">
                                        <p className="font-bold text-slate-800 text-sm">Rs. {(item.price * item.qty).toLocaleString()}</p>
                                    </div>
                                    <button
                                        onClick={() => removeFromCart(item.inventoryId)}
                                        className="text-slate-300 hover:text-red-500 transition p-1"
                                    >
                                        <Trash2 size={15} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Bill Summary & Actions */}
                <div className="bg-white border-t border-slate-100 p-5 space-y-4">
                    {saleError && (
                        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                            <AlertCircle size={16} className="flex-shrink-0" /> {saleError}
                        </div>
                    )}

                    {/* Line items summary */}
                    <div className="space-y-1">
                        {cart.map(item => (
                            <div key={item.inventoryId} className="flex justify-between text-xs text-slate-500">
                                <span>{item.fabricType} {item.colour} × {item.qty}</span>
                                <span>Rs. {(item.price * item.qty).toLocaleString()}</span>
                            </div>
                        ))}
                    </div>

                    <div className="border-t border-slate-100 pt-3 flex flex-col gap-3">
                        <div className="flex justify-between items-center">
                            <span className="font-bold text-slate-700">Total</span>
                            <span className="text-2xl font-extrabold text-sky-600">Rs. {total.toLocaleString()}</span>
                        </div>
                        <div className="flex flex-wrap gap-2 items-center">
                            <span className="text-xs font-semibold text-slate-500 mr-1">Payment:</span>
                            <button
                                type="button"
                                onClick={() => setPaymentMethod('cash')}
                                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                                    paymentMethod === 'cash'
                                        ? 'bg-emerald-600 text-white border-emerald-600'
                                        : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-400'
                                }`}
                            >
                                Cash
                            </button>
                            <button
                                type="button"
                                onClick={() => setPaymentMethod('card')}
                                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                                    paymentMethod === 'card'
                                        ? 'bg-sky-600 text-white border-sky-600'
                                        : 'bg-white text-slate-600 border-slate-200 hover:border-sky-400'
                                }`}
                            >
                                Card
                            </button>
                        </div>
                    </div>

                    {!online && (
                        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-2 text-xs text-red-700">
                            <AlertCircle size={14} className="flex-shrink-0" />
                            POS is disabled while offline. Please connect to the internet to make sales.
                        </div>
                    )}

                    <div className="flex gap-3">
                        <button
                            onClick={() => cart.length > 0 ? setShowClearConfirm(true) : null}
                            className="btn-secondary flex-1"
                        >
                            Clear Bill
                        </button>
                        <button
                            onClick={completeSale}
                            disabled={submitting || !online}
                            className="btn-success flex-1 flex items-center justify-center gap-2"
                        >
                            {submitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                            Complete Sale
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Cart FAB */}
            {cart.length > 0 && (
                <button
                    type="button"
                    onClick={() => setShowMobileCart(true)}
                    className="lg:hidden fixed bottom-4 right-4 z-40 bg-sky-600 text-white rounded-2xl px-5 py-3 shadow-xl flex items-center gap-3 active:scale-95 transition"
                >
                    <ShoppingCart size={18} />
                    <span className="font-bold">
                        {cart.length} item{cart.length > 1 ? 's' : ''} · Rs. {total.toLocaleString()}
                    </span>
                </button>
            )}

            {/* Mobile cart drawer */}
            {showMobileCart && (
                <div className="lg:hidden fixed inset-0 z-50 bg-black/40 flex items-end">
                    <div className="bg-white rounded-t-2xl shadow-2xl w-full max-h-[75vh] p-4 flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <h2 className="font-bold text-slate-800">Current Bill</h2>
                            <button
                                onClick={() => setShowMobileCart(false)}
                                className="p-2 rounded-lg hover:bg-slate-100"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {saleError && (
                            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                                <AlertCircle size={16} className="flex-shrink-0" /> {saleError}
                            </div>
                        )}

                        <div className="flex-1 min-h-0 overflow-y-auto space-y-2">
                            {cart.map(item => (
                                <div
                                    key={item.inventoryId}
                                    className="bg-slate-50 rounded-xl px-4 py-3 flex items-center justify-between gap-3"
                                >
                                    <div className="min-w-0">
                                        <p className="font-semibold text-slate-800 text-sm truncate">
                                            {item.fabricType} — {item.colour}
                                        </p>
                                        <p className="text-xs text-slate-400">
                                            {item.qty} pcs · Rs. {item.price.toLocaleString()} each
                                        </p>
                                    </div>
                                    <p className="font-bold text-slate-800 text-sm">
                                        Rs. {(item.price * item.qty).toLocaleString()}
                                    </p>
                                </div>
                            ))}
                        </div>

                        <div className="border-t border-slate-100 pt-3 flex justify-between items-center">
                            <div>
                                <span className="block text-xs font-semibold text-slate-500">Total</span>
                                <span className="text-xl font-extrabold text-sky-600">
                                    Rs. {total.toLocaleString()}
                                </span>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                                <span className="text-[10px] font-semibold text-slate-500 uppercase">Payment</span>
                                <div className="flex gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => setPaymentMethod('cash')}
                                        className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition ${
                                            paymentMethod === 'cash'
                                                ? 'bg-emerald-600 text-white border-emerald-600'
                                                : 'bg-white text-slate-600 border-slate-200'
                                        }`}
                                    >
                                        Cash
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPaymentMethod('card')}
                                        className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition ${
                                            paymentMethod === 'card'
                                                ? 'bg-sky-600 text-white border-sky-600'
                                                : 'bg-white text-slate-600 border-slate-200'
                                        }`}
                                    >
                                        Card
                                    </button>
                                </div>
                            </div>
                        </div>

                        {!online && (
                            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-[11px] text-red-700">
                                <AlertCircle size={12} className="flex-shrink-0" />
                                POS is offline. Connect to the internet to complete the sale.
                            </div>
                        )}
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => { clearBill(); setShowMobileCart(false); }}
                                className="btn-secondary flex-1"
                            >
                                Clear
                            </button>
                            <button
                                type="button"
                                onClick={completeSale}
                                disabled={submitting || !online}
                                className="btn-success flex-1 flex items-center justify-center gap-2"
                            >
                                {submitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                                Complete Sale
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Clear Confirm Modal */}
            {showClearConfirm && (
                <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="font-bold text-lg text-slate-800">Clear Bill?</h2>
                            <button onClick={() => setShowClearConfirm(false)}><X size={18} /></button>
                        </div>
                        <p className="text-sm text-slate-500">All items will be removed from the current bill.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowClearConfirm(false)} className="btn-secondary flex-1">Cancel</button>
                            <button onClick={clearBill} className="btn-danger flex-1 !bg-red-600 !text-white hover:!bg-red-700">Clear</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
