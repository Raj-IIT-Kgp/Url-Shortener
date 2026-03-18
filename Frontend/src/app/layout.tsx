import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
    subsets: ["latin"],
    variable: "--font-sans",
});

export const metadata: Metadata = {
    title: "Snip — Lightning-Fast URL Shortener",
    description: "Shorten your URLs instantly with powerful analytics and blazing-fast redirects.",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className="dark">
            <body className={`${inter.variable} antialiased min-h-screen`}>
                {/* Ambient background glow */}
                <div className="fixed inset-0 -z-10 overflow-hidden">
                    <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-[var(--color-primary)] opacity-[0.03] blur-[120px]" />
                    <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-[var(--color-accent)] opacity-[0.03] blur-[120px]" />
                </div>
                {children}
            </body>
        </html>
    );
}
