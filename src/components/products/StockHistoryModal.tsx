'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Loader2, ArrowUpRight, ArrowDownRight, PackageMinus, LogIn, Repeat } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type StockMovement = {
    id: string;
    product_id: string;
    quantity: number;
    type: 'IN' | 'OUT' | 'ADJUSTMENT' | 'VOID' | 'SALE';
    description: string | null;
    created_at: string;
};

type StockHistoryModalProps = {
    isOpen: boolean;
    onClose: () => void;
    productId: string;
    productName: string;
    storeId: string;
};

const TYPE_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
    'IN': { label: 'Ingreso', icon: LogIn, color: 'text-emerald-400 bg-emerald-500/10' },
    'OUT': { label: 'Salida', icon: PackageMinus, color: 'text-rose-400 bg-rose-500/10' },
    'ADJUSTMENT': { label: 'Ajuste Manual', icon: Repeat, color: 'text-orange-400 bg-orange-500/10' },
    'VOID': { label: 'Anulación', icon: ArrowUpRight, color: 'text-blue-400 bg-blue-500/10' },
    'SALE': { label: 'Venta (POS)', icon: ArrowDownRight, color: 'text-rose-400 bg-rose-500/10' },
};

export function StockHistoryModal({ isOpen, onClose, productId, productName, storeId }: StockHistoryModalProps) {
    const supabase = createClient();
    const [movements, setMovements] = useState<StockMovement[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const PAGE_SIZE = 50;

    const fetchMovements = useCallback(async (isLoadMore = false) => {
        if (!storeId || !productId) return;

        if (isLoadMore) setIsLoadingMore(true);
        else setIsLoading(true);

        const currentCount = isLoadMore ? movements.length : 0;

        const { data, error } = await supabase
            .from('stock_movements')
            .select('*')
            .eq('store_id', storeId)
            .eq('product_id', productId)
            .order('created_at', { ascending: false })
            .range(currentCount, currentCount + PAGE_SIZE - 1);

        if (!error && data) {
            setMovements(prev => isLoadMore ? [...prev, ...data] : data);
            setHasMore(data.length === PAGE_SIZE);
        }

        setIsLoading(false);
        setIsLoadingMore(false);
    }, [storeId, productId, supabase, movements.length]);

    useEffect(() => {
        if (isOpen) {
            setMovements([]);
            setHasMore(true);
            fetchMovements(false);
        }
    }, [isOpen, productId]);

    if (!isOpen) return null;

    const fmtDate = (d: string) => new Date(d).toLocaleString('es-AR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-800 shrink-0 bg-slate-900/50">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            Historial de Stock
                        </h2>
                        <p className="text-sm text-slate-400 mt-1 font-medium">{productName}</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                            <Loader2 className="animate-spin mb-4 text-primary" size={32} />
                            <p className="font-medium">Cargando historial...</p>
                        </div>
                    ) : movements.length === 0 ? (
                        <div className="text-center py-20">
                            <PackageMinus className="mx-auto text-slate-600 mb-4" size={48} />
                            <p className="text-slate-400 font-medium">No hay movimientos registrados para este producto.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {movements.map((mov) => {
                                const config = TYPE_CONFIG[mov.type] || { label: mov.type, icon: PackageMinus, color: 'text-slate-400 bg-slate-800' };
                                const Icon = config.icon;
                                const isPositive = mov.quantity > 0;

                                return (
                                    <div key={mov.id} className="flex items-center justify-between p-4 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-xl transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className={`p-3 rounded-lg ${config.color}`}>
                                                <Icon size={20} />
                                            </div>
                                            <div>
                                                <p className="text-white font-bold">{config.label}</p>
                                                <p className="text-slate-400 text-xs mt-0.5">{mov.description || 'Sin descripción'}</p>
                                                <p className="text-slate-500 text-xs mt-1 font-mono">{fmtDate(mov.created_at)}</p>
                                            </div>
                                        </div>
                                        <div className={`text-lg font-black ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                                            {isPositive ? '+' : ''}{mov.quantity}
                                        </div>
                                    </div>
                                )
                            })}

                            {hasMore && (
                                <button
                                    onClick={() => fetchMovements(true)}
                                    disabled={isLoadingMore}
                                    className="w-full py-4 mt-4 border border-slate-700 border-dashed rounded-xl text-slate-400 hover:text-white hover:border-slate-500 hover:bg-slate-800/50 transition-all font-semibold flex items-center justify-center gap-2"
                                >
                                    {isLoadingMore ? <><Loader2 size={16} className="animate-spin" /> Cargando...</> : 'Cargar más movimientos'}
                                </button>
                            )}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
