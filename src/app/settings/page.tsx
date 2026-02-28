'use client';

import { useState, useEffect, useCallback } from 'react';
import { Save, Loader2, CheckCircle, Building2, FileText } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';

type Settings = {
    receipt_business_name: string;
    receipt_cuit: string;
    receipt_address: string;
    receipt_legal_footer: string;
};

const EMPTY: Settings = {
    receipt_business_name: '',
    receipt_cuit: '',
    receipt_address: '',
    receipt_legal_footer: '',
};

const INPUT = `w-full p-4 bg-slate-900/50 border border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none text-white font-medium transition-all shadow-inner placeholder-slate-600`;

export default function SettingsPage() {
    const { storeId } = useAuth();
    const supabase = createClient();

    const [form, setForm] = useState<Settings>(EMPTY);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchSettings = useCallback(async () => {
        if (!storeId) return;
        setIsLoading(true);
        const { data } = await supabase
            .from('store_settings')
            .select('receipt_business_name, receipt_cuit, receipt_address, receipt_legal_footer')
            .eq('store_id', storeId)
            .maybeSingle();

        if (data) {
            setForm({
                receipt_business_name: data.receipt_business_name ?? '',
                receipt_cuit: data.receipt_cuit ?? '',
                receipt_address: data.receipt_address ?? '',
                receipt_legal_footer: data.receipt_legal_footer ?? '',
            });
        }
        setIsLoading(false);
    }, [storeId, supabase]);

    useEffect(() => { fetchSettings(); }, [fetchSettings]);

    const set = (key: keyof Settings) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setForm(f => ({ ...f, [key]: e.target.value }));

    const handleSave = async () => {
        if (!storeId) return;
        setIsSaving(true);
        setError(null);
        setSaved(false);

        const { error: err } = await supabase
            .from('store_settings')
            .upsert({
                store_id: storeId,
                receipt_business_name: form.receipt_business_name.trim() || null,
                receipt_cuit: form.receipt_cuit.trim() || null,
                receipt_address: form.receipt_address.trim() || null,
                receipt_legal_footer: form.receipt_legal_footer.trim() || null,
            }, { onConflict: 'store_id' });

        if (err) {
            setError('No se pudieron guardar los cambios. Intenta nuevamente.');
        } else {
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        }
        setIsSaving(false);
    };

    return (
        <div className="h-full w-full overflow-y-auto bg-slate-950 font-sans custom-scrollbar">
            <div className="p-8 lg:p-10 pb-32 max-w-3xl mx-auto min-h-screen">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
                    <div>
                        <h1 className="text-4xl font-black text-white tracking-tight">Configuración</h1>
                        <p className="text-slate-400 mt-2 font-medium">Datos de la tienda que aparecen en los comprobantes.</p>
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={isSaving || isLoading}
                        className="flex items-center gap-2 px-6 py-3 font-black text-white rounded-xl transition-all border shadow-lg disabled:opacity-50 disabled:cursor-not-allowed min-w-[160px] justify-center
                            bg-blue-600 hover:bg-blue-500 border-blue-500 hover:shadow-blue-500/30 hover:-translate-y-0.5"
                    >
                        {isSaving
                            ? <><Loader2 size={18} className="animate-spin" /> Guardando...</>
                            : saved
                                ? <><CheckCircle size={18} className="text-emerald-300" /> Guardado</>
                                : <><Save size={18} /> Guardar Cambios</>}
                    </button>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 font-semibold rounded-xl">
                        {error}
                    </div>
                )}

                {isLoading ? (
                    <div className="flex items-center justify-center py-32">
                        <Loader2 className="animate-spin text-blue-400" size={40} />
                    </div>
                ) : (
                    <div className="space-y-8">
                        {/* Section: Store Info */}
                        <div className="bg-slate-900/50 backdrop-blur-xl rounded-3xl border border-slate-800 shadow-xl overflow-hidden">
                            <div className="p-6 border-b border-slate-800 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                                    <Building2 size={20} className="text-blue-400" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-white">Datos Fiscales</h2>
                                    <p className="text-slate-400 text-sm">Se imprimen en la cabecera del comprobante.</p>
                                </div>
                            </div>
                            <div className="p-6 lg:p-8 space-y-5">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-300 mb-2">Nombre Comercial</label>
                                        <input
                                            type="text"
                                            placeholder="Ej: SANSOL"
                                            className={INPUT}
                                            value={form.receipt_business_name}
                                            onChange={set('receipt_business_name')}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-300 mb-2">CUIT</label>
                                        <input
                                            type="text"
                                            placeholder="Ej: 30-12345678-9"
                                            className={INPUT}
                                            value={form.receipt_cuit}
                                            onChange={set('receipt_cuit')}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-300 mb-2">Domicilio Comercial</label>
                                    <input
                                        type="text"
                                        placeholder="Ej: Av. Corrientes 1234, CABA"
                                        className={INPUT}
                                        value={form.receipt_address}
                                        onChange={set('receipt_address')}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Section: Receipt Footer */}
                        <div className="bg-slate-900/50 backdrop-blur-xl rounded-3xl border border-slate-800 shadow-xl overflow-hidden">
                            <div className="p-6 border-b border-slate-800 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-slate-700/50 border border-slate-700 flex items-center justify-center">
                                    <FileText size={20} className="text-slate-400" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-white">Pie de Comprobante</h2>
                                    <p className="text-slate-400 text-sm">Texto legal que aparece al final del ticket.</p>
                                </div>
                            </div>
                            <div className="p-6 lg:p-8">
                                <textarea
                                    rows={4}
                                    placeholder="Ej: Gracias por su compra. No se aceptan devoluciones sin comprobante."
                                    className={`${INPUT} min-h-[110px] resize-none`}
                                    value={form.receipt_legal_footer}
                                    onChange={set('receipt_legal_footer')}
                                />
                            </div>
                        </div>

                        {/* Inline save feedback */}
                        {saved && (
                            <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400 font-bold">
                                <CheckCircle size={20} />
                                Configuración guardada correctamente.
                            </div>
                        )}
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
