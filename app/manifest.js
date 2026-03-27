export default function manifest() {
    return {
        name: "Controle Financeiro Marcos Filho",
        short_name: "Controle",
        description: "Planejamento financeiro pessoal com foco mensal.",
        start_url: "/",
        display: "standalone",
        background_color: "#f3efe7",
        theme_color: "#0f766e",
        lang: "pt-BR",
        orientation: "portrait",
        icons: [
            {
                src: "/icon?size=192",
                sizes: "192x192",
                type: "image/png"
            },
            {
                src: "/icon?size=512",
                sizes: "512x512",
                type: "image/png"
            },
            {
                src: "/apple-icon?size=180",
                sizes: "180x180",
                type: "image/png"
            }
        ]
    };
}
