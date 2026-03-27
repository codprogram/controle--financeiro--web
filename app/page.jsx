"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
    buildPayloadFromForm,
    currency,
    currentMonthKey,
    emptyForm,
    normalizeItem,
    seedItems
} from "../lib/finance";
import { months } from "../lib/months";
import { getSupabaseClient, isSupabaseConfigured } from "../lib/supabase";

const itemsStorageKey = "controle-financeiro-marcos-filho-v1";
const profileStorageKey = "controle-financeiro-profile-v2";

const emptyProfile = {
    recurringIncome: 0,
    reserveAmount: 0
};

function toDatabaseRow(item, userId) {
    return {
        id: item.id,
        user_id: userId,
        name: item.name,
        notes: item.notes,
        setembro: item.setembro,
        outubro: item.outubro,
        novembro: item.novembro,
        dezembro: item.dezembro,
        janeiro: item.janeiro,
        fevereiro: item.fevereiro,
        marco: item.marco,
        abril: item.abril,
        maio: item.maio,
        junho: item.junho,
        julho: item.julho,
        created_at: item.createdAt,
        updated_at: item.updatedAt
    };
}

function fromDatabaseRow(row) {
    return normalizeItem({
        id: row.id,
        name: row.name,
        notes: row.notes,
        setembro: row.setembro,
        outubro: row.outubro,
        novembro: row.novembro,
        dezembro: row.dezembro,
        janeiro: row.janeiro,
        fevereiro: row.fevereiro,
        marco: row.marco,
        abril: row.abril,
        maio: row.maio,
        junho: row.junho,
        julho: row.julho,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    });
}

function normalizeProfile(row) {
    return {
        recurringIncome: Number(row?.recurring_income ?? row?.recurringIncome ?? 0),
        reserveAmount: Number(row?.reserve_amount ?? row?.reserveAmount ?? 0)
    };
}

function toProfileRow(profile, userId) {
    return {
        user_id: userId,
        recurring_income: profile.recurringIncome,
        reserve_amount: profile.reserveAmount,
        updated_at: new Date().toISOString()
    };
}

function formFromItem(item) {
    return {
        name: item.name ?? "",
        notes: item.notes ?? "",
        ...Object.fromEntries(months.map((month) => [month.key, String(item[month.key] ?? "")]))
    };
}

function parseCurrencyInput(value) {
    return Number(String(value || "0").replace(",", ".")) || 0;
}

function buildVisibleMonths(currentMonth) {
    const currentIndex = months.findIndex((month) => month.key === currentMonth);
    return Array.from({ length: 6 }, (_, index) => months[(currentIndex + index) % months.length]);
}

function buildArchiveMonths(currentMonth) {
    const visibleKeys = new Set(buildVisibleMonths(currentMonth).map((month) => month.key));
    return months.filter((month) => !visibleKeys.has(month.key));
}

function buildHealthStatus(available, expenses) {
    const balance = available - expenses;
    if (available <= 0) {
        return {
            tone: "warning",
            label: "Sem base",
            description: "Defina seu ganho recorrente e a sobra acumulada."
        };
    }
    if (balance < 0) {
        return {
            tone: "danger",
            label: "Vermelho",
            description: "As faturas previstas passam do total disponivel."
        };
    }
    if (balance <= available * 0.15) {
        return {
            tone: "warning",
            label: "Amarelo",
            description: "O mes fecha positivo, mas com folga apertada."
        };
    }
    return {
        tone: "success",
        label: "Verde",
        description: "Seu saldo projetado esta confortavel neste periodo."
    };
}

