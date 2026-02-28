'use client';

import { useState, useEffect } from 'react';
import { LogOut, Loader2, TrendingUp, TrendingDown, DollarSign, Scale } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';

interface Props {
    sessionId: string;
    openingAmount: number;
    onSessionClosed: () => void;
}

function fmt(n: number) {
    return n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function CashCloseModal({ sessionId, openingAmount, onSessionClosed }: Props) {
    const { storeId } = useAuth();
    const supabase = createClient();

    const [salesTotal, setSalesTotal] = useState(0);
    const [cashSales, setCashSales] = useState(0);
    const [expensesTotal, setExpensesTotal] = useState(0);
    const [counted, setCounted] = useState('');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const expectedCash = openingAmount + cashSales - expensesTotal;
    const countedNum = parseFloat(counted) || 0;
    const diff = countedNum - expectedCash;

    useEffect(() => {
        const fetchTotals = async () => {
            if (!storeId || !sessionId) return;
            setLoading(true);

            const [{ data: salesData }, { data: expData }] = await Promise.all([
                supabase
                    .from('sales')
                    .select('total, payment_method')
                    .eq('cash_session_id', sessionId)
                    .eq('status', 'COMPLETED'),
                supabase
                    .from('expenses')
                    .select('amount')
                    .eq('store_id', storeId)
                    .gte('created_at', new Date().toISOString().slice(0, 10)),
            ]);

            if (salesData) {
                const total = salesData.reduce((s, r) => s + (r.total ?? 0), 0);
                const cash = salesData.filter(r => r.payment_method === 'efectivo').reduce((s, r) => s + (r.total ?? 0), 0);
                setSalesTotal(total);
                setCashSales(cash);
            }
            if (expData) {
                setExpensesTotal(expData.reduce((s, r) => s + (r.amount ?? 0), 0));
            }
            setLoading(false);
        };
        fetchTotals();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sessionId, storeId]);

    const handleClose = async () => {
        setSaving(true);
        setError(null);
        const { error: err } = await supabase
            .from('cash_sessions')
            .update({
                status: 'CLOSED',
                closed_at: new Date().toISOString(),
                closing_amount: countedNum,
                expected_amount: expectedCash,
                notes: notes.trim() || null,
            })
            .eq('id', sessionId);

        if (err) {
            setError('No se pudo cerrar la caja. Intenta nuevamente.');
            setSaving(false);
            return;
        }
        onSessionClosed();
    };

    const row = (icon: React.ReactNode, label: string, value: number, color?: string) => (
        <div className="flex items-center justify-between py-3 border-b border-slate-800 last:border-0">
            <div className="flex items-center gap-3 text-slate-300">
                {icon}
                <span className="font-semibold">{label}</span>
            </div>
            <span className={`font-black text-lg ${color ?? 'text-white'}`}>${fmt(value)}</span>
        </div>
    );

    return (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl w-full max-w-md">

                {/* Header */}
                <div className="p-6 border-b border-slate-800 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                        <LogOut size={20} className="text-orange-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-white">Cierre de Caja</h2>
                        <p className="text-slate-400 text-sm">Resumen del turno actual</p>
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="animate-spin text-orange-400" size={36} />
                    </div>
                ) : (
                    <div className="p-6 space-y-6">
                        {/* Summary */}
                        <div className="bg-slate-950/50 rounded-2xl border border-slate-800 px-4">
                            {row(<DollarSign size={18} className="text-slate-400" />, 'Apertura', openingAmount)}
                            {row(<TrendingUp size={18} className="text-emerald-400" />, 'Ventas (total)', salesTotal, 'text-emerald-400')}
                            {row(<TrendingUp size={18} className="text-blue-400" />, 'Ventas en efectivo', cashSales, 'text-blue-300')}
                            {row(<TrendingDown size={18} className="text-rose-400" />, 'Gastos del día', expensesTotal, 'text-rose-400')}
                            <div className="flex items-center justify-between py-3">
                                <div className="flex items-center gap-3 text-slate-200">
                                    <Scale size={18} className="text-amber-400" />
                                    <span className="font-bold">Efectivo esperado</span>
                                </div>
                                <span className="font-black text-xl text-amber-300">${fmt(expectedCash)}</span>
                            </div>
                        </div>

                        {/* Counted amount */}
                        <div>
                            <label className="block text-sm font-bold text-slate-300 mb-2">
                                Efectivo contado ($)
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">$</span>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    placeholder="0.00"
                                    value={counted}
                                    onChange={e => setCounted(e.target.value)}
                                    className="w-full pl-10 pr-4 py-4 bg-slate-950/50 border border-slate-700 rounded-xl text-white text-xl font-bold outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all"
                                    autoFocus
                                />
                            </div>
                            {counted !== '' && (
                                <p className={`mt-2 text-sm font-bold ${diff >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    Diferencia: {diff >= 0 ? '+' : ''}${fmt(diff)}
                                    {diff === 0 && ' ✓ Cuadra perfecto'}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-300 mb-2">Notas (opcional)</label>
                            <input
                                type="text"
                                placeholder="Ej: Turno tarde"
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-950/50 border border-slate-700 rounded-xl text-white outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all placeholder-slate-600"
                            />
                        </div>

                        {error && (
                            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-semibold rounded-xl">
                                {error}
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={onSessionClosed}
                                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl border border-slate-700 transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleClose}
                                disabled={saving}
                                className="flex-1 flex items-center justify-center gap-2 py-3 bg-orange-600 hover:bg-orange-500 text-white font-black rounded-xl transition-all shadow-lg shadow-orange-500/20 disabled:opacity-50"
                            >
                                {saving
                                    ? <><Loader2 size={18} className="animate-spin" /> Cerrando...</>
                                    : <><LogOut size={18} /> Cerrar Turno</>}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
