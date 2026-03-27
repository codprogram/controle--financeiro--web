import { months } from "./months";

export const seedItems = [
    { name: "FINANCIAMENTO", setembro: 730, outubro: 730, novembro: 730, dezembro: 756, janeiro: 756, fevereiro: 756, marco: 756, abril: 756, maio: 756, junho: 756, julho: 756, notes: "" },
    { name: "VIVO", setembro: 65, outubro: 65, novembro: 65, dezembro: 65, janeiro: 65, fevereiro: 65, marco: 65, abril: 65, maio: 65, junho: 65, julho: 65, notes: "" },
    { name: "CREDICARD", setembro: 354.38, outubro: 354.38, novembro: 354.38, dezembro: 508.87, janeiro: 1091.86, fevereiro: 1091.86, marco: 737.48, abril: 583, maio: 583, junho: 583, julho: 583, notes: "" },
    { name: "BB BLACK", setembro: 273.99, outubro: 614.47, novembro: 1056.12, dezembro: 1957.65, janeiro: 1183.37, fevereiro: 1054.05, marco: 1231, abril: 1066.45, maio: 1049.66, junho: 986.85, julho: 990.4, notes: "" },
    { name: "MERCADO PAGO", setembro: 858.32, outubro: 858.32, novembro: 0, dezembro: 0, janeiro: 0, fevereiro: 0, marco: 31.23, abril: 0, maio: 0, junho: 0, julho: 0, notes: "" },
    { name: "SAMSUNG", setembro: 427.79, outubro: 327.33, novembro: 359.61, dezembro: 581.67, janeiro: 581.67, fevereiro: 581.67, marco: 359.61, abril: 171.28, maio: 171.28, junho: 171.28, julho: 171.28, notes: "" },
    { name: "FACULDADE", setembro: 0, outubro: 0, novembro: 0, dezembro: 0, janeiro: 0, fevereiro: 128, marco: 128, abril: 128, maio: 128, junho: 128, julho: 128, notes: "" }
];

export const emptyForm = Object.freeze({
    name: "",
    notes: "",
    setembro: "",
    outubro: "",
    novembro: "",
    dezembro: "",
    janeiro: "",
    fevereiro: "",
    marco: "",
    abril: "",
    maio: "",
    junho: "",
    julho: ""
});

export function currency(value) {
    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL"
    }).format(value);
}

export function currentMonthKey() {
    const month = new Date().getMonth() + 1;
    const map = {
        9: "setembro",
        10: "outubro",
        11: "novembro",
        12: "dezembro",
        1: "janeiro",
        2: "fevereiro",
        3: "marco",
        4: "abril",
        5: "maio",
        6: "junho",
        7: "julho"
    };
    return map[month] ?? "marco";
}

export function normalizeItem(item) {
    return {
        id: item.id ?? crypto.randomUUID(),
        name: item.name ?? "",
        notes: item.notes ?? "",
        createdAt: item.createdAt ?? new Date().toISOString(),
        updatedAt: item.updatedAt ?? new Date().toISOString(),
        ...Object.fromEntries(months.map((month) => [month.key, Number(item[month.key] ?? 0)]))
    };
}

export function buildPayloadFromForm(form) {
    return normalizeItem({
        id: crypto.randomUUID(),
        name: form.name.trim(),
        notes: form.notes.trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...Object.fromEntries(months.map((month) => [month.key, Number(String(form[month.key] || "0").replace(",", ".")) || 0]))
    });
}
