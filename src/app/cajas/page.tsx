'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { Loader2, ReceiptText, AlertTriangle, TrendingUp, TrendingDown, Scale } from 'lucide-react';

type CashSession = {
    id: string;
    opened_at: string;
    closed_at: string | null;
    opening_amount: number;
    closing_amount: number | null;
    status: 'OPEN' | 'CLOSED';
    notes: string | null;
    closing_notes: string | null;
    sales_total: number;
    expenses_total: number;
};

export default function CajasPage() {
    const { storeId, userRole } = useAuth();
    const supabase = createClient();
    const [sessions, setSessions] = useState<CashSession[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchSessions = async () => {
            if (!storeId || userRole !== 'admin') return;

            // FASE5: Consulta básica de historial de cajas
            // Sumamos las ventas y gastos por cada sesión
            const { data: rawSessions, error } = await supabase
                .from('cash_sessions')
                .select(`
                    *,
                    sales(total, status),
                    expenses(amount)
                `)
                .eq('store_id', storeId)
                .order('opened_at', { ascending: false })
                .limit(50);

            if (!error && rawSessions) {
                const formatted = rawSessions.map(rs => {
                    const validSales = rs.sales?.filter((s: any) => s.status === 'COMPLETED') || [];
                    const salesTotal = validSales.reduce((acc: number, s: any) => acc + Number(s.total), 0);

                    const validExpenses = rs.expenses || [];
                    const expensesTotal = validExpenses.reduce((acc: number, e: any) => acc + Number(e.amount), 0);

                    return {
                        id: rs.id,
                        opened_at: rs.opened_at,
                        closed_at: rs.closed_at,
                        opening_amount: Number(rs.opening_amount),
                        closing_amount: rs.closing_amount !== null ? Number(rs.closing_amount) : null,
                        status: rs.status,
                        notes: rs.notes,
                        closing_notes: rs.closing_notes,
                        sales_total: salesTotal,
                        expenses_total: expensesTotal
                    };
                });
                setSessions(formatted);
            }
            setIsLoading(false);
        };

        fetchSessions();
    }, [storeId, userRole, supabase]);

    if (userRole !== 'admin') {
        return <div className="p-8 text-center text-slate-400">Acceso denegado. Solo administradores.</div>;
    }

    const fmt = (n: number) => n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
    const fmtDate = (d: string) => new Date(d).toLocaleString('es-AR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });

    return (
        <div className="p-8 space-y-6">
            <div>
                <h1 className="text-3xl font-bold flex items-center gap-3">
                    <ReceiptText className="text-primary" size={32} />
                    Historial de Cajas
                </h1>
                <p className="text-slate-400 mt-2">Registro de aperturas y cierres de caja de la sucursal activa.</p>
            </div>

            {isLoading ? (
                <div className="flex justify-center p-12">
                    <Loader2 className="animate-spin text-primary" size={48} />
                </div>
            ) : (
                <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-800/50 text-slate-400 text-sm uppercase tracking-wider border-b border-slate-700">
                                    <th className="p-4 font-medium">Apertura</th>
                                    <th className="p-4 font-medium">Estado</th>
                                    <th className="p-4 font-medium text-right">Inicial</th>
                                    <th className="p-4 font-medium text-right">Ingresos</th>
                                    <th className="p-4 font-medium text-right">Retiros</th>
                                    <th className="p-4 font-medium text-right">Cierre Declarado</th>
                                    <th className="p-4 font-medium text-right">Diferencia</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {sessions.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="p-8 text-center text-slate-500">
                                            No hay registros de caja para esta sucursal.
                                        </td>
                                    </tr>
                                ) : (
                                    sessions.map((s) => {
                                        const expected = s.opening_amount + s.sales_total - s.expenses_total;
                                        const diff = s.closing_amount !== null ? s.closing_amount - expected : 0;
                                        const isClosed = s.status === 'CLOSED';

                                        return (
                                            <tr key={s.id} className="hover:bg-slate-800/20 transition-colors group">
                                                <td className="p-4">
                                                    <div className="font-medium text-slate-200">{fmtDate(s.opened_at)}</div>
                                                    {isClosed && <div className="text-sm text-slate-500 shrink-0">Cerró: {fmtDate(s.closed_at!)}</div>}
                                                </td>
                                                <td className="p-4">
                                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${isClosed ? 'bg-slate-800 text-slate-300' : 'bg-green-500/20 text-green-400 border border-green-500/30'
                                                        }`}>
                                                        {isClosed ? 'CERRADA' : 'ABIERTA'}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-right text-slate-300">{fmt(s.opening_amount)}</td>
                                                <td className="p-4 text-right text-green-400">+{fmt(s.sales_total)}</td>
                                                <td className="p-4 text-right text-red-400">-{fmt(s.expenses_total)}</td>
                                                <td className="p-4 text-right font-medium">
                                                    {isClosed ? fmt(s.closing_amount!) : '-'}
                                                </td>
                                                <td className="p-4 text-right">
                                                    {isClosed ? (
                                                        <div className={`font-bold flex items-center justify-end gap-1 ${diff === 0 ? 'text-slate-400' : diff > 0 ? 'text-blue-400' : 'text-red-500'
                                                            }`}>
                                                            {diff === 0 ? <Scale size={14} /> : diff > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                                            {diff > 0 ? '+' : ''}{fmt(diff)}
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-600">-</span>
                                                    )}
                                                </td>
                                            </tr>
                                        )
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
