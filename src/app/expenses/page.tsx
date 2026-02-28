'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Plus, ReceiptText, Trash2, Loader2, X,
    TrendingDown, Tag, FileText, DollarSign, Settings2
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

type Category = { id: string; name: string };

const DEFAULT_CATEGORIES = [
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

export default function ExpensesPage() {
    const { storeId, user } = useAuth();
    const supabase = createClient();

    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // New expense modal
    const [isExpenseOpen, setIsExpenseOpen] = useState(false);
    const [form, setForm] = useState({ category: '', amount: '', description: '' });
    const [isSaving, setIsSaving] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    // Category management modal
    const [isCatOpen, setIsCatOpen] = useState(false);
    const [newCatName, setNewCatName] = useState('');
    const [isCatSaving, setIsCatSaving] = useState(false);
    const [deletingCatId, setDeletingCatId] = useState<string | null>(null);
    const [catError, setCatError] = useState<string | null>(null);

    /* ── Fetch ─────────────────────────────────────────────────── */
    const fetchCategories = useCallback(async () => {
        if (!storeId) return;
        const { data } = await supabase
            .from('expense_categories')
            .select('id, name')
            .eq('store_id', storeId)
            .order('name');
        if (data && data.length > 0) {
            setCategories(data);
        } else {
            // First time: seed defaults
            setCategories(DEFAULT_CATEGORIES.map(n => ({ id: n, name: n })));
        }
    }, [storeId, supabase]);

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

    useEffect(() => {
        fetchCategories();
        fetchExpenses();
    }, [fetchCategories, fetchExpenses]);

    /* ── KPIs ──────────────────────────────────────────────────── */
    const totalMonth = expenses
        .filter(e => {
            const d = new Date(e.created_at), now = new Date();
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        })
        .reduce((acc, e) => acc + Number(e.amount), 0);

    const totalAll = expenses.reduce((acc, e) => acc + Number(e.amount), 0);

    /* ── New Expense ───────────────────────────────────────────── */
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
            setFormError('No se pudo guardar el gasto.');
        } else {
            setExpenses(prev => [data, ...prev]);
            setIsExpenseOpen(false);
            setForm({ category: '', amount: '', description: '' });
        }
        setIsSaving(false);
    };

    const handleDeleteExpense = async (id: string) => {
        if (!window.confirm('¿Eliminar este gasto?')) return;
        setDeletingId(id);
        const { error } = await supabase.from('expenses').delete().eq('id', id).eq('store_id', storeId!);
        if (!error) setExpenses(prev => prev.filter(e => e.id !== id));
        setDeletingId(null);
    };

    /* ── Category Management ───────────────────────────────────── */
    const openCatModal = async () => {
        // If categories are still defaults (no id from db), seed them now
        const hasRealIds = categories.some(c => c.id.length === 36); // UUID length
        if (!hasRealIds && storeId) {
            setIsCatSaving(true);
            const rows = DEFAULT_CATEGORIES.map(name => ({ store_id: storeId, name }));
            const { data } = await supabase
                .from('expense_categories')
                .upsert(rows, { onConflict: 'store_id,name' })
                .select('id, name');
            if (data) setCategories(data);
            setIsCatSaving(false);
        }
        setCatError(null);
        setNewCatName('');
        setIsCatOpen(true);
    };

    const handleAddCategory = async () => {
        const name = newCatName.trim();
        if (!name) return;
        if (categories.some(c => c.name.toLowerCase() === name.toLowerCase())) {
            setCatError('Ya existe esa categoría.');
            return;
        }
        setIsCatSaving(true);
        setCatError(null);

        const { data, error } = await supabase
            .from('expense_categories')
            .insert({ store_id: storeId, name })
            .select('id, name')
            .single();

        if (error) {
            setCatError('No se pudo agregar la categoría.');
        } else {
            setCategories(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
            setNewCatName('');
        }
        setIsCatSaving(false);
    };

    const handleDeleteCategory = async (cat: Category) => {
        if (!window.confirm(`¿Eliminar la categoría "${cat.name}"?`)) return;
        setDeletingCatId(cat.id);

        const { error } = await supabase
            .from('expense_categories')
            .delete()
            .eq('id', cat.id);

        if (!error) setCategories(prev => prev.filter(c => c.id !== cat.id));
        setDeletingCatId(null);
    };

    /* ── Render ────────────────────────────────────────────────── */
    const catNames = categories.map(c => c.name);

    return (
        <div className="h-full w-full overflow-y-auto bg-slate-950 font-sans custom-scrollbar">
            <div className="p-8 lg:p-10 pb-32 max-w-[1600px] mx-auto min-h-screen">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
                    <div>
                        <h1 className="text-4xl font-black text-white tracking-tight">Gastos</h1>
                        <p className="text-slate-400 mt-2 font-medium">Registro de salidas de caja chica.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={openCatModal}
                            className="flex items-center gap-2 px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold rounded-xl transition-all border border-slate-700"
                        >
                            <Settings2 size={17} />
                            Categorías
                        </button>
                        <button
                            onClick={() => { setForm({ category: '', amount: '', description: '' }); setFormError(null); setIsExpenseOpen(true); }}
                            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 hover:-translate-y-0.5 border border-blue-500"
                        >
                            <Plus size={18} />
                            Nuevo Gasto
                        </button>
                    </div>
                </div>

                {/* KPIs */}
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
                                    <tr><td colSpan={5} className="py-20 text-center">
                                        <Loader2 className="animate-spin h-8 w-8 mx-auto text-blue-400" />
                                    </td></tr>
                                ) : expenses.length === 0 ? (
                                    <tr><td colSpan={5} className="py-20 text-center">
                                        <div className="flex flex-col items-center gap-3 text-slate-500">
                                            <ReceiptText size={48} className="opacity-30" />
                                            <p className="font-semibold text-lg">No hay gastos registrados</p>
                                            <p className="text-sm text-slate-600">Hacé clic en "Nuevo Gasto" para empezar.</p>
                                        </div>
                                    </td></tr>
                                ) : expenses.map(e => (
                                    <tr key={e.id} className="hover:bg-slate-800/40 transition-colors group">
                                        <td className="py-4 px-6 text-slate-400 text-sm font-semibold whitespace-nowrap">
                                            {formatDate(e.created_at)}
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className="inline-flex items-center gap-1.5 bg-slate-800 text-slate-300 border border-slate-700 px-3 py-1 rounded-lg text-xs font-semibold">
                                                <Tag size={11} />{e.category}
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
                                                onClick={() => handleDeleteExpense(e.id)}
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

            {/* ── New Expense Modal ─────────────────────────────────── */}
            {isExpenseOpen && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                            <h2 className="text-xl font-black text-white">Nuevo Gasto</h2>
                            <button onClick={() => setIsExpenseOpen(false)} className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-5">
                            {/* Category picker */}
                            <div>
                                <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                    <Tag size={13} /> Categoría *
                                </label>
                                {catNames.length === 0 ? (
                                    <p className="text-slate-500 text-sm">No hay categorías. Agregá una en "Categorías".</p>
                                ) : (
                                    <div className="grid grid-cols-3 gap-2">
                                        {catNames.map(cat => (
                                            <button
                                                key={cat}
                                                onClick={() => setForm(f => ({ ...f, category: cat }))}
                                                className={`py-2 px-3 rounded-xl text-sm font-bold border-2 transition-all ${form.category === cat
                                                    ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                                                    : 'border-slate-700 bg-slate-900/50 text-slate-400 hover:border-slate-600 hover:text-white'}`}
                                            >
                                                {cat}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            {/* Amount */}
                            <div>
                                <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                    <DollarSign size={13} /> Monto *
                                </label>
                                <input
                                    type="number" inputMode="decimal" placeholder="0" min="0"
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
                                    type="text" placeholder="Ej: Pago adelanto turno mañana"
                                    className="w-full p-4 bg-slate-900/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none text-white font-medium placeholder-slate-600 transition-all"
                                    value={form.description}
                                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                    onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
                                />
                            </div>
                            {formError && (
                                <p className="text-rose-400 text-sm font-semibold bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl">{formError}</p>
                            )}
                        </div>
                        <div className="p-6 border-t border-slate-800 flex gap-3">
                            <button onClick={() => setIsExpenseOpen(false)} className="flex-1 py-3 font-bold text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors">
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

            {/* ── Category Management Modal ─────────────────────────── */}
            {isCatOpen && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                            <h2 className="text-xl font-black text-white">Categorías de Gastos</h2>
                            <button onClick={() => setIsCatOpen(false)} className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-4 space-y-2 max-h-72 overflow-y-auto custom-scrollbar">
                            {categories.length === 0 && (
                                <p className="text-slate-500 text-sm text-center py-4">Sin categorías. Agregá una abajo.</p>
                            )}
                            {categories.map(cat => (
                                <div key={cat.id} className="flex items-center justify-between gap-3 px-4 py-3 bg-slate-800/60 border border-slate-700/50 rounded-xl group">
                                    <span className="text-slate-200 font-semibold">{cat.name}</span>
                                    <button
                                        onClick={() => handleDeleteCategory(cat)}
                                        disabled={deletingCatId === cat.id}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500 hover:text-white disabled:opacity-40"
                                        title="Eliminar categoría"
                                    >
                                        {deletingCatId === cat.id
                                            ? <Loader2 size={14} className="animate-spin" />
                                            : <Trash2 size={14} />}
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* Add new category */}
                        <div className="p-4 border-t border-slate-800">
                            {catError && (
                                <p className="text-rose-400 text-xs font-semibold mb-2">{catError}</p>
                            )}
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Nueva categoría..."
                                    className="flex-1 px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none text-white font-medium placeholder-slate-600 transition-all text-sm"
                                    value={newCatName}
                                    onChange={e => { setNewCatName(e.target.value); setCatError(null); }}
                                    onKeyDown={e => { if (e.key === 'Enter') handleAddCategory(); }}
                                />
                                <button
                                    onClick={handleAddCategory}
                                    disabled={isCatSaving || !newCatName.trim()}
                                    className="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all border border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isCatSaving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                                </button>
                            </div>
                        </div>

                        <div className="p-4 pt-0">
                            <button
                                onClick={() => setIsCatOpen(false)}
                                className="w-full py-3 font-bold text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
                            >
                                Listo
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
