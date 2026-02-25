import { Sidebar } from '@/components/shared/Sidebar';
import { ReactNode } from 'react';

export default function AppLayout({ children }: { children: ReactNode }) {
    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden relative">
            <Sidebar />
            <main className="flex-1 h-screen overflow-hidden pl-16">
                {children}
            </main>
        </div>
    );
}
