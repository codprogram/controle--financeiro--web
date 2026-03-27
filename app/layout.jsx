import "./globals.css";

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
            <body>{children}</body>
        </html>
    );
}
