'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ShoppingCart, Package, ReceiptText, Settings, LogOut, Users, ClipboardList, ArrowLeftRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export function Sidebar() {
    const pathname = usePathname();
    const { user, userRole, signOut } = useAuth();

    const allNavItems = [
        { name: 'POS (Caja)', href: '/pos', icon: ShoppingCart },
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { name: 'Ventas', href: '/ventas', icon: ClipboardList, adminOnly: true },
        { name: 'Transferencias', href: '/transferencias', icon: ArrowLeftRight },
        { name: 'Clientes', href: '/clientes', icon: Users },
        { name: 'Productos', href: '/products', icon: Package },
        { name: 'Gastos', href: '/expenses', icon: ReceiptText },
        { name: 'Configuración', href: '/settings', icon: Settings },
    ];

    const navItems = allNavItems.filter(item => {
        if (userRole === 'admin') return true;
        // Cashier role only sees POS and Expenses
        if ((item as { adminOnly?: boolean }).adminOnly) return false;
        return ['POS (Caja)', 'Gastos'].includes(item.name);
    });

    return (
        <div className="absolute top-0 left-0 h-screen bg-slate-900 text-white flex flex-col z-50 w-16 hover:w-64 transition-all duration-300 ease-in-out group overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center h-[73px] shrink-0">
                {/* Collapsed Icon state */}
                <div className="w-8 flex items-center justify-center shrink-0 group-hover:hidden">
                    <span className="text-xl font-bold text-primary">S</span>
                </div>
                {/* Expanded state */}
                <div className="hidden group-hover:flex flex-col whitespace-nowrap overflow-hidden">
                    <h2 className="text-2xl font-bold text-primary">Sansol</h2>
                    <p className="text-xs text-slate-400 mt-1 truncate max-w-[180px]" title={user?.email || 'Terminal Multi-tienda'}>
                        {user?.email || 'Terminal Multi-tienda'}
                    </p>
                </div>
            </div>

            <nav className="flex-1 py-4 overflow-hidden">
                <ul className="space-y-1">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <li key={item.name}>
                                <Link
                                    href={item.href}
                                    className={`flex items-center px-5 py-3 transition-colors ${isActive
                                        ? 'bg-primary border-r-4 border-blue-400'
                                        : 'hover:bg-slate-800 border-r-4 border-transparent'
                                        }`}
                                    title={item.name}
                                >
                                    <div className="w-6 flex justify-center shrink-0">
                                        <item.icon size={22} className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'} />
                                    </div>
                                    <span className="ml-4 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                        {item.name}
                                    </span>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            <div className="p-3 border-t border-slate-800 shrink-0">
                <button
                    onClick={() => signOut()}
                    className="flex items-center px-2 py-3 w-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors rounded-md"
                    title="Cerrar Sesión"
                >
                    <div className="w-6 flex justify-center shrink-0 ml-1">
                        <LogOut size={22} />
                    </div>
                    <span className="ml-4 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        Cerrar Sesión
                    </span>
                </button>
            </div>
        </div>
    );
}
