import "./globals.css";

export const metadata = {
    title: "Controle Financeiro Marcos Filho",
    description: "Planejamento financeiro pessoal com foco mensal."
};

export default function RootLayout({ children }) {
    return (
        <html lang="pt-BR">
            <body>{children}</body>
        </html>
    );
}
