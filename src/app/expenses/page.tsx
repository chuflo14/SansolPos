'use client';

import { useState } from 'react';
import { Plus, ReceiptText } from 'lucide-react';

const MOCK_EXPENSES = [
    { id: '1', category: 'Sueldos', amount: 80000, desc: 'Adelanto Turno Mañana', date: '2026-02-24T10:00:00Z' },
    { id: '2', category: 'Limpieza', amount: 4500, desc: 'Artículos vario', date: '2026-02-23T15:30:00Z' },
];

export default function ExpensesPage() {
    return (
        <div className="h-full w-full overflow-y-auto bg-slate-950 font-sans custom-scrollbar">
            <div className="p-8 lg:p-10 pb-32 max-w-[1600px] mx-auto min-h-screen">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
                    <div>
                        <h1 className="text-4xl font-black text-white tracking-tight">Gastos</h1>
                        <p className="text-slate-400 mt-2 font-medium">Registro de salidas de caja chica.</p>
                    </div>
                    <button className="flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-blue-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-primary/20">
                        <Plus size={18} />
                        Nuevo Gasto
                    </button>
                </div>

                <div className="bg-slate-900/50 backdrop-blur-xl rounded-3xl border border-slate-800 shadow-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-900/80 text-xs uppercase tracking-wider text-slate-500 font-bold border-b border-slate-800">
                                    <th className="py-4 px-8">Fecha</th>
                                    <th className="py-4 px-8">Categoría</th>
                                    <th className="py-4 px-8">Descripción</th>
                                    <th className="py-4 px-8 text-right">Monto</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                                {MOCK_EXPENSES.map((expense) => (
                                    <tr key={expense.id} className="hover:bg-slate-800/40 transition-colors group">
                                        <td className="py-4 px-8 text-slate-400 text-sm font-semibold">
                                            {new Date(expense.date).toLocaleDateString('es-AR')}
                                        </td>
                                        <td className="py-4 px-8">
                                            <span className="bg-slate-800 text-slate-300 border border-slate-700 px-3 py-1 rounded-lg text-xs font-semibold">{expense.category}</span>
                                        </td>
                                        <td className="py-4 px-8 text-slate-300 font-medium">{expense.desc}</td>
                                        <td className="py-4 px-8 text-right font-bold text-rose-400">
                                            -${expense.amount.toLocaleString('es-AR')}
                                        </td>
                                    </tr>
                                ))}
                                {MOCK_EXPENSES.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="py-16 text-center text-slate-500 font-medium">
                                            No hay gastos registrados.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 8px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #1e293b;
                    border-radius: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #334155;
                }
            `}</style>
        </div>
    );
}
