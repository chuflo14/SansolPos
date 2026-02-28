'use client';

import { useState, useCallback } from 'react';
import { RefreshCw, Search, Loader2, Banknote, AlertCircle, CheckCircle, Settings, Clock, User } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';

type Payment = {
    id: number;
    date: string;
    amount: number;
    description: string;
    payer_name: string;
    payer_email: string;
    status: string;
    matched: boolean | null;
};

const HOUR_OPTIONS = [2, 4, 8, 12, 24];

function fmt(n: number) {
    return n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function relativeTime(dateStr: string) {
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
    if (diff < 60) return 'hace un momento';
    if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
    return new Date(dateStr).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function TransferenciasPage() {
    const { storeId } = useAuth();
    const supabase = createClient();

    const [amountFilter, setAmountFilter] = useState('');
    const [hours, setHours] = useState(8);
    const [payments, setPayments] = useState<Payment[] | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [noToken, setNoToken] = useState(false);
    const [lastFetch, setLastFetch] = useState<string | null>(null);

    const fetchPayments = useCallback(async () => {
        if (!storeId) return;
        setLoading(true);
        setError(null);
        setNoToken(false);

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { setError('No hay sesión activa.'); setLoading(false); return; }

        const params = new URLSearchParams({ store_id: storeId, hours: hours.toString() });
        if (amountFilter) params.set('amount', amountFilter);

        const res = await fetch(
            `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/mp-verify-payments?${params}`,
            { headers: { Authorization: `Bearer ${session.access_token}` } }
        );

        const json = await res.json();

        if (json.error === 'NO_TOKEN') {
            setNoToken(true);
            setPayments(null);
        } else if (json.error) {
            setError(json.message ?? 'Error al consultar Mercado Pago.');
            setPayments(null);
        } else {
            setPayments(json.payments ?? []);
            setLastFetch(new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }));
        }
        setLoading(false);
    }, [storeId, supabase, hours, amountFilter]);

    const filtered = payments
        ? (amountFilter
            ? payments.sort((a, b) => (b.matched ? 1 : 0) - (a.matched ? 1 : 0))
            : payments)
        : null;

    return (
        <div className="h-full w-full overflow-y-auto bg-slate-950 font-sans custom-scrollbar">
            <div className="p-8 lg:p-10 pb-32 max-w-3xl mx-auto min-h-screen">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-4xl font-black text-white tracking-tight">Transferencias</h1>
                        <p className="text-slate-400 mt-2 font-medium">Verificá si llegó un pago a Mercado Pago.</p>
                        {lastFetch && (
                            <p className="text-slate-600 text-xs mt-1 flex items-center gap-1">
                                <Clock size={12} /> Actualizado a las {lastFetch}
                            </p>
                        )}
                    </div>
                    <button
                        onClick={fetchPayments}
                        disabled={loading}
                        className="shrink-0 flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        {loading ? 'Consultando...' : 'Consultar MP'}
                    </button>
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-3 mb-6">
                    {/* Amount filter */}
                    <div className="relative flex-1">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="Filtrar por monto exacto..."
                            value={amountFilter}
                            onChange={e => setAmountFilter(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && fetchPayments()}
                            className="w-full pl-8 pr-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl text-white outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 placeholder-slate-600 font-medium"
                        />
                    </div>
                    {/* Hours selector */}
                    <div className="flex gap-1 bg-slate-900/50 border border-slate-800 rounded-xl p-1">
                        {HOUR_OPTIONS.map(h => (
                            <button
                                key={h}
                                onClick={() => setHours(h)}
                                className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${hours === h ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                            >
                                {h}h
                            </button>
                        ))}
                    </div>
                </div>

                {/* States */}
                {!payments && !loading && !noToken && !error && (
                    <div className="flex flex-col items-center py-24 gap-4 text-slate-600">
                        <Banknote size={48} className="text-slate-800" />
                        <p className="font-semibold text-center">
                            Ingresá el monto esperado (opcional) y<br />presioná <strong className="text-slate-400">Consultar MP</strong>
                        </p>
                    </div>
                )}

                {loading && (
                    <div className="flex items-center justify-center py-24">
                        <Loader2 className="animate-spin text-blue-400" size={40} />
                    </div>
                )}

                {/* No token configured */}
                {noToken && !loading && (
                    <div className="flex flex-col items-center py-16 gap-6 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                            <AlertCircle size={28} className="text-amber-400" />
                        </div>
                        <div>
                            <h3 className="text-white font-black text-xl mb-2">Access Token no configurado</h3>
                            <p className="text-slate-400 text-sm max-w-sm">
                                La dueña debe cargar el <strong className="text-slate-300">Access Token de Mercado Pago</strong> en la sección Configuración para habilitar esta función.
                            </p>
                        </div>
                        <a
                            href="/settings"
                            className="flex items-center gap-2 px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold rounded-xl border border-slate-700 transition-all"
                        >
                            <Settings size={16} /> Ir a Configuración
                        </a>
                    </div>
                )}

                {/* API error */}
                {error && !loading && (
                    <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 font-semibold rounded-2xl flex items-center gap-3">
                        <AlertCircle size={20} />
                        {error}
                    </div>
                )}

                {/* Results */}
                {filtered && !loading && (
                    <>
                        {/* Amount match highlight */}
                        {amountFilter && filtered.some(p => p.matched) && (
                            <div className="mb-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3">
                                <CheckCircle size={20} className="text-emerald-400 shrink-0" />
                                <p className="text-emerald-300 font-bold text-sm">
                                    ¡Se encontró al menos un pago por ${fmt(parseFloat(amountFilter))}!
                                </p>
                            </div>
                        )}

                        {amountFilter && !filtered.some(p => p.matched) && filtered.length > 0 && (
                            <div className="mb-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center gap-3">
                                <AlertCircle size={20} className="text-amber-400 shrink-0" />
                                <p className="text-amber-300 font-bold text-sm">
                                    No hay pagos exactos por ${fmt(parseFloat(amountFilter))} en las últimas {hours}h.
                                </p>
                            </div>
                        )}

                        {filtered.length === 0 && (
                            <div className="text-center py-16 text-slate-600 font-semibold">
                                Sin pagos recibidos en las últimas {hours} horas.
                            </div>
                        )}

                        <div className="space-y-3">
                            {filtered.map(p => (
                                <div
                                    key={p.id}
                                    className={`rounded-2xl border p-5 transition-all ${p.matched
                                        ? 'border-emerald-500/40 bg-emerald-950/20 shadow-lg shadow-emerald-500/5'
                                        : 'border-slate-800 bg-slate-900/50'
                                        }`}
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className={`text-2xl font-black ${p.matched ? 'text-emerald-400' : 'text-white'}`}>
                                                    ${fmt(p.amount)}
                                                </span>
                                                {p.matched && (
                                                    <span className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full">
                                                        <CheckCircle size={10} /> Coincide
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 mt-2 text-slate-400 text-sm flex-wrap">
                                                <User size={13} />
                                                <span className="font-semibold">{p.payer_name}</span>
                                                {p.payer_email && (
                                                    <span className="text-slate-600">· {p.payer_email}</span>
                                                )}
                                            </div>
                                            {p.description && (
                                                <p className="text-slate-500 text-xs mt-1">"{p.description}"</p>
                                            )}
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-slate-400 text-xs font-semibold">{relativeTime(p.date)}</p>
                                            <p className="text-slate-700 text-xs font-mono mt-1 select-all">#{p.id}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {/* MP attribution */}
                {payments !== null && !loading && (
                    <p className="text-center text-slate-700 text-xs mt-8">
                        Datos provistos por la API oficial de Mercado Pago • Solo pagos aprobados
                    </p>
                )}
            </div>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar { width: 8px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: #020617; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #334155; }
            `}</style>
        </div>
    );
}
