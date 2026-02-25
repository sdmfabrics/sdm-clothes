import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IInventory extends Document {
    fabricType: string;
    colour: string;
    price: number;
    stockQty: number;
    lowStockAlert: number;
    createdAt: Date;
}

const InventorySchema = new Schema<IInventory>(
    {
        fabricType: { type: String, required: true, trim: true },
        colour: { type: String, required: true, trim: true },
        price: { type: Number, required: true, min: 0 },
        stockQty: { type: Number, required: true, min: 0, default: 0 },
        lowStockAlert: { type: Number, required: true, min: 1, default: 3 },
    },
    { timestamps: true }
);

// Compound unique index: each Fabric+Colour combo must be unique
InventorySchema.index({ fabricType: 1, colour: 1 }, { unique: true });

const Inventory: Model<IInventory> =
    mongoose.models.Inventory ||
    mongoose.model<IInventory>('Inventory', InventorySchema);

export default Inventory;
