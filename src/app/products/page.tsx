'use client';

import { useState } from 'react';
import { Search, Plus, Upload, MoreVertical, Edit2, Trash2 } from 'lucide-react';

const MOCK_PRODUCTS = [
    { id: '1', sku: 'LA001', name: 'Leche Descremada', category: 'Lácteos', price: 1200, cost: 800, stock: 45, minStock: 20, image: 'https://placehold.co/100' },
    { id: '2', sku: 'PA002', name: 'Pan Lactal', category: 'Panadería', price: 950, cost: 500, stock: 20, minStock: 15, image: 'https://placehold.co/100' },
    { id: '3', sku: 'AL003', name: 'Café Instantáneo', category: 'Almacén', price: 4500, cost: 3200, stock: 5, minStock: 10, image: 'https://placehold.co/100' },
    { id: '4', sku: 'AL004', name: 'Yerba Mate', category: 'Almacén', price: 3200, cost: 2100, stock: 12, minStock: 20, image: 'https://placehold.co/100' },
    { id: '5', sku: 'AL005', name: 'Azúcar Blanca', category: 'Almacén', price: 850, cost: 600, stock: 0, minStock: 10, image: 'https://placehold.co/100' },
];

export default function ProductsPage() {
    const [searchTerm, setSearchTerm] = useState('');

    const filtered = MOCK_PRODUCTS.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="h-full w-full overflow-y-auto bg-slate-950 font-sans custom-scrollbar">
            <div className="p-8 lg:p-10 pb-32 max-w-[1600px] mx-auto min-h-screen">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
                    <div>
                        <h1 className="text-4xl font-black text-white tracking-tight">Productos</h1>
                        <p className="text-slate-400 mt-2 font-medium">Gestión de inventario y listado de precios.</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button className="flex items-center gap-2 bg-slate-900 border border-slate-800 shadow-sm px-5 py-2.5 rounded-xl text-slate-300 font-semibold hover:bg-slate-800 transition-colors">
                            <Upload size={18} className="text-slate-400" />
                            Importar CSV
                        </button>
                        <button className="flex items-center gap-2 bg-primary hover:bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-primary/20">
                            <Plus size={18} />
                            Nuevo Producto
                        </button>
                    </div>
                </div>

                <div className="bg-slate-900/50 backdrop-blur-xl rounded-3xl border border-slate-800 shadow-xl overflow-hidden">
                    <div className="p-6 lg:p-8 border-b border-slate-800">
                        <div className="relative max-w-md">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                            <input
                                type="text"
                                placeholder="Buscar por nombre o SKU..."
                                className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-sm transition-all"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-900/80 text-xs uppercase tracking-wider text-slate-500 font-bold border-b border-slate-800">
                                    <th className="py-4 px-8 whitespace-nowrap">Img</th>
                                    <th className="py-4 px-8 whitespace-nowrap">SKU</th>
                                    <th className="py-4 px-8">Nombre de Producto</th>
                                    <th className="py-4 px-8">Categoría</th>
                                    <th className="py-4 px-8 text-right">Costo</th>
                                    <th className="py-4 px-8 text-right">Precio Venta</th>
                                    <th className="py-4 px-8 text-right">Stock</th>
                                    <th className="py-4 px-8 text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                                {filtered.map((product) => {
                                    const isLow = product.stock <= (product.minStock || 0);
                                    const isOut = product.stock === 0;

                                    return (
                                        <tr key={product.id} className="hover:bg-slate-800/40 transition-colors group">
                                            <td className="py-4 px-8">
                                                <div className="w-12 h-12 rounded-xl shadow-sm overflow-hidden bg-slate-800 border border-slate-700">
                                                    <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                                                </div>
                                            </td>
                                            <td className="py-4 px-8 text-slate-400 font-mono text-sm font-semibold">{product.sku}</td>
                                            <td className="py-4 px-8 font-bold text-slate-200">{product.name}</td>
                                            <td className="py-4 px-8">
                                                <span className="bg-slate-800 text-slate-300 border border-slate-700 px-3 py-1 rounded-lg text-xs font-semibold">{product.category}</span>
                                            </td>
                                            <td className="py-4 px-8 text-right text-slate-400 font-medium">${product.cost.toLocaleString('es-AR')}</td>
                                            <td className="py-4 px-8 text-right font-bold text-white">${product.price.toLocaleString('es-AR')}</td>
                                            <td className="py-4 px-8 text-right">
                                                <span className={`px-3 py-1 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 border
                        ${isOut ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : isLow ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}
                      `}>
                                                    <div className={`w-1.5 h-1.5 rounded-full ${isOut ? 'bg-rose-500' : isLow ? 'bg-orange-500' : 'bg-emerald-500'}`}></div>
                                                    {product.stock} un.
                                                </span>
                                            </td>
                                            <td className="py-4 px-8 text-center">
                                                <div className="flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button className="p-2 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded-lg transition-colors" title="Editar">
                                                        <Edit2 size={18} />
                                                    </button>
                                                    <button className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors" title="Eliminar">
                                                        <Trash2 size={18} />
                                                    </button>
                                                    <button className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors">
                                                        <MoreVertical size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}

                                {filtered.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="py-16 text-center text-slate-500 font-medium">
                                            No se encontraron productos buscando "{searchTerm}"
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
                    background: #020617;
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
