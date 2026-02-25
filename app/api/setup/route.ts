import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { connectDB } from '@/lib/db';
import User from '@/models/User';

// Check if setup is allowed (no users yet)
export async function GET() {
    try {
        await connectDB();
        const count = await User.countDocuments();
        return NextResponse.json({ allowed: count === 0 });
    } catch {
        return NextResponse.json({ allowed: false });
    }
}

// One-time setup: create first user (owner) when no users exist.
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { name, email, password } = body;
        if (!name?.trim() || !email?.trim() || !password) {
            return NextResponse.json({ error: 'Name, email, and password are required.' }, { status: 400 });
        }
        if (password.length < 6) {
            return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });
        }
        await connectDB();
        const count = await User.countDocuments();
        if (count > 0) {
            return NextResponse.json({ error: 'Setup already completed. Users exist.' }, { status: 400 });
        }
        const hashed = await bcrypt.hash(password, 10);
        const user = await User.create({
            name: name.trim(),
            email: email.trim().toLowerCase(),
            password: hashed,
            role: 'owner',
        });
        const u = user.toObject();
        delete (u as any).password;
        return NextResponse.json({ message: 'Owner created.', user: { _id: u._id, name: u.name, email: u.email, role: u.role } }, { status: 201 });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
