'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Plus, ReceiptText, Trash2, Loader2, X,
    TrendingDown, Tag, FileText, DollarSign
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';

type Expense = {
    id: string;
    category: string;
    amount: number;
    description: string | null;
    created_at: string;
};

const CATEGORIES = [
    'Sueldos', 'Alquiler', 'Servicios', 'Proveedores',
    'Limpieza', 'Mantenimiento', 'Marketing', 'Traslados', 'Otros',
];

const fmt = (n: number) =>
    `$${Number(n).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('es-AR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });

type FormState = { category: string; amount: string; description: string };
const EMPTY_FORM: FormState = { category: '', amount: '', description: '' };

export default function ExpensesPage() {
    const { storeId, user } = useAuth();
    const supabase = createClient();

    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [form, setForm] = useState<FormState>(EMPTY_FORM);
    const [isSaving, setIsSaving] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    const fetchExpenses = useCallback(async () => {
        if (!storeId) return;
        setIsLoading(true);
        const { data, error } = await supabase
            .from('expenses')
            .select('id, category, amount, description, created_at')
            .eq('store_id', storeId)
            .order('created_at', { ascending: false });

        if (!error && data) setExpenses(data);
        setIsLoading(false);
    }, [storeId, supabase]);

    useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

    // Totals
    const totalMonth = expenses
        .filter(e => {
            const d = new Date(e.created_at);
            const now = new Date();
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        })
        .reduce((acc, e) => acc + Number(e.amount), 0);

    const totalAll = expenses.reduce((acc, e) => acc + Number(e.amount), 0);

    const handleSave = async () => {
        if (!form.category) { setFormError('Seleccioná una categoría.'); return; }
        const amount = parseFloat(form.amount.replace(',', '.'));
        if (!amount || amount <= 0) { setFormError('Ingresá un monto válido.'); return; }

        setIsSaving(true);
        setFormError(null);

        const { data, error } = await supabase
            .from('expenses')
            .insert({
                store_id: storeId,
                cashier_id: user?.id,
                category: form.category,
                amount,
                description: form.description.trim() || null,
            })
            .select()
            .single();

        if (error) {
            setFormError('No se pudo guardar el gasto. Intenta nuevamente.');
        } else {
            setExpenses(prev => [data, ...prev]);
            setIsModalOpen(false);
            setForm(EMPTY_FORM);
        }

        setIsSaving(false);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('¿Eliminar este gasto? Esta acción no se puede deshacer.')) return;
        setDeletingId(id);
        const { error } = await supabase.from('expenses').delete().eq('id', id).eq('store_id', storeId!);
        if (!error) setExpenses(prev => prev.filter(e => e.id !== id));
        setDeletingId(null);
    };

    return (
        <div className="h-full w-full overflow-y-auto bg-slate-950 font-sans custom-scrollbar">
            <div className="p-8 lg:p-10 pb-32 max-w-[1600px] mx-auto min-h-screen">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
                    <div>
                        <h1 className="text-4xl font-black text-white tracking-tight">Gastos</h1>
                        <p className="text-slate-400 mt-2 font-medium">Registro de salidas de caja chica.</p>
                    </div>
                    <button
                        onClick={() => { setForm(EMPTY_FORM); setFormError(null); setIsModalOpen(true); }}
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 hover:-translate-y-0.5 border border-blue-500"
                    >
                        <Plus size={18} />
                        Nuevo Gasto
                    </button>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
                    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
                            <TrendingDown size={22} className="text-rose-400" />
                        </div>
                        <div>
                            <p className="text-slate-400 text-sm font-medium">Este Mes</p>
                            <p className="text-2xl font-black text-rose-400">{fmt(totalMonth)}</p>
                        </div>
                    </div>
                    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-slate-700/50 border border-slate-700 flex items-center justify-center shrink-0">
                            <ReceiptText size={22} className="text-slate-400" />
                        </div>
                        <div>
                            <p className="text-slate-400 text-sm font-medium">Total Histórico</p>
                            <p className="text-2xl font-black text-white">{fmt(totalAll)}</p>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-slate-900/50 backdrop-blur-xl rounded-3xl border border-slate-800 shadow-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-900/80 text-xs uppercase tracking-wider text-slate-500 font-bold border-b border-slate-800">
                                    <th className="py-4 px-6">Fecha</th>
                                    <th className="py-4 px-6">Categoría</th>
                                    <th className="py-4 px-6">Descripción</th>
                                    <th className="py-4 px-6 text-right">Monto</th>
                                    <th className="py-4 px-6 text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={5} className="py-20 text-center">
                                            <Loader2 className="animate-spin h-8 w-8 mx-auto text-blue-400" />
                                        </td>
                                    </tr>
                                ) : expenses.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-20 text-center">
                                            <div className="flex flex-col items-center gap-3 text-slate-500">
                                                <ReceiptText size={48} className="opacity-30" />
                                                <p className="font-semibold text-lg">No hay gastos registrados</p>
                                                <p className="text-sm text-slate-600">Hacé clic en "Nuevo Gasto" para empezar.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : expenses.map(e => (
                                    <tr key={e.id} className="hover:bg-slate-800/40 transition-colors group">
                                        <td className="py-4 px-6 text-slate-400 text-sm font-semibold whitespace-nowrap">
                                            {formatDate(e.created_at)}
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className="inline-flex items-center gap-1.5 bg-slate-800 text-slate-300 border border-slate-700 px-3 py-1 rounded-lg text-xs font-semibold">
                                                <Tag size={11} />
                                                {e.category}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 text-slate-300 font-medium">
                                            {e.description || <span className="text-slate-600">—</span>}
                                        </td>
                                        <td className="py-4 px-6 text-right font-black text-rose-400 text-lg whitespace-nowrap">
                                            -{fmt(e.amount)}
                                        </td>
                                        <td className="py-4 px-6 text-center">
                                            <button
                                                onClick={() => handleDelete(e.id)}
                                                disabled={deletingId === e.id}
                                                className="opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
                                                title="Eliminar gasto"
                                            >
                                                {deletingId === e.id
                                                    ? <Loader2 size={16} className="animate-spin" />
                                                    : <Trash2 size={16} />}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* New Expense Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                            <h2 className="text-xl font-black text-white">Nuevo Gasto</h2>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-full transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-5">
                            {/* Category */}
                            <div>
                                <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                    <Tag size={13} /> Categoría *
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    {CATEGORIES.map(cat => (
                                        <button
                                            key={cat}
                                            onClick={() => setForm(f => ({ ...f, category: cat }))}
                                            className={`py-2 px-3 rounded-xl text-sm font-bold border-2 transition-all ${form.category === cat
                                                ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                                                : 'border-slate-700 bg-slate-900/50 text-slate-400 hover:border-slate-600 hover:text-white'
                                                }`}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Amount */}
                            <div>
                                <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                    <DollarSign size={13} /> Monto *
                                </label>
                                <input
                                    type="number"
                                    inputMode="decimal"
                                    placeholder="0"
                                    min="0"
                                    className="w-full p-4 bg-slate-900/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none text-white font-bold text-xl placeholder-slate-600 transition-all"
                                    value={form.amount}
                                    onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                    <FileText size={13} /> Descripción (opcional)
                                </label>
                                <input
                                    type="text"
                                    placeholder="Ej: Pago adelanto turno mañana"
                                    className="w-full p-4 bg-slate-900/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none text-white font-medium placeholder-slate-600 transition-all"
                                    value={form.description}
                                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                    onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
                                />
                            </div>

                            {formError && (
                                <p className="text-rose-400 text-sm font-semibold bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl">
                                    {formError}
                                </p>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 border-t border-slate-800 flex gap-3">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="flex-1 py-3 font-bold text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving || !form.category || !form.amount}
                                className="flex-1 py-3 font-black text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-all border border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                                {isSaving ? 'Guardando...' : 'Guardar Gasto'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar { width: 8px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: #020617; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #334155; }
            `}</style>
        </div>
    );
}
