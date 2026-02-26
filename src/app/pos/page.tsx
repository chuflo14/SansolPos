'use client';

import { useState, useEffect, useMemo } from 'react';
import { ShoppingCart, Search, Receipt, Loader2, Image as ImageIcon } from 'lucide-react';
import { CheckoutModal } from '@/components/pos/CheckoutModal';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Product } from '@/components/products/ProductModal';

export default function POSPage() {
    const { storeId } = useAuth();
    const supabase = createClient();

    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

    useEffect(() => {
        if (!storeId) return;

        const fetchProducts = async () => {
            setIsLoading(true);
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .eq('store_id', storeId)
                .order('name');

            if (!error && data) {
                setProducts(data);
            }
            setIsLoading(false);
        };

        fetchProducts();
    }, [storeId, supabase]);

    const categories = useMemo(() => {
        const uniqueCategories = new Set(products.map(p => p.category).filter(Boolean));
        return Array.from(uniqueCategories).sort();
    }, [products]);

    const handleCheckoutConfirm = () => {
        // Once confirmed, the modal goes to step 2 (success). We don't clear the cart yet so the receipt can render it.
        // The cart will be cleared exactly when the modal closes.
    };

    const handleCloseCheckout = () => {
        setIsCheckoutOpen(false);
        setCart([]); // Reset cart for the next sale
        setSearchTerm('');
    };

    const addToCart = (product: Product) => {
        if (product.current_stock === 0) return;
        setCart((curr) => {
            const existing = curr.find((item) => item.product.id === product.id);
            if (existing) {
                return curr.map((item) =>
                    item.product.id === product.id
                        ? { ...item, quantity: Math.min(item.quantity + 1, product.current_stock) }
                        : item
                );
            }
            return [...curr, { product, quantity: 1 }];
        });
    };

    const updateQuantity = (productId: string, delta: number) => {
        setCart((curr) => {
            return curr.map((item) => {
                if (item.product.id === productId) {
                    const newQ = item.quantity + delta;
                    if (newQ < 1) return item;
                    if (newQ > item.product.current_stock) return item;
                    return { ...item, quantity: newQ };
                }
                return item;
            });
        });
    };

    const removeFromCart = (productId: string) => {
        setCart((curr) => curr.filter((item) => item.product.id !== productId));
    };

    const filteredProducts = products.filter((p) => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;

        return matchesSearch && matchesCategory;
    });

    const subtotal = cart.reduce((acc, item) => acc + item.product.sale_price * item.quantity, 0);

    return (
        <div className="flex h-full bg-slate-950 font-sans custom-scrollbar text-slate-200">
            {/* Products Section */}
            <div className="flex-1 p-6 lg:p-8 flex flex-col h-full overflow-hidden">
                <div className="flex flex-col gap-6 mb-8">
                    <div className="relative flex-1 max-w-full">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" size={24} />
                        <input
                            type="text"
                            placeholder="Buscar producto..."
                            className="w-full pl-14 pr-6 py-4 rounded-2xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-lg text-lg font-medium transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    {/* Categories Filter */}
                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                        <button
                            onClick={() => setSelectedCategory('all')}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold whitespace-nowrap shadow-sm border transition-colors ${selectedCategory === 'all'
                                    ? 'bg-primary text-white shadow-primary/20 border-transparent'
                                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800 hover:border-slate-700'
                                }`}
                        >
                            Todos
                        </button>
                        {categories.map(category => (
                            <button
                                key={category}
                                onClick={() => setSelectedCategory(category)}
                                className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold whitespace-nowrap shadow-sm border transition-colors ${selectedCategory === category
                                        ? 'bg-primary text-white shadow-primary/20 border-transparent'
                                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800 hover:border-slate-700'
                                    }`}
                            >
                                {category}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto pb-6 pr-2 custom-scrollbar">
                    {isLoading ? (
                        <div className="h-full flex items-center justify-center text-slate-500 gap-3">
                            <Loader2 className="animate-spin" size={24} />
                            <span className="font-semibold px-4">Cargando productos...</span>
                        </div>
                    ) : filteredProducts.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-500">
                            <Search size={48} className="mb-4 opacity-50" />
                            <h3 className="text-xl font-bold text-slate-400">No se encontraron productos</h3>
                            <p className="max-w-xs text-center mt-2">Prueba buscando con otro término o ajustando la categoría seleccionada.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                            {filteredProducts.map((product) => (
                                <button
                                    key={product.id}
                                    onClick={() => addToCart(product)}
                                    disabled={product.current_stock === 0}
                                    className={`bg-slate-900/50 backdrop-blur-sm rounded-3xl border 
                                        ${product.current_stock === 0 ? 'border-red-500/20 opacity-60 grayscale' : 'border-slate-800 hover:border-blue-500/50 hover:bg-slate-900 cursor-pointer hover:shadow-2xl hover:-translate-y-1 shadow-lg'} 
                                        overflow-hidden transition-all group relative text-left flex flex-col`}
                                >
                                    <div className="aspect-[4/3] bg-slate-800 overflow-hidden relative border-b border-slate-800">
                                        {product.photo_url ? (
                                            <img
                                                src={product.photo_url}
                                                alt={product.name}
                                                className={`w-full h-full object-cover ${product.current_stock !== 0 && 'group-hover:scale-105 transition-transform duration-500'}`}
                                            />
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 gap-2">
                                                <ImageIcon size={32} />
                                            </div>
                                        )}
                                        {product.current_stock === 0 && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
                                                <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-4 py-2 rounded-xl font-black text-sm uppercase tracking-widest shadow-xl">Agotado</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-4 flex flex-col justify-between h-[120px]">
                                        <h3 className="text-[15px] font-bold text-white mb-1 line-clamp-2 leading-snug">{product.name}</h3>
                                        <div className="flex items-center justify-between mt-auto pt-2 border-t border-slate-800/50">
                                            <span className="text-lg font-black text-white">${product.sale_price.toLocaleString('es-AR')}</span>
                                            {product.current_stock > 5 && (
                                                <span className="text-[10px] font-bold text-slate-400 bg-slate-800 border border-slate-700 px-2 py-1 rounded-lg shrink-0">
                                                    Stock: {product.current_stock}
                                                </span>
                                            )}
                                            {product.current_stock <= 5 && product.current_stock > 0 && (
                                                <span className="text-[10px] font-bold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-1 rounded-lg shrink-0 animate-pulse">
                                                    Stock: {product.current_stock}
                                                </span>
                                            )}
                                            {product.current_stock === 0 && (
                                                <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-1 rounded-lg shrink-0">
                                                    Stock: 0
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Cart Sidebar */}
            {cart.length > 0 && (
                <div className="w-[420px] bg-slate-900 border-l border-slate-800 flex flex-col shadow-2xl z-10 transition-all duration-300">
                    <div className="p-6 lg:p-8 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                                <ShoppingCart size={24} className="font-bold" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-white leading-none">Mi Compra</h2>
                                <p className="text-sm font-medium text-slate-400 mt-1">{cart.length} productos</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-auto p-6 lg:p-8 space-y-4 custom-scrollbar">
                        {cart.map((item) => (
                            <div key={item.product.id} className="flex items-center gap-4 p-4 rounded-2xl border border-slate-800 bg-slate-950/50 shadow-sm relative group hover:border-slate-700 transition-colors">
                                <button
                                    onClick={() => removeFromCart(item.product.id)}
                                    className="absolute -top-2 -right-2 w-7 h-7 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-full flex items-center justify-center hover:bg-rose-500 hover:text-white transition-colors opacity-0 group-hover:opacity-100 shadow-lg"
                                >
                                    <span className="text-sm font-bold leading-none">×</span>
                                </button>
                                <div className="w-16 h-16 rounded-xl shrink-0 border border-slate-700 bg-slate-800 overflow-hidden flex items-center justify-center">
                                    {item.product.photo_url ? (
                                        <img src={item.product.photo_url} alt={item.product.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <ImageIcon size={20} className="text-slate-600" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-base font-bold text-white line-clamp-1">{item.product.name}</h4>
                                    <div className="flex items-center justify-between mt-3">
                                        <div className="flex items-center gap-1.5 border border-slate-700 rounded-lg p-1 bg-slate-900">
                                            <button
                                                onClick={() => updateQuantity(item.product.id, -1)}
                                                className="w-7 h-7 rounded-md bg-slate-800 flex items-center justify-center text-slate-300 hover:bg-slate-700 hover:text-white transition-colors font-bold"
                                            >-</button>
                                            <span className="text-sm font-black w-6 text-center text-white">{item.quantity}</span>
                                            <button
                                                onClick={() => updateQuantity(item.product.id, 1)}
                                                className="w-7 h-7 rounded-md bg-slate-800 flex items-center justify-center text-slate-300 hover:bg-slate-700 hover:text-white transition-colors font-bold"
                                            >+</button>
                                        </div>
                                        <span className="text-base font-black text-white">${(item.product.sale_price * item.quantity).toLocaleString('es-AR')}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="p-6 lg:p-8 border-t border-slate-800 bg-slate-950/80 backdrop-blur-xl">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-base font-semibold text-slate-400">Subtotal</span>
                            <span className="font-bold text-white text-lg">${subtotal.toLocaleString('es-AR')}</span>
                        </div>
                        <div className="flex items-center justify-between py-5 border-t border-slate-800 mb-4">
                            <span className="text-xl font-black text-white">Total</span>
                            <span className="text-4xl font-black text-primary">${subtotal.toLocaleString('es-AR')}</span>
                        </div>

                        <button
                            onClick={() => setIsCheckoutOpen(true)}
                            className="w-full py-5 rounded-2xl font-black text-xl shadow-xl flex items-center justify-center gap-4 transition-all bg-primary text-white shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] hover:shadow-primary/40 border border-blue-500/50"
                        >
                            <Receipt size={24} />
                            COBRAR ONLINE
                        </button>
                    </div>
                </div>
            )}

            {isCheckoutOpen && (
                <CheckoutModal
                    cart={cart}
                    total={subtotal}
                    onClose={handleCloseCheckout}
                    onConfirm={handleCheckoutConfirm}
                />
            )}
            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 8px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #1e293b; /* slate-800 */
                    border-radius: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #334155; /* slate-700 */
                }
            `}</style>
        </div>
    );
}
