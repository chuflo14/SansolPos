import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

export const metadata: Metadata = {
    title: "Sansol",
    description: "Sistema POS para tienda Sansol",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="es">
            <body className="antialiased font-sans">
                <AuthProvider>
                    {children}
                </AuthProvider>
            </body>
        </html>
    );
}
