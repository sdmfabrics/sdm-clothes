import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/db';
import User from '@/models/User';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
        const role = token?.role as string;
        if (role !== 'owner') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        await connectDB();
        const user = await User.findById(id).lean();
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
        if (user.role === 'owner') {
            return NextResponse.json({ error: 'Cannot delete the owner account.' }, { status: 400 });
        }
        await User.findByIdAndDelete(id);
        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
        const role = token?.role as string;
        const userId = token?.sub ?? (token as any)?.id;
        const body = await req.json();
        const { password, role: newRole } = body;

        await connectDB();
        const user = await User.findById(id).lean();
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        // Change password: owner can change anyone; user can only change own
        if (password !== undefined) {
            if (role !== 'owner' && String(user._id) !== String(userId)) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
            if (!password.trim()) {
                return NextResponse.json({ error: 'Password cannot be empty.' }, { status: 400 });
            }
            const hashed = await bcrypt.hash(password, 10);
            await User.findByIdAndUpdate(id, { $set: { password: hashed } });
        }

        // Change role: owner only
        if (newRole !== undefined) {
            if (role !== 'owner') {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
            if (user.role === 'owner' && newRole !== 'owner') {
                return NextResponse.json({ error: 'Cannot change owner role.' }, { status: 400 });
            }
            const validRoles = ['owner', 'cashier_pos', 'cashier_inventory'];
            if (!validRoles.includes(newRole)) {
                return NextResponse.json({ error: 'Invalid role.' }, { status: 400 });
            }
            await User.findByIdAndUpdate(id, { $set: { role: newRole } });
        }

        const updated = await User.findById(id).select('-password').lean();
        return NextResponse.json(updated);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
