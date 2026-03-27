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

const storageKey = "controle-financeiro-marcos-filho-v1";

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

function formFromItem(item) {
    return {
        name: item.name ?? "",
        notes: item.notes ?? "",
        ...Object.fromEntries(months.map((month) => [month.key, String(item[month.key] ?? "")]))
    };
}

export default function HomePage() {
    const [selectedMonth, setSelectedMonth] = useState(currentMonthKey);
    const [items, setItems] = useState([]);
    const [form, setForm] = useState(emptyForm);
    const [editingId, setEditingId] = useState(null);
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
        const loadLocal = () => {
            const raw = window.localStorage.getItem(storageKey);
            if (!raw) {
                setItems(seedItems.map(normalizeItem));
                setSyncMode("local");
                setStatusMessage("Salvando apenas neste navegador.");
                setHydrated(true);
                return;
            }

            try {
                const parsed = JSON.parse(raw);
                setItems(parsed.items.map(normalizeItem));
            } catch {
                setItems(seedItems.map(normalizeItem));
            }

            setSyncMode("local");
            setStatusMessage("Salvando apenas neste navegador.");
            setHydrated(true);
        };

        const loadRemote = async (supabase, currentSession) => {
            const { data, error } = await supabase
                .from("planning_items")
                .select("*")
                .order("name", { ascending: true });

            if (error) {
                setStatusMessage("Falha ao carregar os dados do Supabase.");
                setItems([]);
                setHydrated(true);
                return;
            }

            if (data.length === 0) {
                const seeded = seedItems.map(normalizeItem);
                const insertResult = await supabase
                    .from("planning_items")
                    .insert(seeded.map((item) => toDatabaseRow(item, currentSession.user.id)));

                if (insertResult.error) {
                    setStatusMessage("Conta autenticada, mas sem permissao para semear dados.");
                    setItems([]);
                    setHydrated(true);
                    return;
                }

                setItems(seeded);
            } else {
                setItems(data.map(fromDatabaseRow));
            }

            setSyncMode("supabase");
            setStatusMessage(`Sincronizando com Supabase para ${currentSession.user.email}.`);
            setHydrated(true);
        };

        const bootstrap = async () => {
            const supabase = getSupabaseClient();

            if (!supabase) {
                loadLocal();
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
                setHydrated(true);
            }

            const { data: listener } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
                setSession(nextSession);

                if (nextSession) {
                    await loadRemote(supabase, nextSession);
                } else {
                    setItems([]);
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
            storageKey,
            JSON.stringify({
                updatedAt: new Date().toISOString(),
                items
            })
        );
    }, [items, hydrated, syncMode]);

    const monthLabel = months.find((month) => month.key === selectedMonth)?.label ?? "Marco";

    const summary = useMemo(() => {
        const selectedMonthTotal = items.reduce((total, item) => total + Number(item[selectedMonth] ?? 0), 0);
        const grandTotal = items.reduce((total, item) => {
            return total + months.reduce((monthTotal, month) => monthTotal + Number(item[month.key] ?? 0), 0);
        }, 0);
        const sorted = [...items].sort((left, right) => Number(right[selectedMonth] ?? 0) - Number(left[selectedMonth] ?? 0));
        const aboveAverage = items.filter((item) => Number(item[selectedMonth] ?? 0) > selectedMonthTotal / Math.max(items.length, 1)).length;
        return {
            selectedMonthTotal,
            grandTotal,
            average: grandTotal / months.length,
            highestName: sorted[0]?.name ?? "Sem contas",
            highestValue: Number(sorted[0]?.[selectedMonth] ?? 0),
            aboveAverage
        };
    }, [items, selectedMonth]);

    const monthTotals = useMemo(() => {
        return months.map((month) => ({
            ...month,
            total: items.reduce((total, item) => total + Number(item[month.key] ?? 0), 0)
        }));
    }, [items]);

    const rankedItems = useMemo(() => {
        return [...items].sort((left, right) => Number(right[selectedMonth] ?? 0) - Number(left[selectedMonth] ?? 0));
    }, [items, selectedMonth]);

    const onChange = (key, value) => {
        setForm((current) => ({ ...current, [key]: value }));
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
            window.alert("Nao foi possivel salvar no Supabase.");
            return;
        }

        setItems((current) => (
            editingId
                ? current.map((existing) => existing.id === editingId ? item : existing)
                : [...current, item]
        ));

        resetEditor();
    };

    const startEditing = (item) => {
        setEditingId(item.id);
        setForm(formFromItem(item));
        formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    const removeItem = async (id) => {
        const confirmed = window.confirm("Excluir esta conta do planejamento?");
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

            if (syncMode === "supabase" && session) {
                const supabase = getSupabaseClient();
                const { error } = await supabase
                    .from("planning_items")
                    .upsert(incomingItems.map((item) => toDatabaseRow(item, session.user.id)), { onConflict: "id" });

                if (error) {
                    throw error;
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
                            Esta versao usa Supabase com regras por usuario. Cada conta fica isolada pelo seu login.
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
        <main className="page-shell">
            <section className="hero-card">
                <div className="hero-copy-block">
                    <p className="eyebrow">Controle financeiro pessoal</p>
                    <h1>Planejamento mensal com cara de painel executivo e operacao simples no dia a dia.</h1>
                    <p className="hero-copy">
                        A estrutura segue a sua planilha, mas com sincronizacao web, backup e leitura mais clara para
                        decidir rapido onde o mes esta pesando.
                    </p>
                </div>
                <div className="hero-actions">
                    <div className="sync-badge">
                        <span>{syncMode === "supabase" ? "Supabase ativo" : "Modo local"}</span>
                        <strong>{statusMessage}</strong>
                        {session?.user?.email ? <small>{session.user.email}</small> : null}
                    </div>
                    <div className="hero-metrics">
                        <div>
                            <span>Mes selecionado</span>
                            <strong>{monthLabel}</strong>
                        </div>
                        <div>
                            <span>Contas acima da media</span>
                            <strong>{summary.aboveAverage}</strong>
                        </div>
                    </div>
                    <button className="primary-button" onClick={exportBackup}>Exportar backup</button>
                    <button className="secondary-button" onClick={() => importRef.current?.click()}>Restaurar backup</button>
                    {syncMode === "supabase" ? <button className="secondary-button" onClick={signOut}>Sair</button> : null}
                    <input ref={importRef} className="hidden-input" type="file" accept="application/json" onChange={importBackup} />
                </div>
            </section>

            <section className="month-strip">
                {months.map((month) => (
                    <button
                        key={month.key}
                        className={month.key === selectedMonth ? "month-pill active" : "month-pill"}
                        onClick={() => setSelectedMonth(month.key)}
                    >
                        <span>{month.shortLabel}</span>
                        <strong>{month.label}</strong>
                    </button>
                ))}
            </section>

            <section className="summary-grid">
                <article className="summary-card focus-card">
                    <p>Total de {monthLabel}</p>
                    <h2>{currency(summary.selectedMonthTotal)}</h2>
                    <span>Panorama principal do periodo escolhido</span>
                </article>
                <article className="summary-card">
                    <p>Total geral</p>
                    <h2>{currency(summary.grandTotal)}</h2>
                    <span>Acumulado de setembro a julho</span>
                </article>
                <article className="summary-card">
                    <p>Media mensal</p>
                    <h2>{currency(summary.average)}</h2>
                    <span>Leitura media da base inteira</span>
                </article>
                <article className="summary-card">
                    <p>Maior peso no mes</p>
                    <h2>{summary.highestName}</h2>
                    <span>{currency(summary.highestValue)}</span>
                </article>
            </section>

            <section className="editor-grid">
                <article className="panel chart-panel">
                    <div className="panel-header">
                        <div>
                            <p className="eyebrow">Comparativo</p>
                            <h3>Totais por mes</h3>
                        </div>
                    </div>
                    <div className="bars">
                        {monthTotals.map((month) => {
                            const max = Math.max(...monthTotals.map((entry) => entry.total), 1);
                            const width = `${Math.max(6, (month.total / max) * 100)}%`;
                            return (
                                <div key={month.key} className="bar-row">
                                    <div className="bar-copy">
                                        <strong>{month.label}</strong>
                                        <span>{currency(month.total)}</span>
                                    </div>
                                    <div className="bar-track">
                                        <div className={month.key === selectedMonth ? "bar-fill active" : "bar-fill"} style={{ width }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </article>

                <article className="panel editor-panel" ref={formRef}>
                    <div className="panel-header">
                        <div>
                            <p className="eyebrow">{editingId ? "Edicao" : "Novo cadastro"}</p>
                            <h3>{editingId ? "Editar conta" : "Adicionar conta"}</h3>
                        </div>
                        {editingId ? (
                            <button className="ghost-button" type="button" onClick={resetEditor}>
                                Cancelar edicao
                            </button>
                        ) : null}
                    </div>
                    <form className="entry-form" onSubmit={onSubmit}>
                        <div className="form-lead">
                            <input value={form.name} onChange={(event) => onChange("name", event.target.value)} placeholder="Nome da conta" />
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
                            {editingId ? "Salvar alteracoes" : "Salvar conta"}
                        </button>
                    </form>
                </article>
            </section>

            <section className="panel accounts-panel">
                <div className="panel-header">
                    <div>
                        <p className="eyebrow">Leitura mensal</p>
                        <h3>Contas em {monthLabel}</h3>
                    </div>
                    <span className="panel-count">{rankedItems.length} contas</span>
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
                                <button className="secondary-button slim-button" onClick={() => startEditing(item)}>Editar</button>
                                <button className="danger-button" onClick={() => removeItem(item.id)}>Excluir</button>
                            </div>
                        </article>
                    ))}
                </div>
            </section>
        </main>
    );
}
