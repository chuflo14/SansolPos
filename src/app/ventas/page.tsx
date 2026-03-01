'use client';

import { useState, useEffect, useCallback } from 'react';
import { Trash2, Loader2, Search, RotateCcw } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';

type SaleItem = {
    name: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
};

type Sale = {
    id: string;
    created_at: string;
    total: number;
    payment_method: string;
    status: string;
    customer_name: string | null;
    customer_phone: string | null;
    voided_at: string | null;
    sale_items: SaleItem[];
};

const PAY_LABELS: Record<string, string> = {
    efectivo: 'Efectivo',
    tarjeta: 'Tarjeta',
    transferencia: 'Transferencia',
    mercadopago: 'Mercado Pago',
};

function fmt(n: number) {
    return n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function VentasPage() {
    const { storeId, user } = useAuth();
    const supabase = createClient();

    const today = new Date().toISOString().slice(0, 10);
    const [date, setDate] = useState(today);
    const [sales, setSales] = useState<Sale[]>([]);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterMethod, setFilterMethod] = useState('all');
    const [isLoading, setIsLoading] = useState(true);
    const [expanded, setExpanded] = useState<string | null>(null);
    const [voiding, setVoiding] = useState<string | null>(null);

    const fetchSales = useCallback(async () => {
        if (!storeId) return;
        setIsLoading(true);
        const start = `${date}T00:00:00.000-03:00`;
        const end = `${date}T23:59:59.999-03:00`;

        const { data } = await supabase
            .from('sales')
            .select('id, created_at, total, payment_method, status, customer_name, customer_phone, voided_at, sale_items(name, quantity, unit_price, subtotal)')
            .eq('store_id', storeId)
            .gte('created_at', start)
            .lte('created_at', end)
            .order('created_at', { ascending: false });

        setSales((data as Sale[]) ?? []);
        setIsLoading(false);
    }, [storeId, supabase, date]);

    useEffect(() => { fetchSales(); }, [fetchSales]);

    const handleVoid = async (saleId: string) => {
        if (!confirm('¿Anular esta venta? Se restaurará el stock de los productos.')) return;
        if (!storeId || !user) return;

        setVoiding(saleId);
        const { data, error } = await supabase.rpc('void_sale', {
            p_sale_id: saleId,
            p_cashier_id: user.id,
            p_store_id: storeId,
        });

        if (error || !data?.success) {
            alert(data?.error ?? 'No se pudo anular la venta.');
        } else {
            setSales(prev => prev.map(s =>
                s.id === saleId
                    ? { ...s, status: 'CANCELLED', voided_at: new Date().toISOString() }
                    : s
            ));
        }
        setVoiding(null);
    };

    const filtered = sales.filter(s => {
        const q = search.toLowerCase();
        const matchesSearch = !q ||
            s.customer_name?.toLowerCase().includes(q) ||
            s.customer_phone?.includes(q) ||
            s.id.toLowerCase().includes(q);

        const matchesStatus = filterStatus === 'all' || s.status === filterStatus;
        const matchesMethod = filterMethod === 'all' || s.payment_method === filterMethod;

        return matchesSearch && matchesStatus && matchesMethod;
    });

    const totalCompleted = filtered.filter(s => s.status === 'COMPLETED').reduce((a, s) => a + s.total, 0);
    const totalVoided = filtered.filter(s => s.status === 'CANCELLED').length;

    return (
        <div className="h-full w-full overflow-y-auto bg-slate-950 font-sans custom-scrollbar">
            <div className="p-8 lg:p-10 pb-32 max-w-[1400px] mx-auto min-h-screen">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
                    <div>
                        <h1 className="text-4xl font-black text-white tracking-tight">Ventas</h1>
                        <p className="text-slate-400 mt-2 font-medium">Historial y anulación de ventas.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <input
                            type="date"
                            value={date}
                            max={today}
                            onChange={e => setDate(e.target.value)}
                            className="px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-medium outline-none focus:ring-2 focus:ring-blue-500/50"
                        />
                        <button
                            onClick={fetchSales}
                            className="p-2.5 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors"
                            title="Actualizar"
                        >
                            <RotateCcw size={18} />
                        </button>
                    </div>
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
                    {[
                        { label: 'Total del día', value: `$${fmt(totalCompleted)}`, color: 'text-emerald-400' },
                        { label: 'Ventas completadas', value: filtered.filter(s => s.status === 'COMPLETED').length.toString(), color: 'text-white' },
                        { label: 'Anuladas', value: totalVoided.toString(), color: totalVoided > 0 ? 'text-rose-400' : 'text-slate-400' },
                    ].map(kpi => (
                        <div key={kpi.label} className="bg-slate-900/50 rounded-2xl border border-slate-800 p-5">
                            <p className="text-slate-400 text-sm font-semibold">{kpi.label}</p>
                            <p className={`text-3xl font-black mt-1 ${kpi.color}`}>{kpi.value}</p>
                        </div>
                    ))}
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <div className="relative flex-1">
                        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Buscar por cliente, teléfono o ID..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl text-white outline-none focus:ring-2 focus:ring-blue-500/50 placeholder-slate-600"
                        />
                    </div>

                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="px-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl text-white outline-none focus:ring-2 focus:ring-blue-500/50"
                    >
                        <option value="all">Todos los estados</option>
                        <option value="COMPLETED">Completadas</option>
                        <option value="CANCELLED">Anuladas</option>
                    </select>

                    <select
                        value={filterMethod}
                        onChange={(e) => setFilterMethod(e.target.value)}
                        className="px-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl text-white outline-none focus:ring-2 focus:ring-blue-500/50"
                    >
                        <option value="all">Todos los medios</option>
                        {Object.entries(PAY_LABELS).map(([key, label]) => (
                            <option key={key} value={key}>{label}</option>
                        ))}
                    </select>
                </div>

                {/* Table */}
                {isLoading ? (
                    <div className="flex justify-center py-24">
                        <Loader2 className="animate-spin text-blue-400" size={40} />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-24 text-slate-600 font-semibold">
                        No hay ventas para esta fecha.
                    </div>
                ) : (
                    <div className="space-y-2">
                        {filtered.map(sale => {
                            const voided = sale.status === 'CANCELLED';
                            const isOpen = expanded === sale.id;
                            const isPending = voiding === sale.id;

                            return (
                                <div
                                    key={sale.id}
                                    className={`rounded-2xl border transition-all ${voided ? 'border-rose-500/20 bg-rose-950/10' : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'}`}
                                >
                                    {/* Row */}
                                    <div
                                        className="flex items-center gap-4 p-4 cursor-pointer"
                                        onClick={() => setExpanded(isOpen ? null : sale.id)}
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className={`font-black text-base ${voided ? 'text-slate-500 line-through' : 'text-white'}`}>
                                                    ${fmt(sale.total)}
                                                </span>
                                                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-semibold">
                                                    {PAY_LABELS[sale.payment_method] ?? sale.payment_method}
                                                </span>
                                                {voided && (
                                                    <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 font-bold">
                                                        ANULADA
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3 mt-1 flex-wrap">
                                                <span className="text-slate-500 text-xs">
                                                    {new Date(sale.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                                {sale.customer_name && (
                                                    <span className="text-slate-400 text-xs">{sale.customer_name}</span>
                                                )}
                                                <span className="text-slate-700 text-xs font-mono">{sale.id.slice(0, 8).toUpperCase()}</span>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        {!voided && (
                                            <button
                                                onClick={e => { e.stopPropagation(); handleVoid(sale.id); }}
                                                disabled={isPending}
                                                className="p-2 rounded-lg text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 transition-all disabled:opacity-50"
                                                title="Anular venta"
                                            >
                                                {isPending ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                                            </button>
                                        )}
                                    </div>

                                    {/* Items expand */}
                                    {isOpen && sale.sale_items.length > 0 && (
                                        <div className="px-4 pb-4 border-t border-slate-800 mt-1 pt-3">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="text-slate-500 text-xs">
                                                        <th className="text-left pb-1 font-semibold">Producto</th>
                                                        <th className="text-right pb-1 font-semibold w-12">Cant.</th>
                                                        <th className="text-right pb-1 font-semibold w-24">P.Unit.</th>
                                                        <th className="text-right pb-1 font-semibold w-24">Subtotal</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {sale.sale_items.map((item, i) => (
                                                        <tr key={i} className="text-slate-300">
                                                            <td className="py-0.5">{item.name}</td>
                                                            <td className="text-right">{item.quantity}</td>
                                                            <td className="text-right">${fmt(item.unit_price)}</td>
                                                            <td className="text-right">${fmt(item.subtotal)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
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
