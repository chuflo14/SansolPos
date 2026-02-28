'use client';

import { useState } from 'react';
import { Banknote, Loader2, LogIn } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';

interface Props {
    onSessionOpened: (sessionId: string, openingAmount: number) => void;
}

export function CashOpenModal({ onSessionOpened }: Props) {
    const { storeId, user } = useAuth();
    const supabase = createClient();

    const [amount, setAmount] = useState('');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleOpen = async () => {
        const numeric = parseFloat(amount);
        if (isNaN(numeric) || numeric < 0) {
            setError('Ingresá un monto válido (puede ser 0).');
            return;
        }
        if (!storeId || !user) return;

        setLoading(true);
        setError(null);

        const { data, error: err } = await supabase
            .from('cash_sessions')
            .insert({
                store_id: storeId,
                cashier_id: user.id,
                opening_amount: numeric,
                notes: notes.trim() || null,
                status: 'OPEN',
            })
            .select('id')
            .single();

        if (err || !data) {
            setError('No se pudo abrir la caja. Intenta nuevamente.');
            setLoading(false);
            return;
        }

        onSessionOpened(data.id, numeric);
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl w-full max-w-md p-8">

                {/* Icon + Title */}
                <div className="flex flex-col items-center mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
                        <Banknote size={32} className="text-emerald-400" />
                    </div>
                    <h2 className="text-2xl font-black text-white">Apertura de Caja</h2>
                    <p className="text-slate-400 text-sm mt-1 text-center">
                        Ingresá el efectivo disponible al iniciar el turno.
                    </p>
                </div>

                {error && (
                    <div className="mb-5 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-semibold rounded-xl">
                        {error}
                    </div>
                )}

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-300 mb-2">
                            Monto inicial en caja ($)
                        </label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">$</span>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleOpen()}
                                className="w-full pl-10 pr-4 py-4 bg-slate-950/50 border border-slate-700 rounded-xl text-white text-xl font-bold outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                                autoFocus
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-300 mb-2">
                            Notas (opcional)
                        </label>
                        <input
                            type="text"
                            placeholder="Ej: Turno mañana"
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-950/50 border border-slate-700 rounded-xl text-white outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all placeholder-slate-600"
                        />
                    </div>
                </div>

                <button
                    onClick={handleOpen}
                    disabled={loading}
                    className="mt-7 w-full flex items-center justify-center gap-3 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-lg rounded-2xl transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading
                        ? <><Loader2 size={20} className="animate-spin" /> Abriendo...</>
                        : <><LogIn size={20} /> Abrir Turno</>}
                </button>
            </div>
        </div>
    );
}
