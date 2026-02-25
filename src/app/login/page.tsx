'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Lock, Mail, Store } from 'lucide-react';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const router = useRouter();
    const supabase = createClient();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;

            // Login exitoso, AuthContext atrapará el cambio y redirigirá si el middleware lo permite.
            router.push('/');
            router.refresh();
        } catch (err: any) {
            setError(err.message || 'Error al iniciar sesión');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 font-sans relative overflow-hidden">
            {/* Background Decorations */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none"></div>

            <div className="w-full max-w-md relative z-10">
                <div className="flex flex-col items-center mb-10">
                    <div className="w-16 h-16 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-center text-blue-500 mb-6 shadow-[0_0_30px_rgba(59,130,246,0.15)]">
                        <Store size={32} />
                    </div>
                    <h1 className="text-3xl font-black text-white tracking-tight">Sansol</h1>
                    <p className="text-slate-400 font-medium mt-2 text-center">Inicia sesión en tu terminal de punto de venta</p>
                </div>

                <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
                    <div className="p-8">
                        {error && (
                            <div className="mb-6 bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl text-sm font-semibold text-center">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleLogin} className="space-y-5">
                            <div>
                                <label className="block text-sm font-bold text-slate-300 mb-2">Correo Electrónico</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                                    <input
                                        type="email"
                                        required
                                        className="w-full pl-12 pr-4 py-4 bg-slate-950/50 border border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none text-white font-medium placeholder-slate-600 transition-all shadow-inner"
                                        placeholder="admin@sansol.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        disabled={loading}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-300 mb-2">Contraseña</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                                    <input
                                        type="password"
                                        required
                                        className="w-full pl-12 pr-4 py-4 bg-slate-950/50 border border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none text-white font-medium placeholder-slate-600 transition-all shadow-inner"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        disabled={loading}
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-4 mt-4 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl shadow-lg shadow-blue-500/20 transition-all border border-blue-500 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'ACCEDIENDO...' : 'INGRESAR'}
                            </button>
                        </form>
                    </div>
                    <div className="bg-slate-950/80 p-6 border-t border-slate-800 text-center">
                        <p className="text-sm text-slate-500 font-medium">Soporte y Contacto Técnico</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
