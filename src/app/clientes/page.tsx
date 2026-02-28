'use client';

import { useState, useEffect, useCallback } from 'react';
import { Users, Search, Phone, ShoppingBag, Calendar, CreditCard, Loader2, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';

type Customer = {
    customer_name: string | null;
    customer_phone: string | null;
    total_spent: number;
    visit_count: number;
    last_visit: string;
    last_payment_method: string;
};

const PAYMENT_LABEL: Record<string, string> = {
    cash: 'Efectivo',
    Efectivo: 'Efectivo',
    transfer: 'Transferencia',
    Transferencia: 'Transferencia',
    card: 'Tarjeta',
    Tarjeta: 'Tarjeta',
    qr: 'QR',
    QR: 'QR',
};

const fmt = (n: number) =>
    `$${Number(n).toLocaleString('es-AR', { maximumFractionDigits: 0 })}`;

const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('es-AR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });

export default function ClientesPage() {
    const { storeId } = useAuth();
    const supabase = createClient();

    const [customers, setCustomers] = useState<Customer[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [deletingKey, setDeletingKey] = useState<string | null>(null);

    const fetchCustomers = useCallback(async () => {
        if (!storeId) return;
        setIsLoading(true);

        // Fetch all sales that have at least a phone or a name
        const { data, error } = await supabase
            .from('sales')
            .select('customer_name, customer_phone, total, payment_method, created_at')
            .eq('store_id', storeId)
            .or('customer_phone.not.is.null,customer_name.not.is.null')
            .order('created_at', { ascending: false });

        if (error || !data) {
            setIsLoading(false);
            return;
        }

        // Group by phone (primary key) or name fallback
        const map = new Map<string, Customer>();

        for (const sale of data) {
            const key = sale.customer_phone?.trim() || sale.customer_name?.trim() || '';
            if (!key) continue;

            if (map.has(key)) {
                const existing = map.get(key)!;
                existing.total_spent += Number(sale.total);
                existing.visit_count += 1;
                // Keep the most recent name if any
                if (!existing.customer_name && sale.customer_name) {
                    existing.customer_name = sale.customer_name;
                }
            } else {
                map.set(key, {
                    customer_name: sale.customer_name,
                    customer_phone: sale.customer_phone,
                    total_spent: Number(sale.total),
                    visit_count: 1,
                    last_visit: sale.created_at,
                    last_payment_method: sale.payment_method,
                });
            }
        }

        setCustomers(Array.from(map.values()));
        setIsLoading(false);
    }, [storeId, supabase]);

    useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

    const filtered = customers.filter(c => {
        const q = searchTerm.toLowerCase();
        return (
            c.customer_name?.toLowerCase().includes(q) ||
            c.customer_phone?.includes(q)
        );
    });

    const handleDelete = async (c: Customer) => {
        const label = c.customer_name || c.customer_phone || 'este cliente';
        if (!window.confirm(`¿Eliminar a "${label}" del listado de clientes?\nSus ventas no se borran, solo se desvincula el nombre y teléfono.`)) return;

        const key = c.customer_phone?.trim() || c.customer_name?.trim() || '';
        setDeletingKey(key);

        // Clear customer info from all matching sales (keep the sale records intact)
        let query = supabase
            .from('sales')
            .update({ customer_name: null, customer_phone: null })
            .eq('store_id', storeId!);

        if (c.customer_phone) {
            query = query.eq('customer_phone', c.customer_phone);
        } else if (c.customer_name) {
            query = query.eq('customer_name', c.customer_name).is('customer_phone', null);
        }

        const { error } = await query;

        if (!error) {
            setCustomers(prev => prev.filter(x => {
                const xKey = x.customer_phone?.trim() || x.customer_name?.trim() || '';
                return xKey !== key;
            }));
        }

        setDeletingKey(null);
    };

    return (
        <div className="h-full w-full overflow-y-auto bg-slate-950 font-sans custom-scrollbar">
            <div className="p-8 lg:p-10 pb-32 max-w-[1600px] mx-auto min-h-screen">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
                    <div>
                        <h1 className="text-4xl font-black text-white tracking-tight">Clientes</h1>
                        <p className="text-slate-400 mt-2 font-medium">
                            Historial de clientes registrados en las ventas.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-4 py-2.5 rounded-xl">
                            <Users size={18} className="text-blue-400" />
                            <span className="text-white font-bold">{customers.length}</span>
                            <span className="text-slate-400 text-sm">clientes</span>
                        </div>
                    </div>
                </div>

                {/* Search */}
                <div className="relative mb-8 max-w-md">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar por nombre o teléfono..."
                        className="w-full pl-13 pr-5 py-4 rounded-2xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-lg font-medium transition-all pl-12"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Table */}
                <div className="bg-slate-900/50 backdrop-blur-xl rounded-3xl border border-slate-800 shadow-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-900/80 text-xs uppercase tracking-wider text-slate-500 font-bold border-b border-slate-800">
                                    <th className="py-4 px-6">Cliente</th>
                                    <th className="py-4 px-6">
                                        <div className="flex items-center gap-2">
                                            <Phone size={14} /> Teléfono
                                        </div>
                                    </th>
                                    <th className="py-4 px-6">
                                        <div className="flex items-center gap-2">
                                            <ShoppingBag size={14} /> Compras
                                        </div>
                                    </th>
                                    <th className="py-4 px-6 text-right">
                                        <div className="flex items-center gap-2 justify-end">
                                            Total Gastado
                                        </div>
                                    </th>
                                    <th className="py-4 px-6">
                                        <div className="flex items-center gap-2">
                                            <CreditCard size={14} /> Último Pago
                                        </div>
                                    </th>
                                    <th className="py-4 px-6">
                                        <div className="flex items-center gap-2">
                                            <Calendar size={14} /> Última Visita
                                        </div>
                                    </th>
                                    <th className="py-4 px-6 text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={7} className="py-20 text-center">
                                            <Loader2 className="animate-spin h-8 w-8 mx-auto text-primary" />
                                        </td>
                                    </tr>
                                ) : filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="py-20 text-center">
                                            <div className="flex flex-col items-center gap-3 text-slate-500">
                                                <Users size={48} className="opacity-30" />
                                                <p className="font-semibold text-lg">
                                                    {searchTerm ? 'No se encontraron clientes' : 'Todavía no hay clientes registrados'}
                                                </p>
                                                <p className="text-sm text-slate-600">
                                                    {searchTerm
                                                        ? 'Probá con otro nombre o teléfono'
                                                        : 'Los clientes aparecen cuando se ingresa nombre o teléfono al cobrar'}
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filtered.map((c, i) => {
                                    const displayName = c.customer_name || '—';
                                    const avatarChar = (c.customer_name || c.customer_phone || '?')[0].toUpperCase();
                                    return (
                                        <tr key={i} className="hover:bg-slate-800/40 transition-colors group">
                                            {/* Name + avatar */}
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-black text-base shrink-0">
                                                        {avatarChar}
                                                    </div>
                                                    <span className="font-bold text-slate-200">{displayName}</span>
                                                </div>
                                            </td>
                                            {/* Phone */}
                                            <td className="py-4 px-6">
                                                {c.customer_phone ? (
                                                    <a
                                                        href={`https://wa.me/${c.customer_phone}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="flex items-center gap-2 text-emerald-400 font-semibold hover:text-emerald-300 transition-colors"
                                                    >
                                                        <Phone size={14} />
                                                        {c.customer_phone}
                                                    </a>
                                                ) : (
                                                    <span className="text-slate-600">—</span>
                                                )}
                                            </td>
                                            {/* Visit count */}
                                            <td className="py-4 px-6">
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700">
                                                    <ShoppingBag size={12} />
                                                    {c.visit_count} {c.visit_count === 1 ? 'compra' : 'compras'}
                                                </span>
                                            </td>
                                            {/* Total */}
                                            <td className="py-4 px-6 text-right font-black text-white text-lg">
                                                {fmt(c.total_spent)}
                                            </td>
                                            {/* Payment method */}
                                            <td className="py-4 px-6">
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700">
                                                    <CreditCard size={12} />
                                                    {PAYMENT_LABEL[c.last_payment_method] ?? c.last_payment_method}
                                                </span>
                                            </td>
                                            {/* Last visit */}
                                            <td className="py-4 px-6 text-slate-400 text-sm font-medium">
                                                {formatDate(c.last_visit)}
                                            </td>
                                            {/* Delete */}
                                            <td className="py-4 px-6 text-center">
                                                {(() => {
                                                    const key = c.customer_phone?.trim() || c.customer_name?.trim() || '';
                                                    const isDeleting = deletingKey === key;
                                                    return (
                                                        <button
                                                            onClick={() => handleDelete(c)}
                                                            disabled={isDeleting}
                                                            className="opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
                                                            title="Eliminar cliente"
                                                        >
                                                            {isDeleting
                                                                ? <Loader2 size={16} className="animate-spin" />
                                                                : <Trash2 size={16} />}
                                                        </button>
                                                    );
                                                })()}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
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
