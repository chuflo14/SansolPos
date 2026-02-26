import { useState, useEffect, useRef } from 'react';
import { X, Loader2, ImagePlus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export type Product = {
    id: string;
    sku: string | null;
    name: string;
    category: string;
    sale_price: number;
    cost_price: number;
    current_stock: number;
    min_stock: number | null;
    photo_url: string | null;
};

type ProductModalProps = {
    isOpen: boolean;
    onClose: () => void;
    editingProduct: Product | null;
    storeId: string;
    categories: string[];
    onSuccess: () => void;
};

export function ProductModal({ isOpen, onClose, editingProduct, storeId, categories, onSuccess }: ProductModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const supabase = createClient();

    const [formData, setFormData] = useState({
        name: '',
        sku: '',
        category: '',
        sale_price: '',
        cost_price: '',
        current_stock: '',
        min_stock: '',
        photo_url: ''
    });

    useEffect(() => {
        if (editingProduct) {
            setFormData({
                name: editingProduct.name || '',
                sku: editingProduct.sku || '',
                category: editingProduct.category || (categories.length > 0 ? categories[0] : ''),
                sale_price: editingProduct.sale_price.toString(),
                cost_price: editingProduct.cost_price.toString(),
                current_stock: editingProduct.current_stock.toString(),
                min_stock: editingProduct.min_stock?.toString() || '',
                photo_url: editingProduct.photo_url || ''
            });
            setImagePreview(editingProduct.photo_url || null);
        } else {
            setFormData({
                name: '',
                sku: '',
                category: categories.length > 0 ? categories[0] : '',
                sale_price: '',
                cost_price: '0',
                current_stock: '0',
                min_stock: '0',
                photo_url: ''
            });
            setImagePreview(null);
        }
        setImageFile(null);
        setError(null);

        // Reset file input if exists
        if (fileInputRef.current) fileInputRef.current.value = '';
    }, [editingProduct, isOpen, categories]);

    if (!isOpen) return null;

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];

            if (!file.type.startsWith('image/')) {
                setError('Por favor, selecciona un archivo de imagen válido.');
                return;
            }

            if (file.size > 5 * 1024 * 1024) {
                setError('La imagen es demasiado grande. Máximo 5MB.');
                return;
            }

            setImageFile(file);
            setError(null);

            // Create preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const uploadImage = async (file: File): Promise<string> => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
        const filePath = `${storeId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('products')
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
            .from('products')
            .getPublicUrl(filePath);

        return data.publicUrl;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            let finalPhotoUrl = formData.photo_url;

            if (imageFile) {
                finalPhotoUrl = await uploadImage(imageFile);
            }
            const productData = {
                store_id: storeId,
                name: formData.name,
                sku: formData.sku || null,
                category: formData.category,
                sale_price: parseFloat(formData.sale_price),
                cost_price: parseFloat(formData.cost_price) || 0,
                current_stock: parseInt(formData.current_stock, 10) || 0,
                min_stock: formData.min_stock ? parseInt(formData.min_stock, 10) : 0,
                photo_url: finalPhotoUrl || null
            };

            if (editingProduct) {
                // Update existing
                const { error: dbError } = await supabase
                    .from('products')
                    .update(productData)
                    .eq('id', editingProduct.id);

                if (dbError) throw dbError;
            } else {
                // Insert new
                const { error: dbError } = await supabase
                    .from('products')
                    .insert([productData]);

                if (dbError) throw dbError;
            }

            onSuccess();
            onClose();
        } catch (err: any) {
            console.error('Error saving product:', err);
            setError(err.message || 'Error al guardar el producto.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[95vh] flex flex-col overflow-hidden shadow-2xl">
                <div className="flex items-center justify-between p-6 border-b border-slate-800 shrink-0 bg-slate-900/50">
                    <h2 className="text-xl font-bold text-white">
                        {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-white transition-colors"
                        disabled={isLoading}
                    >
                        <X size={24} />
                    </button>
                </div>

                <form id="product-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2 flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-700 rounded-xl bg-slate-900/50 hover:bg-slate-800/50 hover:border-slate-500 transition-colors cursor-pointer"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleImageChange}
                                accept="image/png, image/jpeg, image/webp"
                                className="hidden"
                            />
                            {imagePreview ? (
                                <div className="relative w-32 h-32 rounded-lg overflow-hidden border border-slate-700 shadow-md">
                                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                        <span className="text-white text-xs font-bold">Cambiar Foto</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center text-slate-400 gap-2">
                                    <div className="p-3 bg-slate-800 rounded-full">
                                        <ImagePlus size={24} />
                                    </div>
                                    <span className="text-sm font-medium">Click para subir foto (Opcional)</span>
                                </div>
                            )}
                        </div>

                        <div className="space-y-2 text-left">
                            <label className="text-sm font-medium text-slate-300">Nombre del Producto *</label>
                            <input
                                required
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-colors"
                                placeholder="Ej: Leche Descremada"
                            />
                        </div>

                        <div className="space-y-2 text-left">
                            <label className="text-sm font-medium text-slate-300">SKU (Código interno)</label>
                            <input
                                type="text"
                                value={formData.sku}
                                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-colors"
                                placeholder="Ej: PROD-001"
                            />
                        </div>

                        <div className="space-y-2 text-left">
                            <label className="text-sm font-medium text-slate-300">Categoría *</label>
                            {categories.length > 0 ? (
                                <select
                                    required
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-colors appearance-none"
                                >
                                    <option value="" disabled>Selecciona una categoría</option>
                                    {categories.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            ) : (
                                <input
                                    required
                                    type="text"
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-colors"
                                    placeholder="Ej: Lácteos"
                                />
                            )}
                        </div>

                        <div className="space-y-2 text-left">
                            <label className="text-sm font-medium text-slate-300">Precio de Venta ($) *</label>
                            <input
                                required
                                type="number"
                                step="0.01"
                                min="0"
                                value={formData.sale_price}
                                onChange={(e) => setFormData({ ...formData, sale_price: e.target.value })}
                                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-colors"
                            />
                        </div>

                        <div className="space-y-2 text-left">
                            <label className="text-sm font-medium text-slate-300">Costo ($)</label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={formData.cost_price}
                                onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-colors"
                            />
                        </div>

                        <div className="space-y-2 text-left">
                            <label className="text-sm font-medium text-slate-300">Stock Actual</label>
                            <input
                                type="number"
                                value={formData.current_stock}
                                onChange={(e) => setFormData({ ...formData, current_stock: e.target.value })}
                                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-colors"
                            />
                        </div>

                        <div className="space-y-2 text-left">
                            <label className="text-sm font-medium text-slate-300">Stock Mínimo (Alerta)</label>
                            <input
                                type="number"
                                value={formData.min_stock}
                                onChange={(e) => setFormData({ ...formData, min_stock: e.target.value })}
                                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-colors"
                            />
                        </div>
                    </div>
                </form>

                <div className="p-6 border-t border-slate-800 flex flex-col gap-4 bg-slate-900/50">
                    {error && (
                        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl text-sm font-bold flex items-center gap-2">
                            <span>❌</span> {error}
                        </div>
                    )}
                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isLoading}
                            className="px-6 py-2.5 rounded-xl text-slate-300 font-semibold hover:bg-slate-800 transition-colors disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            form="product-form"
                            disabled={isLoading}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary hover:bg-blue-600 text-white font-bold transition-all disabled:opacity-50 min-w-[150px] justify-center"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    Guardando...
                                </>
                            ) : (
                                editingProduct ? 'Guardar Cambios' : 'Crear Producto'
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
