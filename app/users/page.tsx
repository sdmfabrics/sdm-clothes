'use client';

import { useEffect, useState } from 'react';
import { Users as UsersIcon, Plus, Trash2, Key, Loader2, X, Check } from 'lucide-react';

interface UserRow {
    _id: string;
    name: string;
    email: string;
    role: string;
    createdAt: string;
}

const ROLES = [
    { value: 'owner', label: 'Owner' },
    { value: 'cashier_pos', label: 'Cashier (POS only)' },
    { value: 'cashier_inventory', label: 'Cashier (POS + Inventory)' },
];

export default function UsersPage() {
    const [users, setUsers] = useState<UserRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
    const [showCreate, setShowCreate] = useState(false);
    const [createForm, setCreateForm] = useState({ name: '', email: '', password: '', role: 'cashier_pos' });
    const [creating, setCreating] = useState(false);
    const [changePasswordId, setChangePasswordId] = useState<string | null>(null);
    const [newPassword, setNewPassword] = useState('');
    const [savingPassword, setSavingPassword] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);

    function showToast(msg: string, type: 'success' | 'error') {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    }

    useEffect(() => {
        fetch('/api/users')
            .then((r) => r.json())
            .then((data) => {
                setUsers(Array.isArray(data) ? data : []);
            })
            .catch(() => setUsers([]))
            .finally(() => setLoading(false));
    }, []);

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        if (!createForm.name.trim() || !createForm.email.trim() || !createForm.password) {
            showToast('Name, email, and password are required.', 'error');
            return;
        }
        setCreating(true);
        try {
            const res = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(createForm),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to create user');
            setUsers((prev) => [data, ...prev]);
            setShowCreate(false);
            setCreateForm({ name: '', email: '', password: '', role: 'cashier_pos' });
            showToast('User created.', 'success');
        } catch (err: any) {
            showToast(err.message, 'error');
        } finally {
            setCreating(false);
        }
    }

    async function handleChangePassword() {
        if (!changePasswordId || !newPassword.trim()) return;
        setSavingPassword(true);
        try {
            const res = await fetch(`/api/users/${changePasswordId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: newPassword }),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to update password');
            }
            setChangePasswordId(null);
            setNewPassword('');
            showToast('Password updated.', 'success');
        } catch (err: any) {
            showToast(err.message, 'error');
        } finally {
            setSavingPassword(false);
        }
    }

    async function handleDelete(id: string) {
        setDeleting(true);
        try {
            const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to delete');
            }
            setUsers((prev) => prev.filter((u) => u._id !== id));
            setDeleteId(null);
            showToast('User deleted.', 'success');
        } catch (err: any) {
            showToast(err.message, 'error');
        } finally {
            setDeleting(false);
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
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            {toast && (
                <div
                    className={`fixed top-4 right-4 z-[100] text-white text-sm px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 ${
                        toast.type === 'error' ? 'bg-red-600' : 'bg-slate-800'
                    }`}
                >
                    <Check size={16} /> {toast.msg}
                </div>
            )}

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <UsersIcon size={26} className="text-sky-600" /> User Management
                    </h1>
                    <p className="text-sm text-slate-500 mt-0.5">Create and manage users (owner only)</p>
                </div>
                <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
                    <Plus size={16} /> Create User
                </button>
            </div>

            <div className="card !p-0 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100 text-left">
                                <th className="px-5 py-3.5 font-semibold text-slate-600">Name</th>
                                <th className="px-5 py-3.5 font-semibold text-slate-600">Email</th>
                                <th className="px-5 py-3.5 font-semibold text-slate-600">Role</th>
                                <th className="px-5 py-3.5 font-semibold text-slate-600 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {users.map((u) => (
                                <tr key={u._id} className="hover:bg-slate-50">
                                    <td className="px-5 py-4 font-medium text-slate-800">{u.name}</td>
                                    <td className="px-5 py-4 text-slate-600">{u.email}</td>
                                    <td className="px-5 py-4">
                                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-100 text-sky-700">
                                            {u.role}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4 text-right">
                                        <button
                                            onClick={() => {
                                                setChangePasswordId(u._id);
                                                setNewPassword('');
                                            }}
                                            className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 mr-1"
                                            title="Change password"
                                        >
                                            <Key size={15} />
                                        </button>
                                        <button
                                            onClick={() => setDeleteId(u._id)}
                                            disabled={u.role === 'owner'}
                                            className="p-2 rounded-lg hover:bg-red-50 text-red-500 disabled:opacity-40 disabled:cursor-not-allowed"
                                            title={u.role === 'owner' ? 'Cannot delete owner' : 'Delete user'}
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {showCreate && (
                <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
                        <div className="flex items-center justify-between">
                            <h2 className="font-bold text-lg text-slate-800">Create User</h2>
                            <button onClick={() => setShowCreate(false)} className="p-2 rounded-lg hover:bg-slate-100">
                                <X size={18} />
                            </button>
                        </div>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="text-xs font-semibold text-slate-600 mb-1 block">Name</label>
                                <input
                                    className="input"
                                    value={createForm.name}
                                    onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))}
                                    placeholder="Full name"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-600 mb-1 block">Email</label>
                                <input
                                    type="email"
                                    className="input"
                                    value={createForm.email}
                                    onChange={(e) => setCreateForm((p) => ({ ...p, email: e.target.value }))}
                                    placeholder="email@example.com"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-600 mb-1 block">Password</label>
                                <input
                                    type="password"
                                    className="input"
                                    value={createForm.password}
                                    onChange={(e) => setCreateForm((p) => ({ ...p, password: e.target.value }))}
                                    placeholder="••••••••"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-600 mb-1 block">Role</label>
                                <select
                                    className="input"
                                    value={createForm.role}
                                    onChange={(e) => setCreateForm((p) => ({ ...p, role: e.target.value }))}
                                >
                                    {ROLES.map((r) => (
                                        <option key={r.value} value={r.value}>
                                            {r.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary flex-1">
                                    Cancel
                                </button>
                                <button type="submit" disabled={creating} className="btn-primary flex-1 flex items-center justify-center gap-2">
                                    {creating && <Loader2 size={15} className="animate-spin" />} Create
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {changePasswordId && (
                <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="font-bold text-lg text-slate-800">Change Password</h2>
                            <button onClick={() => { setChangePasswordId(null); setNewPassword(''); }} className="p-2 rounded-lg hover:bg-slate-100">
                                <X size={18} />
                            </button>
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-600 mb-1 block">New Password</label>
                            <input
                                type="password"
                                className="input"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="••••••••"
                            />
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => { setChangePasswordId(null); setNewPassword(''); }} className="btn-secondary flex-1">Cancel</button>
                            <button onClick={handleChangePassword} disabled={savingPassword || !newPassword.trim()} className="btn-primary flex-1 flex items-center justify-center gap-2">
                                {savingPassword && <Loader2 size={15} className="animate-spin" />} Update
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {deleteId && (
                <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
                        <h2 className="font-bold text-lg text-slate-800">Delete User?</h2>
                        <p className="text-sm text-slate-500">This user will no longer be able to sign in.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteId(null)} className="btn-secondary flex-1">Cancel</button>
                            <button onClick={() => handleDelete(deleteId)} disabled={deleting} className="btn-danger flex-1 !bg-red-600 !text-white flex items-center justify-center gap-2">
                                {deleting && <Loader2 size={15} className="animate-spin" />} Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
