import { useState, useRef } from 'react';
import { X, UploadCloud, FileText, Loader2, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Papa from 'papaparse';

type ImportCSVModalProps = {
    isOpen: boolean;
    onClose: () => void;
    storeId: string;
    onSuccess: () => void;
};

export function ImportCSVModal({ isOpen, onClose, storeId, onSuccess }: ImportCSVModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState<{ current: number, total: number } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [successCount, setSuccessCount] = useState<number | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const supabase = createClient();

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const selected = e.target.files[0];
            if (selected.type !== 'text/csv' && !selected.name.endsWith('.csv')) {
                setError('Por favor, selecciona un archivo CSV válido.');
                return;
            }
            setFile(selected);
            setError(null);
            setSuccessCount(null);
        }
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const dropped = e.dataTransfer.files[0];
            if (dropped.type !== 'text/csv' && !dropped.name.endsWith('.csv')) {
                setError('Solo se permiten archivos .csv');
                return;
            }
            setFile(dropped);
            setError(null);
            setSuccessCount(null);
        }
    };

    const handleImport = async () => {
        if (!file) return;

        setIsProcessing(true);
        setError(null);

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                const rows = results.data as any[];
                if (rows.length === 0) {
                    setError("El archivo está vacío.");
                    setIsProcessing(false);
                    return;
                }

                setProgress({ current: 0, total: rows.length });
                const batchSize = 100; // procesar de a 100 para no saturar 
                let successInserted = 0;

                try {
                    for (let i = 0; i < rows.length; i += batchSize) {
                        const batch = rows.slice(i, i + batchSize);

                        const productsToInsert = batch.map(row => {
                            // Mapeo flexible tratando de adivinar los nombres de columnas
                            const name = row['Nombre'] || row['name'] || row['Nombre de Producto'] || '';
                            const category = row['Categoría'] || row['Categoria'] || row['category'] || 'Sin clasificar';
                            const salePriceRaw = row['Precio Venta'] || row['Precio'] || row['sale_price'] || row['price'] || String(row['Precio Venta ($)'] || '0');
                            const costPriceRaw = row['Costo'] || row['cost_price'] || row['cost'] || String(row['Costo ($)'] || '0');
                            const stockRaw = row['Stock Actual'] || row['Stock'] || row['current_stock'] || row['stock'] || '0';

                            return {
                                store_id: storeId,
                                name: String(name).trim() || 'Producto sin nombre',
                                sku: row['SKU'] || row['sku'] || null,
                                category: String(category).trim(),
                                sale_price: parseFloat(String(salePriceRaw).replace(/,/g, '.')) || 0,
                                cost_price: parseFloat(String(costPriceRaw).replace(/,/g, '.')) || 0,
                                current_stock: parseInt(String(stockRaw), 10) || 0,
                                min_stock: parseInt(String(row['Stock Minimo'] || row['Stock Mínimo'] || row['min_stock'] || '0'), 10) || 0,
                                photo_url: row['Imagen'] || row['photo_url'] || row['image'] || null,
                            };
                        });

                        const { error: insertError } = await supabase
                            .from('products')
                            .insert(productsToInsert);

                        if (insertError) throw insertError;

                        successInserted += productsToInsert.length;
                        setProgress({ current: successInserted, total: rows.length });
                    }

                    setSuccessCount(successInserted);
                    onSuccess();
                } catch (err: any) {
                    console.error("Error en la importación:", err);
                    setError(`Error en la fila ${successInserted + 1}: ${err.message || 'Error desconocido'}`);
                } finally {
                    setIsProcessing(false);
                }
            },
            error: (err) => {
                setError(`Error al leer el archivo: ${err.message}`);
                setIsProcessing(false);
            }
        });
    };

    const downloadTemplate = () => {
        const headers = "SKU,Nombre,Categoría,Costo,Precio Venta,Stock Actual,Stock Mínimo,Imagen\n";
        const sample1 = "PROD-001,Leche Entera,Lácteos,800,1200,50,10,https://ejemplo.com/leche.jpg\n";
        const sample2 = "PROD-002,Pan Lactal,Panadería,500,950,20,5,\n";

        const blob = new Blob([headers + sample1 + sample2], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "plantilla_productos.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
                <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-900/50">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <UploadCloud className="text-primary" />
                        Importar CSV
                    </h2>
                    <button onClick={onClose} disabled={isProcessing} className="text-slate-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 flex flex-col gap-6">
                    {successCount !== null ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center gap-4">
                            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/20">
                                <CheckCircle2 className="text-emerald-500 w-8 h-8" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white">¡Importación Exitosa!</h3>
                                <p className="text-slate-400 mt-1">Se agregaron {successCount} productos correctamente a tu catálogo.</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="mt-4 px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-all w-full"
                            >
                                Entendido
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="flex justify-between items-center bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                                <div>
                                    <h4 className="text-sm font-bold text-white">Plantilla CSV</h4>
                                    <p className="text-xs text-slate-400 mt-1 max-w-[250px]">
                                        Descarga este archivo para ver el formato correcto de las columnas.
                                    </p>
                                </div>
                                <button
                                    onClick={downloadTemplate}
                                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold rounded-lg border border-slate-600 transition-colors"
                                >
                                    Descargar Base
                                </button>
                            </div>

                            {error && (
                                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl text-sm">
                                    {error}
                                </div>
                            )}

                            {!file ? (
                                <div
                                    className="border-2 border-dashed border-slate-700 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:border-blue-500/50 hover:bg-slate-800/30 transition-all cursor-pointer group"
                                    onClick={() => fileInputRef.current?.click()}
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={handleDrop}
                                >
                                    <input
                                        type="file"
                                        accept=".csv"
                                        className="hidden"
                                        ref={fileInputRef}
                                        onChange={handleFileChange}
                                    />
                                    <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center border border-slate-700 text-slate-400 group-hover:text-primary group-hover:border-primary/50 transition-colors mb-4">
                                        <FileText size={24} />
                                    </div>
                                    <h4 className="text-white font-bold text-lg mb-1">Subir Archivo CSV</h4>
                                    <p className="text-sm text-slate-400">Haz clic aquí o arrastra tu archivo</p>
                                </div>
                            ) : (
                                <div className="border border-slate-700 bg-slate-800/50 rounded-xl p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center border border-primary/20 shrink-0">
                                            <FileText size={20} className="text-primary" />
                                        </div>
                                        <div className="overflow-hidden">
                                            <p className="text-white font-semibold text-sm truncate">{file.name}</p>
                                            <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setFile(null)}
                                        className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                                        disabled={isProcessing}
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                            )}

                            {isProcessing && progress && (
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs font-semibold">
                                        <span className="text-primary">Procesando...</span>
                                        <span className="text-slate-400">{progress.current} / {progress.total}</span>
                                    </div>
                                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-primary transition-all duration-300 rounded-full"
                                            style={{ width: `${(progress.current / progress.total) * 100}%` }}
                                        ></div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {!successCount && (
                    <div className="p-6 border-t border-slate-800 flex justify-end gap-3 bg-slate-900/50">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isProcessing}
                            className="px-6 py-2.5 rounded-xl text-slate-300 font-semibold hover:bg-slate-800 transition-colors disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleImport}
                            disabled={!file || isProcessing}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary hover:bg-blue-600 text-white font-bold transition-all disabled:opacity-50 min-w-[140px] justify-center"
                        >
                            {isProcessing ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    Importando
                                </>
                            ) : 'Comenzar Importación'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
