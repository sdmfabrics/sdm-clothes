'use client';
import { useEffect, useState } from 'react';
import { Printer, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

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

export default function ReceiptPage() {
    const params = useParams();
    const saleId = params.saleId as string;
    const [sale, setSale] = useState<Sale | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        fetch(`/api/sales/${saleId}`)
            .then(r => {
                if (r.status === 404) { setNotFound(true); setLoading(false); return null; }
                return r.json();
            })
            .then(data => {
                if (data) setSale(data);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [saleId]);

    useEffect(() => {
        if (!sale) return;
        const t = window.setTimeout(() => window.print(), 250);
        return () => window.clearTimeout(t);
    }, [sale]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="animate-spin text-sky-500" size={36} />
            </div>
        );
    }

    if (notFound || !sale) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-4">
                <p className="text-slate-500 text-sm">Receipt not found.</p>
                <Link href="/pos" className="btn-secondary">← Back to POS</Link>
            </div>
        );
    }

    const dateObj = new Date(sale.date);

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-start py-8 px-4">
            {/* Action Buttons (hidden when printing) */}
            <div className="no-print flex items-center gap-3 mb-6 w-full max-w-xs">
                <Link href="/pos" className="btn-secondary flex items-center gap-2 flex-1 justify-center">
                    <ArrowLeft size={15} /> Back to POS
                </Link>
                <button
                    onClick={() => window.print()}
                    className="btn-primary flex items-center gap-2 flex-1 justify-center"
                >
                    <Printer size={15} /> Print
                </button>
            </div>

            {/* Receipt Paper */}
            <div
                className="receipt-paper bg-white shadow-lg"
                style={{
                    width: '80mm',
                    maxWidth: '320px',
                    padding: '16px',
                    fontFamily: "'Courier New', monospace",
                    fontSize: '12px',
                    color: '#000',
                }}
            >
                {/* Header */}
                <div style={{ textAlign: 'center', borderBottom: '1px dashed #999', paddingBottom: '10px', marginBottom: '10px' }}>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', letterSpacing: '1px' }}>
                        SDM FABRICS
                    </div>
                    <div style={{ fontSize: '10px', color: '#555', marginTop: '2px' }}>
                        Unstitched Fabric Suits
                    </div>
                    <div style={{ fontSize: '10px', color: '#555' }}>
                        Dogar Motors, Al-Jalil Garden
                    </div>
                    <div style={{ marginTop: '6px', fontSize: '11px' }}>
                        <strong>Receipt #:</strong> {sale._id.slice(-8).toUpperCase()}
                    </div>
                    <div style={{ fontSize: '11px' }}>
                        <strong>Date:</strong>{' '}
                        {dateObj.toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })}
                        {'  '}
                        {dateObj.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                </div>

                {/* Items */}
                <>
                    {/* Column Headers */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', borderBottom: '1px solid #ddd', paddingBottom: '4px', marginBottom: '6px', fontSize: '11px' }}>
                        <span style={{ flex: 3 }}>ITEM</span>
                        <span style={{ flex: 1, textAlign: 'center' }}>QTY</span>
                        <span style={{ flex: 1.5, textAlign: 'right' }}>PRICE</span>
                        <span style={{ flex: 1.5, textAlign: 'right' }}>TOTAL</span>
                    </div>

                    {/* Rows */}
                    {sale.items.map((item, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '11px', alignItems: 'flex-start' }}>
                            <span style={{ flex: 3, lineHeight: '1.3' }}>
                                {item.fabricType}<br />
                                <span style={{ color: '#555', fontSize: '10px' }}>{item.colour}</span>
                            </span>
                            <span style={{ flex: 1, textAlign: 'center' }}>{item.qty}</span>
                            <span style={{ flex: 1.5, textAlign: 'right' }}>{item.price.toLocaleString()}</span>
                            <span style={{ flex: 1.5, textAlign: 'right', fontWeight: 'bold' }}>{item.subtotal.toLocaleString()}</span>
                        </div>
                    ))}

                    {/* Total */}
                    <div style={{ borderTop: '1px dashed #999', marginTop: '8px', paddingTop: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '13px' }}>
                            <span>TOTAL</span>
                            <span>Rs. {sale.totalAmount.toLocaleString()}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#555', marginTop: '2px' }}>
                            <span>Items: {sale.items.reduce((s, i) => s + i.qty, 0)} pcs</span>
                            <span>{(sale.paymentMethod || 'cash') === 'card' ? 'Card' : 'Cash'}</span>
                        </div>
                    </div>
                </>

                {/* Footer */}
                <div style={{ textAlign: 'center', borderTop: '1px dashed #999', marginTop: '12px', paddingTop: '10px', fontSize: '11px', color: '#555' }}>
                    <div style={{ fontWeight: 'bold', color: '#000', marginBottom: '3px' }}>Thank you! Visit again.</div>
                    <div>Returns within 24 hours with receipt</div>
                    <div style={{ marginTop: '8px', fontSize: '9px' }}>
                        — SDM Fabrics —
                    </div>
                </div>
            </div>
        </div>
    );
}
