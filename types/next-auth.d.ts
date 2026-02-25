import 'next-auth';

declare module 'next-auth' {
    interface User {
        id?: string;
        role?: string;
    }

    interface Session {
        user: {
            id?: string;
            name?: string | null;
            email?: string | null;
            image?: string | null;
            role?: 'owner' | 'cashier_pos' | 'cashier_inventory';
        };
    }
}

declare module 'next-auth/jwt' {
    interface JWT {
        id?: string;
        role?: 'owner' | 'cashier_pos' | 'cashier_inventory';
    }
}
