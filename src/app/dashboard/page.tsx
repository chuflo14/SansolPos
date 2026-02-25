'use client';

import { TrendingUp, ShoppingBag, DollarSign, PackageMinus, ArrowUpRight, ArrowDownRight, MoreHorizontal, Calendar } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
    { name: 'Lun', revenue: 150000, profit: 45000 },
    { name: 'Mar', revenue: 230000, profit: 70000 },
    { name: 'Mié', revenue: 180000, profit: 55000 },
    { name: 'Jue', revenue: 290000, profit: 90000 },
    { name: 'Vie', revenue: 350000, profit: 110000 },
    { name: 'Sáb', revenue: 420000, profit: 135000 },
    { name: 'Dom', revenue: 380000, profit: 120000 },
];

const recentSales = [
    { id: 'TRX-1029', time: 'Hace 5 min', items: '2x Leche, 1x Pan Lactal', total: 3350, status: 'Completado' },
    { id: 'TRX-1028', time: 'Hace 12 min', items: '1x Yerba, 2x Azúcar', total: 4900, status: 'Completado' },
    { id: 'TRX-1027', time: 'Hace 28 min', items: '3x Café Instantáneo', total: 13500, status: 'Completado' },
    { id: 'TRX-1026', time: 'Hace 1 hora', items: '5x Leche Descremada', total: 6000, status: 'Completado' },
    { id: 'TRX-1025', time: 'Hace 2 horas', items: '1x Pan, 1x Yerba', total: 4150, status: 'Completado' },
];

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-slate-800 border border-slate-700 p-4 rounded-xl shadow-2xl">
                <p className="text-slate-300 font-bold mb-2">{label}</p>
                {payload.map((entry: any, index: number) => (
                    <p key={`item-${index}`} style={{ color: entry.color }} className="font-semibold text-sm">
                        {entry.name}: ${entry.value.toLocaleString('es-AR')}
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

export default function DashboardPage() {
    return (
        <div className="h-full w-full overflow-y-auto bg-slate-950 font-sans custom-scrollbar">
            <div className="p-8 lg:p-10 pb-32 max-w-[1600px] mx-auto min-h-screen">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
                    <div>
                        <h1 className="text-4xl font-black text-white tracking-tight">Dashboard</h1>
                        <p className="text-slate-400 mt-2 font-medium">Resumen financiero y métricas clave en tiempo real.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button className="flex items-center gap-2 bg-slate-900 border border-slate-800 shadow-sm px-5 py-2.5 rounded-xl text-slate-300 font-semibold hover:bg-slate-800 transition-colors">
                            <Calendar size={18} className="text-slate-400" />
                            Esta Semana
                        </button>
                        <button className="bg-primary hover:bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-primary/20">
                            Generar Reporte
                        </button>
                    </div>
                </div>

                {/* Premium Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-10">
                    <div className="bg-slate-900/50 backdrop-blur-xl p-6 rounded-3xl border border-slate-800 shadow-xl hover:bg-slate-900 transition-colors relative overflow-hidden group">
                        <div className="absolute -right-6 -top-6 w-24 h-24 bg-primary/10 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
                        <div className="flex justify-between items-start mb-4 relative">
                            <div className="w-12 h-12 bg-blue-500/10 text-blue-400 rounded-2xl flex items-center justify-center border border-blue-500/20">
                                <TrendingUp size={24} />
                            </div>
                            <span className="flex items-center gap-1 text-sm font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
                                <ArrowUpRight size={16} /> +14.5%
                            </span>
                        </div>
                        <div className="relative">
                            <p className="text-slate-400 font-semibold text-sm mb-1">Ventas Brutas</p>
                            <h3 className="text-3xl font-black text-white">$2.000.000</h3>
                        </div>
                    </div>

                    <div className="bg-slate-900/50 backdrop-blur-xl p-6 rounded-3xl border border-slate-800 shadow-xl hover:bg-slate-900 transition-colors relative overflow-hidden group">
                        <div className="absolute -right-6 -top-6 w-24 h-24 bg-purple-500/10 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
                        <div className="flex justify-between items-start mb-4 relative">
                            <div className="w-12 h-12 bg-purple-500/10 text-purple-400 rounded-2xl flex items-center justify-center border border-purple-500/20">
                                <DollarSign size={24} />
                            </div>
                            <span className="flex items-center gap-1 text-sm font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
                                <ArrowUpRight size={16} /> +8.2%
                            </span>
                        </div>
                        <div className="relative">
                            <p className="text-slate-400 font-semibold text-sm mb-1">Ganancia Neta</p>
                            <h3 className="text-3xl font-black text-white">$625.000</h3>
                        </div>
                    </div>

                    <div className="bg-slate-900/50 backdrop-blur-xl p-6 rounded-3xl border border-slate-800 shadow-xl hover:bg-slate-900 transition-colors relative overflow-hidden group">
                        <div className="absolute -right-6 -top-6 w-24 h-24 bg-orange-500/10 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
                        <div className="flex justify-between items-start mb-4 relative">
                            <div className="w-12 h-12 bg-orange-500/10 text-orange-400 rounded-2xl flex items-center justify-center border border-orange-500/20">
                                <ShoppingBag size={24} />
                            </div>
                            <span className="flex items-center gap-1 text-sm font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-lg">
                                <ArrowDownRight size={16} /> -2.4%
                            </span>
                        </div>
                        <div className="relative">
                            <p className="text-slate-400 font-semibold text-sm mb-1">Costo de Mercadería</p>
                            <h3 className="text-3xl font-black text-white">$1.150.000</h3>
                        </div>
                    </div>

                    <div className="bg-slate-900/50 backdrop-blur-xl p-6 rounded-3xl border border-slate-800 shadow-xl hover:bg-slate-900 transition-colors relative overflow-hidden group">
                        <div className="absolute -right-6 -top-6 w-24 h-24 bg-rose-500/10 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
                        <div className="flex justify-between items-start mb-4 relative">
                            <div className="w-12 h-12 bg-rose-500/10 text-rose-400 rounded-2xl flex items-center justify-center border border-rose-500/20">
                                <PackageMinus size={24} />
                            </div>
                            <span className="flex items-center gap-1 text-sm font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
                                <ArrowUpRight size={16} /> +1.1%
                            </span>
                        </div>
                        <div className="relative">
                            <p className="text-slate-400 font-semibold text-sm mb-1">Gastos Operativos</p>
                            <h3 className="text-3xl font-black text-white">$225.000</h3>
                        </div>
                    </div>
                </div>

                {/* Charts Section */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-10">
                    <div className="xl:col-span-2 bg-slate-900/50 backdrop-blur-xl rounded-3xl border border-slate-800 shadow-xl p-6 lg:p-8">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h2 className="text-xl font-bold text-white">Evolución de Ingresos</h2>
                                <p className="text-sm font-medium text-slate-400 mt-1">Comparativa de ingresos vs rendimiento neto</p>
                            </div>
                            <button className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
                                <MoreHorizontal size={20} />
                            </button>
                        </div>
                        <div className="h-[350px] w-full mt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 13, fontWeight: 500 }} dy={10} />
                                    <YAxis tickFormatter={(val) => `$${val / 1000}k`} axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 13, fontWeight: 500 }} />
                                    <CartesianGrid vertical={false} stroke="#334155" strokeDasharray="4 4" />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Area type="monotone" dataKey="revenue" name="Ingresos" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                                    <Area type="monotone" dataKey="profit" name="Ganancia" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorProfit)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="bg-slate-900/50 backdrop-blur-xl rounded-3xl border border-slate-800 shadow-xl p-6 lg:p-8 flex flex-col">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h2 className="text-xl font-bold text-white">Top Productos</h2>
                                <p className="text-sm font-medium text-slate-400 mt-1">Por volumen de ventas</p>
                            </div>
                        </div>
                        <div className="flex-1 flex flex-col justify-between">
                            {[
                                { name: 'Leche Descremada', sales: 450, amount: '$540k', trend: 'up', color: 'text-emerald-400' },
                                { name: 'Pan Lactal', sales: 320, amount: '$304k', trend: 'up', color: 'text-emerald-400' },
                                { name: 'Yerba Mate', sales: 210, amount: '$672k', trend: 'up', color: 'text-emerald-400' },
                                { name: 'Café Instantáneo', sales: 95, amount: '$427k', trend: 'down', color: 'text-rose-400' },
                                { name: 'Azúcar Blanca', sales: 40, amount: '$34k', trend: 'down', color: 'text-rose-400' },
                            ].map((prod, i) => (
                                <div key={i} className="flex items-center justify-between py-3 border-b border-slate-800/50 last:border-0 hover:bg-slate-800/50 transition-colors rounded-xl px-2 -mx-2">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-slate-800 font-bold text-slate-400 flex items-center justify-center shrink-0 border border-slate-700">
                                            #{i + 1}
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-200 line-clamp-1">{prod.name}</p>
                                            <p className={`text-xs font-semibold ${prod.color}`}>{prod.sales} uds vendidas</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-white">{prod.amount}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button className="w-full mt-4 py-3 text-sm font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 rounded-xl transition-colors">
                            Ver Inventario Completo
                        </button>
                    </div>
                </div>

                {/* Bottom Section */}
                <div className="bg-slate-900/50 backdrop-blur-xl rounded-3xl border border-slate-800 shadow-xl overflow-hidden">
                    <div className="p-6 lg:p-8 flex items-center justify-between border-b border-slate-800">
                        <div>
                            <h2 className="text-xl font-bold text-white">Transacciones Recientes</h2>
                            <p className="text-sm font-medium text-slate-400 mt-1">Últimos cobros registrados en caja</p>
                        </div>
                        <button className="text-sm font-bold text-blue-400 hover:text-blue-300 transition-colors">
                            Ver todas
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-900/80 text-xs uppercase tracking-wider text-slate-500 font-bold border-b border-slate-800">
                                    <th className="py-4 px-8">ID Transacción</th>
                                    <th className="py-4 px-8">Tiempo</th>
                                    <th className="py-4 px-8">Resumen de Ítems</th>
                                    <th className="py-4 px-8">Estado</th>
                                    <th className="py-4 px-8 text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                                {recentSales.map((sale) => (
                                    <tr key={sale.id} className="hover:bg-slate-800/40 transition-colors group">
                                        <td className="py-4 px-8 font-mono text-sm font-semibold text-slate-400">{sale.id}</td>
                                        <td className="py-4 px-8 text-sm font-medium text-slate-500">{sale.time}</td>
                                        <td className="py-4 px-8 text-sm font-medium text-slate-300">{sale.items}</td>
                                        <td className="py-4 px-8">
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                                {sale.status}
                                            </span>
                                        </td>
                                        <td className="py-4 px-8 text-right font-bold text-white">${sale.total.toLocaleString('es-AR')}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            {/* Inject minimal css for custom-scrollbar so it doesn't look ugly in dark mode */}
            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 8px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: #020617; /* slate-950 */
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #1e293b; /* slate-800 */
                    border-radius: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #334155; /* slate-700 */
                }
            `}</style>
        </div>
    );
}
