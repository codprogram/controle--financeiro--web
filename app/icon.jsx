import { ImageResponse } from "next/og";

export const size = {
    width: 512,
    height: 512
};

export const contentType = "image/png";

export default function Icon() {
    return new ImageResponse(
        (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    padding: 48,
                    background: "linear-gradient(135deg, #0f766e, #14b8a6 58%, #f3efe7)",
                    color: "#ffffff",
                    fontFamily: "Georgia"
                }}
            >
                <div
                    style={{
                        width: 112,
                        height: 112,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: 999,
                        background: "rgba(255,255,255,0.18)",
                        fontSize: 62
                    }}
                >
                    R$
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ fontSize: 52, fontWeight: 700, lineHeight: 1 }}>Controle</div>
                    <div style={{ fontSize: 52, fontWeight: 700, lineHeight: 1 }}>Financeiro</div>
                    <div style={{ fontSize: 24, opacity: 0.88 }}>Planejamento mensal pessoal</div>
                </div>
            </div>
        ),
        size
    );
}
