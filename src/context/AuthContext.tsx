'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User, Session } from '@supabase/supabase-js';

type AuthContextType = {
    user: User | null;
    session: Session | null;
    storeId: string | null;
    userRole: string | null;
    isLoading: boolean;
    signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    storeId: null,
    userRole: null,
    isLoading: true,
    signOut: async () => { },
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [storeId, setStoreId] = useState<string | null>(null);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        // Inicializar la sesión
        const initializeAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();

            // MOCK FOR LOCAL DEV
            if (!session && window.location.hostname === 'localhost') {
                console.log("Setting MOCK session for local dev");
                const mockUser = {
                    id: '4f6e7032-8615-4e0b-88fc-e87316c5dfd4',
                    email: 'sansolvera1@gmail.com',
                } as User;
                setSession({ user: mockUser } as Session);
                setUser(mockUser);
                await fetchStoreAndRole(mockUser.id);
                return;
            }

            setSession(session);
            setUser(session?.user ?? null);

            if (session?.user?.id) {
                await fetchStoreAndRole(session.user.id);
            } else {
                setIsLoading(false);
            }
        };

        initializeAuth();

        // Escuchar cambios en la autenticación
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);

            if (session?.user?.id) {
                await fetchStoreAndRole(session.user.id);
            } else {
                setStoreId(null);
                setUserRole(null);
                setIsLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, [supabase]);

    const fetchStoreAndRole = async (userId: string) => {
        try {
            console.log("Fetching store and role for user ID:", userId);
            // Buscar el store_id y rol del usuario en la tabla store_users
            const { data, error } = await supabase
                .from('store_users')
                .select('store_id, role')
                .eq('user_id', userId)
                .single();

            console.log("Supabase response:", { data, error });

            if (data) {
                console.log("Setting storeId:", data.store_id, "and userRole:", data.role);
                setStoreId(data.store_id);
                setUserRole(data.role);
            } else {
                console.warn("Usuario sin tienda ni rol asignado.");
            }
        } catch (error) {
            console.error("Error obteniendo datos de tienda y rol:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const signOut = async () => {
        await supabase.auth.signOut();
    };

    return (
        <AuthContext.Provider value={{ user, session, storeId, userRole, isLoading, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