export default function HomePage() {
    const [selectedMonth, setSelectedMonth] = useState(currentMonthKey);
    const [items, setItems] = useState([]);
    const [profile, setProfile] = useState(emptyProfile);
    const [profileForm, setProfileForm] = useState({
        recurringIncome: "",
        reserveAmount: ""
    });
    const [form, setForm] = useState(emptyForm);
    const [editingId, setEditingId] = useState(null);
    const [showArchive, setShowArchive] = useState(false);
    const [hydrated, setHydrated] = useState(false);
    const [syncMode, setSyncMode] = useState("local");
    const [statusMessage, setStatusMessage] = useState("Carregando seus dados...");
    const [session, setSession] = useState(null);
    const [authMode, setAuthMode] = useState("signIn");
    const [authForm, setAuthForm] = useState({ email: "", password: "" });
    const [authMessage, setAuthMessage] = useState("");
    const [authLoading, setAuthLoading] = useState(false);
    const importRef = useRef(null);
    const formRef = useRef(null);

    useEffect(() => {
        const loadLocalItems = () => {
            const raw = window.localStorage.getItem(itemsStorageKey);
            if (!raw) {
                setItems(seedItems.map(normalizeItem));
                return;
            }

            try {
                const parsed = JSON.parse(raw);
                setItems(parsed.items.map(normalizeItem));
            } catch {
                setItems(seedItems.map(normalizeItem));
            }
        };

        const loadLocalProfile = () => {
            const raw = window.localStorage.getItem(profileStorageKey);
            const normalized = raw ? normalizeProfile(JSON.parse(raw)) : emptyProfile;
            setProfile(normalized);
            setProfileForm({
                recurringIncome: String(normalized.recurringIncome || ""),
                reserveAmount: String(normalized.reserveAmount || "")
            });
        };

        const loadRemote = async (supabase, currentSession) => {
            const [{ data: itemData, error: itemError }, profileResult] = await Promise.all([
                supabase.from("planning_items").select("*").order("name", { ascending: true }),
                supabase.from("financial_profiles").select("*").eq("user_id", currentSession.user.id).maybeSingle()
            ]);

            if (itemError) {
                setStatusMessage("Falha ao carregar as categorias no Supabase.");
                setItems([]);
                loadLocalProfile();
                setHydrated(true);
                return;
            }

            if (itemData.length === 0) {
                const seeded = seedItems.map(normalizeItem);
                const insertResult = await supabase
                    .from("planning_items")
                    .insert(seeded.map((item) => toDatabaseRow(item, currentSession.user.id)));

                if (insertResult.error) {
                    setStatusMessage("Conta autenticada, mas sem permissao para semear categorias.");
                    setItems([]);
                    loadLocalProfile();
                    setHydrated(true);
                    return;
                }

                setItems(seeded);
            } else {
                setItems(itemData.map(fromDatabaseRow));
            }

            if (profileResult.error) {
                loadLocalProfile();
                setStatusMessage("Categorias sincronizadas. Base de ganhos ainda em modo local.");
            } else {
                const normalizedProfile = normalizeProfile(profileResult.data);
                setProfile(normalizedProfile);
                setProfileForm({
                    recurringIncome: String(normalizedProfile.recurringIncome || ""),
                    reserveAmount: String(normalizedProfile.reserveAmount || "")
                });
                setStatusMessage(`Painel sincronizando com Supabase para ${currentSession.user.email}.`);
            }

            setSyncMode("supabase");
            setHydrated(true);
        };

        const bootstrap = async () => {
            const supabase = getSupabaseClient();

            if (!supabase) {
                loadLocalItems();
                loadLocalProfile();
                setSyncMode("local");
                setStatusMessage("Salvando apenas neste navegador.");
                setHydrated(true);
                return;
            }

            setSyncMode("supabase");
            setStatusMessage("Supabase configurado. Entre com seu usuario.");

            const { data } = await supabase.auth.getSession();
            const currentSession = data.session;
            setSession(currentSession);

            if (currentSession) {
                await loadRemote(supabase, currentSession);
            } else {
                setItems([]);
                loadLocalProfile();
                setHydrated(true);
            }

            const { data: listener } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
                setSession(nextSession);

                if (nextSession) {
                    await loadRemote(supabase, nextSession);
                } else {
                    setItems([]);
                    loadLocalProfile();
                    setHydrated(true);
                    setStatusMessage("Supabase configurado. Entre com seu usuario.");
                }
            });

            return () => listener.subscription.unsubscribe();
        };

        let cleanup;
        bootstrap().then((result) => {
            cleanup = result;
        });

        return () => cleanup?.();
    }, []);

    useEffect(() => {
        if (!hydrated || syncMode !== "local") {
            return;
        }

        window.localStorage.setItem(
            itemsStorageKey,
            JSON.stringify({
                updatedAt: new Date().toISOString(),
                items
            })
        );
    }, [items, hydrated, syncMode]);

    useEffect(() => {
        if (!hydrated) {
            return;
        }

        window.localStorage.setItem(profileStorageKey, JSON.stringify(profile));
    }, [profile, hydrated]);

    const visibleMonths = useMemo(() => buildVisibleMonths(selectedMonth), [selectedMonth]);
    const archiveMonths = useMemo(() => buildArchiveMonths(selectedMonth), [selectedMonth]);
    const monthLabel = months.find((month) => month.key === selectedMonth)?.label ?? months[0].label;

    const monthMetrics = useMemo(() => {
        const availableBase = profile.recurringIncome + profile.reserveAmount;
        return months.map((month) => {
            const expenses = items.reduce((total, item) => total + Number(item[month.key] ?? 0), 0);
            const available = availableBase;
            const balance = available - expenses;
            const health = buildHealthStatus(available, expenses);
            return {
                ...month,
                expenses,
                available,
                balance,
                health
            };
        });
    }, [items, profile]);

    const selectedMetrics = monthMetrics.find((month) => month.key === selectedMonth) ?? monthMetrics[0];

    const rankedItems = useMemo(() => {
        return [...items].sort((left, right) => Number(right[selectedMonth] ?? 0) - Number(left[selectedMonth] ?? 0));
    }, [items, selectedMonth]);

    const onChange = (key, value) => {
        setForm((current) => ({ ...current, [key]: value }));
    };

    const onProfileChange = (key, value) => {
        setProfileForm((current) => ({ ...current, [key]: value }));
    };

    const persistItem = async (item) => {
        const supabase = getSupabaseClient();
        if (!supabase || !session) {
            return true;
        }

        const { error } = await supabase
            .from("planning_items")
            .upsert(toDatabaseRow(item, session.user.id), { onConflict: "id" });

        return !error;
    };

    const persistProfile = async (nextProfile) => {
        const supabase = getSupabaseClient();
        if (!supabase || !session) {
            return true;
        }

        const { error } = await supabase
            .from("financial_profiles")
            .upsert(toProfileRow(nextProfile, session.user.id), { onConflict: "user_id" });

        return !error;
    };

    const deleteRemoteItem = async (id) => {
        const supabase = getSupabaseClient();
        if (!supabase || !session) {
            return true;
        }

        const { error } = await supabase.from("planning_items").delete().eq("id", id);
        return !error;
    };

    const resetEditor = () => {
        setEditingId(null);
        setForm(emptyForm);
    };

    const onSubmit = async (event) => {
        event.preventDefault();

        if (!form.name.trim()) {
            return;
        }

        const base = buildPayloadFromForm(form);
        const currentItem = items.find((item) => item.id === editingId);
        const item = editingId && currentItem
            ? {
                ...base,
                id: currentItem.id,
                createdAt: currentItem.createdAt,
                updatedAt: new Date().toISOString()
            }
            : base;

        const persisted = await persistItem(item);

        if (!persisted && syncMode === "supabase") {
            window.alert("Nao foi possivel salvar a categoria no Supabase.");
            return;
        }

        setItems((current) => (
            editingId
                ? current.map((existing) => existing.id === editingId ? item : existing)
                : [...current, item]
        ));

        resetEditor();
    };

    const saveProfile = async () => {
        const nextProfile = {
            recurringIncome: parseCurrencyInput(profileForm.recurringIncome),
            reserveAmount: parseCurrencyInput(profileForm.reserveAmount)
        };
        const persisted = await persistProfile(nextProfile);

        if (!persisted && syncMode === "supabase") {
            window.alert("Nao foi possivel salvar sua base financeira no Supabase.");
            return;
        }

        setProfile(nextProfile);
    };

    const startEditing = (item) => {
        setEditingId(item.id);
        setForm(formFromItem(item));
        formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    const removeItem = async (id) => {
        const confirmed = window.confirm("Excluir esta categoria do planejamento?");
        if (!confirmed) {
            return;
        }

        const deleted = await deleteRemoteItem(id);

        if (!deleted && syncMode === "supabase") {
            window.alert("Nao foi possivel excluir no Supabase.");
            return;
        }

        setItems((current) => current.filter((item) => item.id !== id));

        if (editingId === id) {
            resetEditor();
        }
    };

    const exportBackup = () => {
        const blob = new Blob(
            [
                JSON.stringify(
                    {
                        exportedAt: new Date().toISOString(),
                        syncMode,
                        profile,
                        items
                    },
                    null,
                    2
                )
            ],
            { type: "application/json" }
        );

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `controle-financeiro-backup-${new Date().toISOString().slice(0, 10)}.json`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const importBackup = async (event) => {
        const file = event.target.files?.[0];
        if (!file) {
            return;
        }

        try {
            const text = await file.text();
            const parsed = JSON.parse(text);
            const incomingItems = (parsed.items ?? []).map(normalizeItem);
            const incomingProfile = normalizeProfile(parsed.profile ?? emptyProfile);

            if (syncMode === "supabase" && session) {
                const supabase = getSupabaseClient();
                const [itemsResult, profileResult] = await Promise.all([
                    supabase
                        .from("planning_items")
                        .upsert(incomingItems.map((item) => toDatabaseRow(item, session.user.id)), { onConflict: "id" }),
                    supabase
                        .from("financial_profiles")
                        .upsert(toProfileRow(incomingProfile, session.user.id), { onConflict: "user_id" })
                ]);

                if (itemsResult.error || profileResult.error) {
                    throw itemsResult.error || profileResult.error;
                }
            }

            const merged = [...items];
            for (const incoming of incomingItems) {
                const index = merged.findIndex((item) => item.id === incoming.id || item.name === incoming.name);
                if (index >= 0) {
                    merged[index] = incoming;
                } else {
                    merged.push(incoming);
                }
            }

            setItems(merged);
            setProfile(incomingProfile);
            setProfileForm({
                recurringIncome: String(incomingProfile.recurringIncome || ""),
                reserveAmount: String(incomingProfile.reserveAmount || "")
            });
            window.alert("Backup restaurado.");
        } catch {
            window.alert("Nao foi possivel restaurar o backup.");
        } finally {
            event.target.value = "";
        }
    };

    const submitAuth = async (event) => {
        event.preventDefault();

        const supabase = getSupabaseClient();
        if (!supabase) {
            return;
        }

        setAuthLoading(true);
        setAuthMessage("");

        try {
            if (authMode === "signUp") {
                const { error } = await supabase.auth.signUp({
                    email: authForm.email.trim(),
                    password: authForm.password
                });

                if (error) {
                    throw error;
                }

                setAuthMessage("Conta criada. Se o Supabase pedir confirmacao por email, conclua antes de entrar.");
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email: authForm.email.trim(),
                    password: authForm.password
                });

                if (error) {
                    throw error;
                }

                setAuthMessage("Login realizado.");
            }
        } catch (error) {
            setAuthMessage(error.message || "Nao foi possivel autenticar.");
        } finally {
            setAuthLoading(false);
        }
    };

    const signOut = async () => {
        const supabase = getSupabaseClient();
        if (!supabase) {
            return;
        }

        await supabase.auth.signOut();
        setAuthMessage("");
        setAuthForm({ email: "", password: "" });
    };

    if (isSupabaseConfigured() && hydrated && !session) {
        return (
            <main className="page-shell auth-shell">
                <section className="auth-card">
                    <div className="auth-copy">
                        <p className="eyebrow">Acesso privado</p>
                        <h1>Entre para carregar apenas os seus dados financeiros.</h1>
                        <p className="hero-copy">
                            Esta versao usa Supabase com regras por usuario. Cada conta e cada panorama ficam isolados pelo seu login.
                        </p>
                    </div>

                    <form className="entry-form auth-form" onSubmit={submitAuth}>
                        <input
                            type="email"
                            placeholder="Seu email"
                            value={authForm.email}
                            onChange={(event) => setAuthForm((current) => ({ ...current, email: event.target.value }))}
                        />
                        <input
                            type="password"
                            placeholder="Sua senha"
                            value={authForm.password}
                            onChange={(event) => setAuthForm((current) => ({ ...current, password: event.target.value }))}
                        />
                        <button className="primary-button" type="submit" disabled={authLoading}>
                            {authLoading ? "Processando..." : authMode === "signUp" ? "Criar conta" : "Entrar"}
                        </button>
                        <button
                            className="secondary-button"
                            type="button"
                            onClick={() => setAuthMode((current) => current === "signUp" ? "signIn" : "signUp")}
                        >
                            {authMode === "signUp" ? "Ja tenho conta" : "Quero criar conta"}
                        </button>
                        <p className="auth-message">{authMessage || statusMessage}</p>
                    </form>
                </section>
            </main>
        );
    }

    return (
        <main className="page-shell dark-shell">
            <section className="hero-card hero-dark">
                <div className="hero-copy-block">
                    <p className="eyebrow">Panorama financeiro</p>
                    <h1>Seu ganho entra uma vez. O sistema projeta o resto dos meses sozinho.</h1>
                    <p className="hero-copy">
                        O calculo principal agora usa duas bases fixas: ganho recorrente e sobra acumulada. O painel cruza isso
                        com as faturas e mostra onde o horizonte esta verde, amarelo ou vermelho.
                    </p>
                </div>
                <div className="hero-actions">
                    <div className="sync-badge dark-badge">
                        <span>{syncMode === "supabase" ? "Supabase ativo" : "Modo local"}</span>
                        <strong>{statusMessage}</strong>
                        {session?.user?.email ? <small>{session.user.email}</small> : null}
                    </div>
                    <div className="hero-metrics dark-metrics">
                        <div>
                            <span>Mes foco</span>
                            <strong>{monthLabel}</strong>
                        </div>
                        <div>
                            <span>Status</span>
                            <strong>{selectedMetrics?.health.label ?? "Sem leitura"}</strong>
                        </div>
                    </div>
                    <button className="primary-button" onClick={exportBackup}>Exportar backup</button>
                    <button className="secondary-button dark-button" onClick={() => importRef.current?.click()}>Restaurar backup</button>
                    {syncMode === "supabase" ? <button className="secondary-button dark-button" onClick={signOut}>Sair</button> : null}
                    <input ref={importRef} className="hidden-input" type="file" accept="application/json" onChange={importBackup} />
                </div>
            </section>

            <section className="forecast-strip">
                {visibleMonths.map((month) => {
                    const metrics = monthMetrics.find((entry) => entry.key === month.key);
                    return (
                        <button
                            key={month.key}
                            className={month.key === selectedMonth ? `forecast-card active ${metrics.health.tone}` : `forecast-card ${metrics.health.tone}`}
                            onClick={() => setSelectedMonth(month.key)}
                        >
                            <div className="forecast-header">
                                <span>{month.shortLabel}</span>
                                <strong>{month.label}</strong>
                            </div>
                            <div className="status-chip">{metrics.health.label}</div>
                            <div className="forecast-values">
                                <small>Disponivel {currency(metrics.available)}</small>
                                <small>Faturas {currency(metrics.expenses)}</small>
                                <strong>{currency(metrics.balance)}</strong>
                            </div>
                        </button>
                    );
                })}
            </section>

            <section className="summary-grid">
                <article className="summary-card focus-card">
                    <p>Saldo projetado de {monthLabel}</p>
                    <h2>{currency(selectedMetrics?.balance ?? 0)}</h2>
                    <span>{selectedMetrics?.health.description ?? "Sem leitura."}</span>
                </article>
                <article className="summary-card dark-card">
                    <p>Ganho recorrente</p>
                    <h2>{currency(profile.recurringIncome)}</h2>
                    <span>Base fixa usada em todos os meses</span>
                </article>
                <article className="summary-card dark-card">
                    <p>Sobra acumulada</p>
                    <h2>{currency(profile.reserveAmount)}</h2>
                    <span>Reserva adicionada ao ganho base</span>
                </article>
                <article className={`summary-card status-card ${selectedMetrics?.health.tone ?? ""}`}>
                    <p>Panorama</p>
                    <h2>{selectedMetrics?.health.label ?? "Sem base"}</h2>
                    <span>{selectedMetrics?.health.description ?? "Defina a base mensal."}</span>
                </article>
            </section>

            <section className="editor-grid three-columns">
                <article className="panel income-panel dark-panel">
                    <div className="panel-header">
                        <div>
                            <p className="eyebrow">Base do calculo</p>
                            <h3>Ganhos e reserva</h3>
                        </div>
                    </div>
                    <div className="income-helper">
                        Preencha uma vez seu ganho recorrente mensal. Se houver um valor sobrando em caixa, coloque em reserva
                        e ele sera somado ao calculo do panorama.
                    </div>
                    <div className="static-income-grid">
                        <label className="income-cell active">
                            <span>Ganho recorrente</span>
                            <input
                                value={profileForm.recurringIncome}
                                onChange={(event) => onProfileChange("recurringIncome", event.target.value)}
                                placeholder="0,00"
                                inputMode="decimal"
                            />
                        </label>
                        <label className="income-cell">
                            <span>Sobra acumulada</span>
                            <input
                                value={profileForm.reserveAmount}
                                onChange={(event) => onProfileChange("reserveAmount", event.target.value)}
                                placeholder="0,00"
                                inputMode="decimal"
                            />
                        </label>
                    </div>
                    <button className="primary-button" type="button" onClick={saveProfile}>
                        Salvar base financeira
                    </button>
                </article>

                <article className="panel chart-panel dark-panel">
                    <div className="panel-header">
                        <div>
                            <p className="eyebrow">Horizonte principal</p>
                            <h3>6 meses relevantes</h3>
                        </div>
                    </div>
                    <div className="bars">
                        {visibleMonths.map((month) => {
                            const metrics = monthMetrics.find((entry) => entry.key === month.key);
                            const max = Math.max(...visibleMonths.map((entry) => {
                                const current = monthMetrics.find((row) => row.key === entry.key);
                                return Math.max(current.available, current.expenses, Math.abs(current.balance));
                            }), 1);
                            return (
                                <div key={month.key} className="bar-row">
                                    <div className="bar-copy">
                                        <strong>{month.label}</strong>
                                        <span>{metrics.health.label}</span>
                                    </div>
                                    <div className="dual-bar-stack">
                                        <div className="dual-bar-label">Disponivel</div>
                                        <div className="bar-track">
                                            <div className="bar-fill success" style={{ width: `${Math.max(4, (metrics.available / max) * 100)}%` }} />
                                        </div>
                                        <div className="dual-bar-label">Faturas</div>
                                        <div className="bar-track">
                                            <div className="bar-fill warning" style={{ width: `${Math.max(4, (metrics.expenses / max) * 100)}%` }} />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </article>

                <article className="panel editor-panel dark-panel" ref={formRef}>
                    <div className="panel-header">
                        <div>
                            <p className="eyebrow">{editingId ? "Edicao" : "Novo cadastro"}</p>
                            <h3>{editingId ? "Editar categoria" : "Adicionar categoria"}</h3>
                        </div>
                        {editingId ? (
                            <button className="ghost-button dark-button" type="button" onClick={resetEditor}>
                                Cancelar edicao
                            </button>
                        ) : null}
                    </div>
                    <form className="entry-form" onSubmit={onSubmit}>
                        <div className="form-lead">
                            <input value={form.name} onChange={(event) => onChange("name", event.target.value)} placeholder="Nome da categoria ou fatura" />
                            <textarea value={form.notes} onChange={(event) => onChange("notes", event.target.value)} placeholder="Observacoes" rows={3} />
                        </div>
                        <div className="month-input-grid">
                            {months.map((month) => (
                                <label key={month.key}>
                                    <span>{month.shortLabel}</span>
                                    <input
                                        value={form[month.key]}
                                        onChange={(event) => onChange(month.key, event.target.value)}
                                        placeholder="0,00"
                                        inputMode="decimal"
                                    />
                                </label>
                            ))}
                        </div>
                        <button className="primary-button" type="submit">
                            {editingId ? "Salvar alteracoes" : "Salvar categoria"}
                        </button>
                    </form>
                </article>
            </section>

            <section className="panel accounts-panel dark-panel">
                <div className="panel-header">
                    <div>
                        <p className="eyebrow">Categorias e faturas</p>
                        <h3>Valores por mes em {monthLabel}</h3>
                    </div>
                    <span className="panel-count">{rankedItems.length} categorias</span>
                </div>

                <div className="table-list">
                    {rankedItems.map((item) => (
                        <article key={item.id} className={editingId === item.id ? "table-row editing" : "table-row"}>
                            <div className="row-main">
                                <div>
                                    <strong>{item.name}</strong>
                                    <p>{item.notes || "Sem observacoes"}</p>
                                </div>
                                <div className="row-amounts">
                                    <strong>{currency(Number(item[selectedMonth] ?? 0))}</strong>
                                    <span>Total anual {currency(months.reduce((total, month) => total + Number(item[month.key] ?? 0), 0))}</span>
                                </div>
                            </div>
                            <div className="row-months">
                                {months.map((month) => (
                                    <div key={month.key} className={month.key === selectedMonth ? "mini-cell active" : "mini-cell"}>
                                        <span>{month.shortLabel}</span>
                                        <strong>{currency(Number(item[month.key] ?? 0))}</strong>
                                    </div>
                                ))}
                            </div>
                            <div className="row-actions">
                                <button className="secondary-button dark-button slim-button" onClick={() => startEditing(item)}>Editar</button>
                                <button className="danger-button" onClick={() => removeItem(item.id)}>Excluir</button>
                            </div>
                        </article>
                    ))}
                </div>
            </section>

            <section className="panel archive-panel dark-panel">
                <button className="archive-toggle" onClick={() => setShowArchive((current) => !current)}>
                    <span>Meses antigos ou fora do foco principal</span>
                    <strong>{showArchive ? "Ocultar" : "Mostrar"}</strong>
                </button>

                {showArchive ? (
                    <div className="archive-grid">
                        {archiveMonths.map((month) => {
                            const metrics = monthMetrics.find((entry) => entry.key === month.key);
                            return (
                                <div key={month.key} className={`archive-card ${metrics.health.tone}`}>
                                    <div>
                                        <span>{month.label}</span>
                                        <strong>{metrics.health.label}</strong>
                                    </div>
                                    <small>Disponivel {currency(metrics.available)}</small>
                                    <small>Faturas {currency(metrics.expenses)}</small>
                                    <strong>{currency(metrics.balance)}</strong>
                                </div>
                            );
                        })}
                    </div>
                ) : null}
            </section>
        </main>
    );
}
