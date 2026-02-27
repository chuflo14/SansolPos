'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    TrendingUp, ShoppingBag, DollarSign, PackageMinus,
    ArrowUpRight, ArrowDownRight, MoreHorizontal, RefreshCw, ShoppingCart
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';

type DayRevenue = { name: string; revenue: number };
type TopProduct = { name: string; units: number; total: number };
type RecentSale = {
    id: string;
    created_at: string;
    total: number;
    payment_method: string;
    customer_phone: string | null;
    sale_items: { name: string; quantity: number }[];
};

const PAYMENT_LABEL: Record<string, string> = {
    cash: 'Efectivo',
    transfer: 'Transferencia',
    card: 'Tarjeta',
    qr: 'QR',
};

const fmt = (n: number) => `$${n.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`;
const timeAgo = (iso: string) => {
    const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 1) return 'Ahora';
    if (mins < 60) return `Hace ${mins} min`;
    if (mins < 1440) return `Hace ${Math.floor(mins / 60)}h`;
    return new Date(iso).toLocaleDateString('es-AR');
};

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload?.length) {
        return (
            <div className="bg-slate-800 border border-slate-700 p-4 rounded-xl shadow-2xl">
                <p className="text-slate-300 font-bold mb-2">{label}</p>
                {payload.map((entry: any, i: number) => (
                    <p key={i} style={{ color: entry.color }} className="font-semibold text-sm">
                        {entry.name}: {fmt(entry.value)}
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

export default function DashboardPage() {
    const { storeId } = useAuth();
    const supabase = createClient();

    const [loading, setLoading] = useState(true);
    const [todayTotal, setTodayTotal] = useState(0);
    const [todayCount, setTodayCount] = useState(0);
    const [weekRevenue, setWeekRevenue] = useState<DayRevenue[]>([]);
    const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
    const [recentSales, setRecentSales] = useState<RecentSale[]>([]);
    const [lowStockCount, setLowStockCount] = useState(0);

    const fetchDashboard = useCallback(async () => {
        if (!storeId) return;
        setLoading(true);

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        // All queries in parallel
        const [
            todaySalesRes,
            weekSalesRes,
            recentSalesRes,
            lowStockRes,
        ] = await Promise.all([
            // Today's sales
            supabase
                .from('sales')
                .select('total')
                .eq('store_id', storeId)
                .gte('created_at', todayStart.toISOString()),
            // Last 7 days sales for chart
            supabase
                .from('sales')
                .select('total, created_at')
                .eq('store_id', storeId)
                .gte('created_at', sevenDaysAgo.toISOString())
                .order('created_at'),
            // Recent sales with items
            supabase
                .from('sales')
                .select('id, created_at, total, payment_method, customer_phone, sale_items(name, quantity)')
                .eq('store_id', storeId)
                .order('created_at', { ascending: false })
                .limit(8),
            // Low stock products
            supabase
                .rpc('count_low_stock', { p_store_id: storeId })
                .maybeSingle(),
        ]);

        // Today KPIs
        const todaySales = todaySalesRes.data ?? [];
        setTodayTotal(todaySales.reduce((acc, s) => acc + Number(s.total), 0));
        setTodayCount(todaySales.length);

        // Week chart — group by day label
        const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        const buckets: Record<string, number> = {};
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            buckets[dayNames[d.getDay()]] = 0;
        }
        for (const s of weekSalesRes.data ?? []) {
            const label = dayNames[new Date(s.created_at).getDay()];
            buckets[label] = (buckets[label] ?? 0) + Number(s.total);
        }
        setWeekRevenue(Object.entries(buckets).map(([name, revenue]) => ({ name, revenue })));

        // Recent sales
        setRecentSales((recentSalesRes.data ?? []) as RecentSale[]);

        // Low stock count (handle if RPC not available)
        const lsVal = lowStockRes.data as any;
        setLowStockCount(typeof lsVal === 'number' ? lsVal : 0);

        // Top products — compute from recent week sale_items
        const productMap: Record<string, { units: number; total: number }> = {};
        for (const sale of recentSalesRes.data ?? []) {
            for (const item of (sale as any).sale_items ?? []) {
                if (!productMap[item.name]) productMap[item.name] = { units: 0, total: 0 };
                productMap[item.name].units += item.quantity;
                productMap[item.name].total += Number((sale as any).total ?? 0);
            }
        }
        const sorted = Object.entries(productMap)
            .sort((a, b) => b[1].units - a[1].units)
            .slice(0, 5)
            .map(([name, v]) => ({ name, ...v }));
        setTopProducts(sorted);

        setLoading(false);
    }, [storeId, supabase]);

    useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

    return (
        <div className="h-full w-full overflow-y-auto bg-slate-950 font-sans custom-scrollbar">
            <div className="p-8 lg:p-10 pb-32 max-w-[1600px] mx-auto min-h-screen">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
                    <div>
                        <h1 className="text-4xl font-black text-white tracking-tight">Dashboard</h1>
                        <p className="text-slate-400 mt-2 font-medium">Resumen financiero y métricas en tiempo real.</p>
                    </div>
                    <button
                        onClick={fetchDashboard}
                        disabled={loading}
                        className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-5 py-2.5 rounded-xl text-slate-300 font-semibold hover:bg-slate-800 transition-colors disabled:opacity-50"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        {loading ? 'Cargando...' : 'Actualizar'}
                    </button>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-10">
                    <KpiCard
                        icon={<TrendingUp size={24} />}
                        iconClass="bg-blue-500/10 text-blue-400 border-blue-500/20"
                        glowClass="bg-primary/10"
                        label="Ventas Hoy"
                        value={loading ? '—' : fmt(todayTotal)}
                        badge={`${todayCount} transac.`}
                        badgeClass="text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                    />
                    <KpiCard
                        icon={<ShoppingCart size={24} />}
                        iconClass="bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        glowClass="bg-emerald-500/10"
                        label="Ticket Promedio Hoy"
                        value={loading ? '—' : (todayCount > 0 ? fmt(todayTotal / todayCount) : '$0')}
                        badge="Promedio"
                        badgeClass="text-slate-400 bg-slate-500/10 border-slate-500/20"
                    />
                    <KpiCard
                        icon={<ShoppingBag size={24} />}
                        iconClass="bg-orange-500/10 text-orange-400 border-orange-500/20"
                        glowClass="bg-orange-500/10"
                        label="Ventas Esta Semana"
                        value={loading ? '—' : fmt(weekRevenue.reduce((a, d) => a + d.revenue, 0))}
                        badge={`últimos 7 días`}
                        badgeClass="text-slate-400 bg-slate-500/10 border-slate-500/20"
                    />
                    <KpiCard
                        icon={<PackageMinus size={24} />}
                        iconClass="bg-rose-500/10 text-rose-400 border-rose-500/20"
                        glowClass="bg-rose-500/10"
                        label="Productos Bajo Stock"
                        value={loading ? '—' : String(lowStockCount)}
                        badge={lowStockCount > 0 ? 'Atención' : 'OK'}
                        badgeClass={lowStockCount > 0
                            ? 'text-rose-400 bg-rose-500/10 border-rose-500/20'
                            : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                        }
                    />
                </div>

                {/* Chart + Top Productos */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-10">
                    <div className="xl:col-span-2 bg-slate-900/50 backdrop-blur-xl rounded-3xl border border-slate-800 shadow-xl p-6 lg:p-8">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h2 className="text-xl font-bold text-white">Evolución de Ventas</h2>
                                <p className="text-sm font-medium text-slate-400 mt-1">Últimos 7 días</p>
                            </div>
                            <button className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
                                <MoreHorizontal size={20} />
                            </button>
                        </div>
                        <div className="h-[320px] w-full">
                            {loading ? (
                                <div className="h-full flex items-center justify-center text-slate-600">
                                    <RefreshCw size={32} className="animate-spin" />
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={weekRevenue} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 13, fontWeight: 500 }} dy={10} />
                                        <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 13, fontWeight: 500 }} />
                                        <CartesianGrid vertical={false} stroke="#334155" strokeDasharray="4 4" />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Area type="monotone" dataKey="revenue" name="Ventas" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>

                    <div className="bg-slate-900/50 backdrop-blur-xl rounded-3xl border border-slate-800 shadow-xl p-6 lg:p-8 flex flex-col">
                        <div className="mb-6">
                            <h2 className="text-xl font-bold text-white">Top Productos</h2>
                            <p className="text-sm font-medium text-slate-400 mt-1">Por unidades vendidas (semana)</p>
                        </div>
                        {loading ? (
                            <div className="flex-1 flex items-center justify-center text-slate-600">
                                <RefreshCw size={28} className="animate-spin" />
                            </div>
                        ) : topProducts.length === 0 ? (
                            <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
                                Sin ventas recientes registradas.
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col justify-between">
                                {topProducts.map((prod, i) => (
                                    <div key={i} className="flex items-center justify-between py-3 border-b border-slate-800/50 last:border-0 hover:bg-slate-800/50 transition-colors rounded-xl px-2 -mx-2">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-slate-800 font-bold text-slate-400 flex items-center justify-center shrink-0 border border-slate-700">
                                                #{i + 1}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-200 line-clamp-1 text-sm">{prod.name}</p>
                                                <p className="text-xs font-semibold text-emerald-400">{prod.units} uds vendidas</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Transacciones Recientes */}
                <div className="bg-slate-900/50 backdrop-blur-xl rounded-3xl border border-slate-800 shadow-xl overflow-hidden">
                    <div className="p-6 lg:p-8 flex items-center justify-between border-b border-slate-800">
                        <div>
                            <h2 className="text-xl font-bold text-white">Transacciones Recientes</h2>
                            <p className="text-sm font-medium text-slate-400 mt-1">Últimas ventas registradas en caja</p>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-900/80 text-xs uppercase tracking-wider text-slate-500 font-bold border-b border-slate-800">
                                    <th className="py-4 px-8">ID</th>
                                    <th className="py-4 px-8">Tiempo</th>
                                    <th className="py-4 px-8">Ítems</th>
                                    <th className="py-4 px-8">Pago</th>
                                    <th className="py-4 px-8 text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="py-16 text-center text-slate-600">
                                            <RefreshCw className="animate-spin h-8 w-8 mx-auto" />
                                        </td>
                                    </tr>
                                ) : recentSales.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-16 text-center text-slate-500 font-medium">
                                            No hay ventas registradas aún.
                                        </td>
                                    </tr>
                                ) : recentSales.map((sale) => {
                                    const summary = sale.sale_items
                                        .slice(0, 3)
                                        .map(i => `${i.quantity}x ${i.name}`)
                                        .join(', ');
                                    const extra = sale.sale_items.length > 3 ? ` +${sale.sale_items.length - 3} más` : '';
                                    return (
                                        <tr key={sale.id} className="hover:bg-slate-800/40 transition-colors group">
                                            <td className="py-4 px-8 font-mono text-sm font-semibold text-slate-400">
                                                #{sale.id.split('-')[0].toUpperCase()}
                                            </td>
                                            <td className="py-4 px-8 text-sm font-medium text-slate-500">{timeAgo(sale.created_at)}</td>
                                            <td className="py-4 px-8 text-sm font-medium text-slate-300 max-w-xs truncate">
                                                {summary}{extra || ''}
                                            </td>
                                            <td className="py-4 px-8">
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700">
                                                    {PAYMENT_LABEL[sale.payment_method] ?? sale.payment_method}
                                                </span>
                                            </td>
                                            <td className="py-4 px-8 text-right font-bold text-white">{fmt(Number(sale.total))}</td>
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

function KpiCard({ icon, iconClass, glowClass, label, value, badge, badgeClass }: {
    icon: React.ReactNode;
    iconClass: string;
    glowClass: string;
    label: string;
    value: string;
    badge: string;
    badgeClass: string;
}) {
    return (
        <div className="bg-slate-900/50 backdrop-blur-xl p-6 rounded-3xl border border-slate-800 shadow-xl hover:bg-slate-900 transition-colors relative overflow-hidden group">
            <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full group-hover:scale-150 transition-transform duration-500 ${glowClass}`} />
            <div className="flex justify-between items-start mb-4 relative">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${iconClass}`}>
                    {icon}
                </div>
                <span className={`flex items-center gap-1 text-xs font-bold border px-2.5 py-1 rounded-lg ${badgeClass}`}>
                    {badge}
                </span>
            </div>
            <div className="relative">
                <p className="text-slate-400 font-semibold text-sm mb-1">{label}</p>
                <h3 className="text-3xl font-black text-white">{value}</h3>
            </div>
        </div>
    );
}
