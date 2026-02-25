import mongoose, { Schema, Document, Model } from 'mongoose';

export type UserRole = 'owner' | 'cashier_pos' | 'cashier_inventory';

export interface IUser extends Document {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    createdAt: Date;
}

const UserSchema = new Schema<IUser>(
    {
        name: { type: String, required: true, trim: true },
        email: { type: String, required: true, trim: true, unique: true, lowercase: true },
        password: { type: String, required: true },
        role: {
            type: String,
            required: true,
            enum: ['owner', 'cashier_pos', 'cashier_inventory'],
        },
    },
    { timestamps: true }
);

const User: Model<IUser> =
    mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;
