import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import bcrypt from 'bcrypt';
import { connectDB } from '@/lib/db';
import User from '@/models/User';

export async function GET(req: NextRequest) {
    try {
        const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
        const role = token?.role as string;
        if (role !== 'owner') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        await connectDB();
        const users = await User.find({}).select('-password').sort({ createdAt: -1 }).lean();
        const list = users.map((u: any) => ({
            _id: String(u._id),
            name: u.name,
            email: u.email,
            role: u.role,
            createdAt: u.createdAt,
        }));
        return NextResponse.json(list);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
        const role = token?.role as string;
        if (role !== 'owner') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        const body = await req.json();
        const { name, email, password, role: newRole } = body;
        if (!name?.trim() || !email?.trim() || !password) {
            return NextResponse.json({ error: 'Name, email, and password are required.' }, { status: 400 });
        }
        const validRoles = ['owner', 'cashier_pos', 'cashier_inventory'];
        if (!validRoles.includes(newRole)) {
            return NextResponse.json({ error: 'Invalid role.' }, { status: 400 });
        }
        await connectDB();
        const existing = await User.findOne({ email: email.trim().toLowerCase() });
        if (existing) {
            return NextResponse.json({ error: 'A user with this email already exists.' }, { status: 409 });
        }
        const hashed = await bcrypt.hash(password, 10);
        const user = await User.create({
            name: name.trim(),
            email: email.trim().toLowerCase(),
            password: hashed,
            role: newRole,
        });
        const u = user.toObject();
        delete (u as any).password;
        return NextResponse.json({ _id: u._id, name: u.name, email: u.email, role: u.role, createdAt: u.createdAt }, { status: 201 });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
