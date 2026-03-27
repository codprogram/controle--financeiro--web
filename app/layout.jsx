import { Cormorant_Garamond, Source_Sans_3 } from "next/font/google";
import "./globals.css";

const displayFont = Cormorant_Garamond({
    subsets: ["latin"],
    variable: "--font-display",
    weight: ["500", "600", "700"]
});

const bodyFont = Source_Sans_3({
    subsets: ["latin"],
    variable: "--font-body",
    weight: ["400", "500", "600", "700"]
});

export const metadata = {
    title: "Controle Financeiro Marcos Filho",
    description: "Planejamento financeiro pessoal com foco mensal.",
    manifest: "/manifest.webmanifest",
    applicationName: "Controle Financeiro",
    appleWebApp: {
        capable: true,
        statusBarStyle: "default",
        title: "Controle Financeiro"
    },
    formatDetection: {
        telephone: false
    }
};

export default function RootLayout({ children }) {
    return (
        <html lang="pt-BR">
            <body className={`${displayFont.variable} ${bodyFont.variable}`}>{children}</body>
        </html>
    );
}
