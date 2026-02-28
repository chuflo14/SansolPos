'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { ShoppingCart, Search, Receipt, Loader2, Image as ImageIcon, Trash2, LogOut } from 'lucide-react';
import { CheckoutModal } from '@/components/pos/CheckoutModal';
import { CashOpenModal } from '@/components/pos/CashOpenModal';
import { CashCloseModal } from '@/components/pos/CashCloseModal';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Product } from '@/components/products/ProductModal';

export default function POSPage() {
    const { storeId } = useAuth();
    // FASE2: supabase como singleton — no re-instanciar en cada render
    const supabase = useMemo(() => createClient(), []);

    // Cash session
    const [cashSessionId, setCashSessionId] = useState<string | null>(null);
    const [openingAmount, setOpeningAmount] = useState(0);
    const [showOpenModal, setShowOpenModal] = useState(false);
    const [showCloseModal, setShowCloseModal] = useState(false);
    const [sessionLoading, setSessionLoading] = useState(true);

    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');  // FASE2: debounce
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

    const saleConfirmedCart = useRef<{ product: Product; quantity: number }[] | null>(null);
    // FASE2: debounce del buscador — espera 250ms antes de filtrar
    const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const handleSearchChange = useCallback((value: string) => {
        setSearchTerm(value);
        if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
        searchDebounceRef.current = setTimeout(() => setDebouncedSearch(value), 250);
    }, []);

    // Check for active cash session on mount
    useEffect(() => {
        const checkSession = async () => {
            if (!storeId) return;
            // FASE1 fix: usar timezone Argentina (UTC-3) para evitar detectar sesión incorrecta
            const now = new Date();
            const argOffset = -3 * 60 * 60 * 1000; // UTC-3 en ms
            const argNow = new Date(now.getTime() + argOffset);
            const today = argNow.toISOString().slice(0, 10);

            const { data } = await supabase
                .from('cash_sessions')
                .select('id, opening_amount')
                .eq('store_id', storeId)
                .eq('status', 'OPEN')
                .gte('opened_at', `${today}T00:00:00.000-03:00`)
                .order('opened_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (data) {
                setCashSessionId(data.id);
                setOpeningAmount(data.opening_amount);
            } else {
                setShowOpenModal(true);
            }
            setSessionLoading(false);
        };
        checkSession();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [storeId]);


    const fetchProducts = useCallback(async () => {
        if (!storeId) return;
        setIsLoading(true);
        // FASE4: SELECT solo campos necesarios — reduce payload
        const { data, error } = await supabase
            .from('products')
            .select('id, name, sku, barcode, category, current_stock, min_stock, cost_price, sale_price, photo_url')
            .eq('store_id', storeId)
            .order('name');

        if (!error && data) {
            setProducts(data as Product[]);
        }
        setIsLoading(false);
    }, [storeId, supabase]);


    useEffect(() => {
        if (storeId) fetchProducts();
    }, [storeId, fetchProducts]);

    const categories = useMemo(() => {
        const uniqueCategories = new Set(products.map(p => p.category).filter(Boolean));
        return Array.from(uniqueCategories).sort();
    }, [products]);

    // Apply sold quantities locally to avoid a full refetch (no loading flash)
    const applyStockLocally = useCallback((soldCart: { product: Product; quantity: number }[]) => {
        setProducts(prev => prev.map(p => {
            const sold = soldCart.find(c => c.product.id === p.id);
            if (!sold) return p;
            return { ...p, current_stock: Math.max(0, p.current_stock - sold.quantity) };
        }));
    }, []);

    const handleCheckoutConfirm = () => {
        // Save the cart before it gets cleared, so we can apply stock locally
        saleConfirmedCart.current = cart;
    };

    const handleCloseCheckout = () => {
        setIsCheckoutOpen(false);
        setSearchTerm('');

        if (saleConfirmedCart.current) {
            // Update stock locally — instant, no spinner
            applyStockLocally(saleConfirmedCart.current);
            saleConfirmedCart.current = null;
        }

        setCart([]); // Reset cart for the next sale
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

    // FASE2: useMemo para no recalcular en cada re-render
    const filteredProducts = useMemo(() => products.filter((p) => {
        const matchesSearch = !debouncedSearch ||
            p.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
            (p.sku && p.sku.toLowerCase().includes(debouncedSearch.toLowerCase()));
        const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
        return matchesSearch && matchesCategory;
    }), [products, debouncedSearch, selectedCategory]);

    const subtotal = cart.reduce((acc, item) => acc + item.product.sale_price * item.quantity, 0);

    return (
        <div className="flex h-full bg-slate-950 font-sans custom-scrollbar text-slate-200">
            {/* Cash session modals */}
            {!sessionLoading && showOpenModal && (
                <CashOpenModal
                    onSessionOpened={(id, amount) => {
                        setCashSessionId(id);
                        setOpeningAmount(amount);
                        setShowOpenModal(false);
                    }}
                />
            )}
            {showCloseModal && cashSessionId && (
                <CashCloseModal
                    sessionId={cashSessionId}
                    openingAmount={openingAmount}
                    onSessionClosed={() => {
                        setCashSessionId(null);
                        setShowCloseModal(false);
                        setShowOpenModal(true);
                    }}
                    onCancel={() => setShowCloseModal(false)}
                />
            )}
            {/* Products Section */}
            <div className="flex-1 p-6 lg:p-8 flex flex-col h-full overflow-hidden">
                <div className="flex flex-col sm:flex-row gap-3 mb-8">
                    {/* Search */}
                    <div className="relative flex-1">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" size={24} />
                        <input
                            type="text"
                            placeholder="Buscar producto..."
                            className="w-full pl-14 pr-6 py-4 rounded-2xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-lg text-lg font-medium transition-all"
                            value={searchTerm}
                            onChange={(e) => handleSearchChange(e.target.value)}
                        />
                    </div>

                    {/* Category Dropdown */}
                    <div className="w-full sm:w-52 shrink-0 relative">
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="w-full h-full min-h-[60px] px-5 py-4 rounded-2xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-lg text-base font-medium transition-all appearance-none cursor-pointer"
                        >
                            <option value="all">Todas las categorías</option>
                            {categories.map(category => (
                                <option key={category} value={category}>{category}</option>
                            ))}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                        </div>
                    </div>

                    {/* Cerrar Caja */}
                    {cashSessionId && (
                        <button
                            onClick={() => setShowCloseModal(true)}
                            className="shrink-0 flex items-center gap-2 px-5 py-4 rounded-2xl bg-slate-900 border border-slate-800 hover:bg-orange-500/10 hover:border-orange-500/40 text-slate-400 hover:text-orange-400 font-bold text-sm shadow-lg transition-all whitespace-nowrap"
                            title="Cerrar Caja"
                        >
                            <LogOut size={18} />
                            <span className="hidden lg:inline">Cerrar Caja</span>
                        </button>
                    )}
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
                            <div key={item.product.id} className="flex items-center gap-4 p-4 rounded-2xl border border-slate-800 bg-slate-950/50 shadow-sm transition-colors hover:border-slate-700">
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
                                        <div className="flex items-center gap-3">
                                            <span className="text-base font-black text-white">${(item.product.sale_price * item.quantity).toLocaleString('es-AR')}</span>
                                            <button
                                                onClick={() => removeFromCart(item.product.id)}
                                                className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-colors shadow-sm"
                                                title="Eliminar producto"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
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
                            disabled={!cashSessionId}
                            className={`w-full py-5 rounded-2xl font-black text-xl shadow-xl flex items-center justify-center gap-4 transition-all border ${cashSessionId
                                ? 'bg-primary text-white shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] hover:shadow-primary/40 border-blue-500/50'
                                : 'bg-slate-800 text-slate-600 border-slate-700 cursor-not-allowed'
                                }`}
                            title={!cashSessionId ? 'Abrí la caja primero' : undefined}
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
                    cashSessionId={cashSessionId ?? undefined}
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
