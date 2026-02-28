'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Save, Loader2, CheckCircle, Building2, FileText, ImagePlus, X, Banknote } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';

type Settings = {
    receipt_business_name: string;
    receipt_cuit: string;
    receipt_address: string;
    receipt_legal_footer: string;
    receipt_logo_url: string;
    transfer_holder: string;
    transfer_cbu: string;
    transfer_alias: string;
    // FASE3: mp_access_token vive en store_secrets (tabla separada admin-only)
    mp_access_token: string;
};

const EMPTY: Settings = {
    receipt_business_name: '',
    receipt_cuit: '',
    receipt_address: '',
    receipt_legal_footer: '',
    receipt_logo_url: '',
    transfer_holder: '',
    transfer_cbu: '',
    transfer_alias: '',
    mp_access_token: '',
};

const INPUT = 'w-full p-4 bg-slate-900/50 border border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none text-white font-medium transition-all shadow-inner placeholder-slate-600';
const BTN_SAVE = 'flex items-center gap-2 px-6 py-3 font-black text-white rounded-xl transition-all border shadow-lg disabled:opacity-50 disabled:cursor-not-allowed min-w-[160px] justify-center bg-blue-600 hover:bg-blue-500 border-blue-500';

export default function SettingsPage() {
    const { storeId } = useAuth();
    const supabase = createClient();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [form, setForm] = useState<Settings>(EMPTY);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Logo upload state
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [isUploadingLogo, setIsUploadingLogo] = useState(false);

    const fetchSettings = useCallback(async () => {
        if (!storeId) return;
        setIsLoading(true);
        const { data } = await supabase
            .from('store_settings')
            .select('receipt_business_name, receipt_cuit, receipt_address, receipt_legal_footer, receipt_logo_url, transfer_holder, transfer_cbu, transfer_alias')
            .eq('store_id', storeId)
            .maybeSingle();

        // FASE3: mp_access_token se lee de store_secrets (admin-only)
        const { data: secrets } = await supabase
            .from('store_secrets')
            .select('mp_access_token')
            .eq('store_id', storeId)
            .maybeSingle();

        if (data) {
            setForm({
                receipt_business_name: data.receipt_business_name ?? '',
                receipt_cuit: data.receipt_cuit ?? '',
                receipt_address: data.receipt_address ?? '',
                receipt_legal_footer: data.receipt_legal_footer ?? '',
                receipt_logo_url: data.receipt_logo_url ?? '',
                transfer_holder: data.transfer_holder ?? '',
                transfer_cbu: data.transfer_cbu ?? '',
                transfer_alias: data.transfer_alias ?? '',
                mp_access_token: secrets?.mp_access_token ?? '',
            });
            if (data.receipt_logo_url) setLogoPreview(data.receipt_logo_url);
        }
        setIsLoading(false);
    }, [storeId, supabase]);

    useEffect(() => { fetchSettings(); }, [fetchSettings]);

    const set = (key: keyof Settings) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setForm(f => ({ ...f, [key]: e.target.value }));

    /* ── Logo Upload ─────────────────────────────────────────── */
    const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !storeId) return;

        // Preview instantly
        const preview = URL.createObjectURL(file);
        setLogoPreview(preview);
        setIsUploadingLogo(true);
        setError(null);

        const ext = file.name.split('.').pop();
        const path = `logos/${storeId}/logo.${ext}`;

        const { error: uploadErr } = await supabase.storage
            .from('receipts')
            .upload(path, file, { upsert: true, contentType: file.type });

        if (uploadErr) {
            setError('No se pudo subir el logo. Verificá que el bucket "receipts" existe en Supabase Storage.');
            setIsUploadingLogo(false);
            return;
        }

        const { data: { publicUrl } } = supabase.storage.from('receipts').getPublicUrl(path);
        setForm(f => ({ ...f, receipt_logo_url: publicUrl }));
        setLogoPreview(publicUrl);
        setIsUploadingLogo(false);
    };

    const handleRemoveLogo = () => {
        setLogoPreview(null);
        setForm(f => ({ ...f, receipt_logo_url: '' }));
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    /* ── Save ────────────────────────────────────────────────── */
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
                receipt_logo_url: form.receipt_logo_url || null,
                transfer_holder: form.transfer_holder.trim() || null,
                transfer_cbu: form.transfer_cbu.trim() || null,
                transfer_alias: form.transfer_alias.trim() || null,
            }, { onConflict: 'store_id' });

        // FASE3: mp_access_token se guarda en store_secrets (admin-only)
        if (form.mp_access_token.trim()) {
            await supabase
                .from('store_secrets')
                .upsert({
                    store_id: storeId,
                    mp_access_token: form.mp_access_token.trim(),
                }, { onConflict: 'store_id' });
        }


        if (err) {
            setError('No se pudieron guardar los cambios.');
        } else {
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        }
        setIsSaving(false);
    };

    /* ── Render ──────────────────────────────────────────────── */
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
                        disabled={isSaving || isLoading || isUploadingLogo}
                        className={BTN_SAVE}
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

                        {/* Logo */}
                        <div className="bg-slate-900/50 backdrop-blur-xl rounded-3xl border border-slate-800 shadow-xl overflow-hidden">
                            <div className="p-6 border-b border-slate-800 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-slate-700/50 border border-slate-700 flex items-center justify-center">
                                    <ImagePlus size={20} className="text-slate-400" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-white">Logo del Comprobante</h2>
                                    <p className="text-slate-400 text-sm">Se imprime en la cabecera del ticket. PNG o JPG, max 2 MB.</p>
                                </div>
                            </div>
                            <div className="p-6 flex items-center gap-6">
                                {/* Preview */}
                                {logoPreview ? (
                                    <div className="relative shrink-0">
                                        <img
                                            src={logoPreview}
                                            alt="Logo"
                                            className="w-28 h-28 object-contain rounded-2xl bg-white/5 border border-slate-700 p-2"
                                        />
                                        {isUploadingLogo && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60 rounded-2xl">
                                                <Loader2 className="animate-spin text-white" size={24} />
                                            </div>
                                        )}
                                        <button
                                            onClick={handleRemoveLogo}
                                            className="absolute -top-2 -right-2 w-6 h-6 bg-rose-500 text-white rounded-full flex items-center justify-center hover:bg-rose-600 transition-colors"
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                ) : (
                                    <div
                                        className="w-28 h-28 rounded-2xl border-2 border-dashed border-slate-700 flex items-center justify-center text-slate-600 shrink-0 hover:border-slate-500 cursor-pointer transition-colors"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <ImagePlus size={28} />
                                    </div>
                                )}

                                <div className="flex flex-col gap-3">
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/png,image/jpeg,image/webp"
                                        className="hidden"
                                        onChange={handleLogoChange}
                                    />
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isUploadingLogo}
                                        className="flex items-center gap-2 px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl border border-slate-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                                    >
                                        {isUploadingLogo ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />}
                                        {isUploadingLogo ? 'Subiendo...' : logoPreview ? 'Cambiar Logo' : 'Subir Logo'}
                                    </button>
                                    <p className="text-slate-500 text-xs">
                                        El logo se sube automáticamente al seleccionarlo.<br />
                                        Presioná Guardar Cambios para confirmar.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Fiscal data */}
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
                                        <input type="text" placeholder="Ej: SANSOL" className={INPUT} value={form.receipt_business_name} onChange={set('receipt_business_name')} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-300 mb-2">CUIT</label>
                                        <input type="text" placeholder="Ej: 30-12345678-9" className={INPUT} value={form.receipt_cuit} onChange={set('receipt_cuit')} />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-300 mb-2">Domicilio Comercial</label>
                                    <input type="text" placeholder="Ej: Av. Corrientes 1234, CABA" className={INPUT} value={form.receipt_address} onChange={set('receipt_address')} />
                                </div>
                            </div>
                        </div>

                        {/* Legal footer */}
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

                        {/* Mercado Pago */}
                        <div className="bg-slate-900/50 backdrop-blur-xl rounded-3xl border border-slate-800 shadow-xl overflow-hidden">
                            <div className="p-6 border-b border-slate-800 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
                                    <Banknote size={20} className="text-sky-400" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-white">Mercado Pago</h2>
                                    <p className="text-slate-400 text-sm">
                                        Token para verificar transferencias recibidas.{' '}
                                        <a href="https://www.mercadopago.com.ar/developers/panel" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">
                                            Obtener token →
                                        </a>
                                    </p>
                                </div>
                            </div>
                            <div className="p-6 lg:p-8">
                                <label className="block text-sm font-bold text-slate-300 mb-2">Access Token de Producción</label>
                                <input
                                    type="password"
                                    placeholder="APP_USR-..."
                                    className={INPUT}
                                    value={form.mp_access_token}
                                    onChange={set('mp_access_token')}
                                    autoComplete="off"
                                />
                                <p className="mt-2 text-xs text-slate-500">
                                    Solo la dueña ve y edita este campo. Se usa en el servidor para consultar pagos recibidos.
                                </p>
                            </div>
                        </div>

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
