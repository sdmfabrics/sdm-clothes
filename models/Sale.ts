import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISaleItem {
    fabricType: string;
    colour: string;
    price: number;
    qty: number;
    subtotal: number;
}

export interface ISale extends Document {
    saleId?: string;
    date: Date;
    items: ISaleItem[];
    totalAmount: number;
    synced: boolean;
    paymentMethod: 'cash' | 'card';
}

const SaleItemSchema = new Schema<ISaleItem>(
    {
        fabricType: { type: String, required: true },
        colour: { type: String, required: true },
        price: { type: Number, required: true },
        qty: { type: Number, required: true },
        subtotal: { type: Number, required: true },
    },
    { _id: false }
);

const SaleSchema = new Schema<ISale>(
    {
        // Used to keep receipt URLs stable for offline-created sales after sync
        saleId: { type: String, index: true, unique: true, sparse: true },
        date: { type: Date, required: true, default: Date.now },
        items: { type: [SaleItemSchema], required: true },
        totalAmount: { type: Number, required: true },
        synced: { type: Boolean, required: true, default: true },
        paymentMethod: {
            type: String,
            enum: ['cash', 'card'],
            required: true,
            default: 'cash',
        },
    },
    { timestamps: true }
);

const Sale: Model<ISale> =
    mongoose.models.Sale ||
    mongoose.model<ISale>('Sale', SaleSchema);

export default Sale;
