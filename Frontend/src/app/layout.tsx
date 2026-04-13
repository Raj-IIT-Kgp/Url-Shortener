import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ToastProvider } from '@/components/Toast';
import { ThemeToggle } from '@/components/ThemeToggle';
import { AuthProvider } from '@/components/AuthProvider';
import { Header } from '@/components/Header';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
    title: 'Snip | Modern URL Shortener',
    description: 'A beautiful, fast, and secure URL shortener.',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <head>
                <link rel="icon" href="/favicon.ico" sizes="any" />
                <link
                    rel="icon"
                    href="/icon?<generated>"
                    type="image/<generated>"
                    sizes="<generated>"
                />
                <link
                    rel="apple-touch-icon"
                    href="/apple-icon?<generated>"
                    type="image/<generated>"
                    sizes="<generated>"
                />
            </head>
            <body
                className={`${inter.className} min-h-screen selection:bg-indigo-500/30 transition-colors duration-300`}
            >
                <ToastProvider>
                    <AuthProvider>
                        <Header />
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
                            {children}
                        </div>
                    </AuthProvider>
                </ToastProvider>
            </body>
        </html>
    );
}
