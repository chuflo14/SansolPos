'use client';

import { Save } from 'lucide-react';

export default function SettingsPage() {
    return (
        <div className="h-full w-full overflow-y-auto bg-slate-950 font-sans custom-scrollbar">
            <div className="p-8 lg:p-10 pb-32 max-w-[1600px] mx-auto min-h-screen">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
                    <div>
                        <h1 className="text-4xl font-black text-white tracking-tight">Configuración</h1>
                        <p className="text-slate-400 mt-2 font-medium">Preferencias de la tienda y datos de facturación.</p>
                    </div>
                    <button className="flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-blue-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-primary/20">
                        <Save size={18} />
                        Guardar Cambios
                    </button>
                </div>

                <div className="bg-slate-900/50 backdrop-blur-xl rounded-3xl border border-slate-800 shadow-xl overflow-hidden mb-8">
                    <div className="p-6 lg:p-8 border-b border-slate-800 bg-slate-900/50">
                        <h2 className="text-xl font-bold text-white">Datos Fiscales (Comprobante AFIP)</h2>
                        <p className="text-slate-400 text-sm mt-1 font-medium">Estos datos se imprimirán en la cabecera del recibo térmico y A4.</p>
                    </div>
                    <div className="p-6 lg:p-8 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-300 mb-2">Nombre Comercial (Fantasía)</label>
                                <input type="text" className="w-full p-4 bg-slate-900/50 border border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none text-white font-medium transition-all shadow-inner" defaultValue="SANSOL POS" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-300 mb-2">Razón Social</label>
                                <input type="text" className="w-full p-4 bg-slate-900/50 border border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none text-white font-medium transition-all shadow-inner" defaultValue="SANSOL S.A." />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-300 mb-2">CUIT</label>
                                <input type="text" className="w-full p-4 bg-slate-900/50 border border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none text-white font-medium transition-all shadow-inner" defaultValue="30-12345678-9" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-300 mb-2">Domicilio Comercial</label>
                                <input type="text" className="w-full p-4 bg-slate-900/50 border border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none text-white font-medium transition-all shadow-inner" defaultValue="Calle Falsa 123, CABA" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-300 mb-2">Pie de Página Legal</label>
                            <textarea className="w-full p-4 bg-slate-900/50 border border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none text-white font-medium transition-all shadow-inner min-h-[120px]" defaultValue="COMPROBANTE NO VÁLIDO COMO FACTURA (En esta etapa)"></textarea>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-900/50 backdrop-blur-xl rounded-3xl border border-slate-800 shadow-xl overflow-hidden">
                    <div className="p-6 lg:p-8 border-b border-slate-800 bg-slate-900/50">
                        <h2 className="text-xl font-bold text-white">Integración n8n Webhooks</h2>
                        <p className="text-slate-400 text-sm mt-1 font-medium">Configura las URLs para recibir los eventos de la tienda de forma automatizada.</p>
                    </div>
                    <div className="p-6 lg:p-8 space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-300 mb-2">Webhook URL (sale_created, stock_low, expense_created)</label>
                            <input type="url" placeholder="https://mi-n8n.com/webhook/..." className="w-full p-4 bg-slate-900/50 border border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none text-white font-medium placeholder-slate-600 transition-all shadow-inner" />
                        </div>
                        <div className="p-6 bg-slate-900/80 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h4 className="font-bold text-white mb-1">API Key de Lectura</h4>
                                <p className="text-sm text-slate-400 font-medium mb-3 sm:mb-0">Usa esta clave en los headers de n8n para autenticar las peticiones entrantes.</p>
                            </div>
                            <div className="flex gap-2">
                                <input type="text" readOnly value="sk_test_1234567890abcdef" className="p-3 bg-slate-950/50 text-slate-300 border border-slate-800 rounded-lg font-mono text-sm outline-none shrink-0 min-w-[280px]" />
                                <button className="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold transition-colors border border-slate-700 shrink-0">Copiar</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
