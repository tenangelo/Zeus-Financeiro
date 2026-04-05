"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatCurrency } from "@zeus/shared";

type TransactionType = "revenue" | "expense";
type TransactionStatus = "pending" | "confirmed" | "cancelled";
type Frequency = "weekly" | "biweekly" | "monthly";

interface Transaction {
  id: string;
  description: string | null;
  amount: string;
  type: TransactionType;
  status: TransactionStatus;
  transaction_date: string;
  due_date: string | null;
  paid_at: string | null;
  category: string;
  notes: string | null;
  receipt_url: string | null;
}

interface TransactionLog {
  id: string;
  action: string;
  changed_at: string;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
}

const CATEGORIES: Record<TransactionType, string[]> = {
  expense: [
    "ALUGUEL",
    "ENERGIA ELÉTRICA",
    "ÁGUA E ESGOTO",
    "GÁS",
    "FOLHA DE PAGAMENTO",
    "FORNECEDOR - ALIMENTOS",
    "FORNECEDOR - BEBIDAS",
    "FORNECEDOR - DESCARTÁVEIS",
    "MANUTENÇÃO E REPAROS",
    "EQUIPAMENTOS",
    "MARKETING E PUBLICIDADE",
    "TAXAS E IMPOSTOS",
    "CONTABILIDADE",
    "DELIVERY (TAXAS)",
    "OUTROS",
  ],
  revenue: [
    "VENDAS NO SALÃO",
    "DELIVERY",
    "EVENTOS",
    "TAXA DE SERVIÇO",
    "VENDAS AVULSAS",
    "OUTROS",
  ],
};

const ACTION_LABELS: Record<string, string> = {
  created: "Criado",
  updated: "Editado",
  confirmed: "Confirmado",
  cancelled: "Cancelado",
  deleted: "Excluído",
};
const ACTION_COLORS: Record<string, string> = {
  created: "text-green-700 bg-green-50 border-green-200",
  updated: "text-blue-700 bg-blue-50 border-blue-200",
  confirmed: "text-brand-700 bg-brand-50 border-brand-200",
  cancelled: "text-gray-600 bg-gray-100 border-gray-200",
  deleted: "text-red-700 bg-red-50 border-red-200",
};

const STATUS_LABELS: Record<TransactionStatus, string> = {
  pending: "Pendente",
  confirmed: "Confirmado",
  cancelled: "Cancelado",
};
const STATUS_COLORS: Record<TransactionStatus, string> = {
  pending: "bg-yellow-50 text-yellow-700 border border-yellow-200",
  confirmed: "bg-green-50 text-green-700 border border-green-200",
  cancelled: "bg-gray-100 text-gray-500 border border-gray-200",
};

const FREQ_LABELS: Record<Frequency, string> = {
  weekly: "Semanal (7 dias)",
  biweekly: "Quinzenal (15 dias)",
  monthly: "Mensal (30 dias)",
};

const today = new Date().toISOString().split("T")[0]!;

const EMPTY_FORM = {
  description: "",
  amount: "",
  type: "expense" as TransactionType,
  transaction_date: today,
  due_date: "",
  category: "OUTROS",
  notes: "",
  // parcelamento
  installments: false,
  installment_count: "2",
  installment_freq: "monthly" as Frequency,
};

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0]!;
}

const FREQ_DAYS: Record<Frequency, number> = { weekly: 7, biweekly: 15, monthly: 30 };

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [savingProgress, setSavingProgress] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<"" | TransactionType>("");
  const [filterStatus, setFilterStatus] = useState<"" | TransactionStatus>("");

  // Comprovante modal
  const [receiptTx, setReceiptTx] = useState<Transaction | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  // Audit log modal
  const [logsTx, setLogsTx] = useState<Transaction | null>(null);
  const [logs, setLogs] = useState<TransactionLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const now = new Date();
  const [filterFrom, setFilterFrom] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`
  );
  const [filterTo, setFilterTo] = useState(
    new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0]!
  );

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ date_from: filterFrom, date_to: filterTo });
      if (filterType) params.set("type", filterType);
      if (filterStatus) params.set("status", filterStatus);
      const res = await api.get<{ data: Transaction[]; total: number }>(
        `/transactions?${params}`
      );
      setTransactions(res.data ?? []);
    } catch (err: any) {
      console.error("Erro ao carregar lançamentos:", err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [filterFrom, filterTo, filterType, filterStatus]);

  function openNew() {
    setEditId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setShowForm(true);
  }

  function openEdit(t: Transaction) {
    setEditId(t.id);
    setForm({
      description: t.description ?? "",
      amount: parseFloat(t.amount).toString(),
      type: t.type,
      transaction_date: t.transaction_date,
      due_date: t.due_date ?? "",
      category: t.category,
      notes: t.notes ?? "",
      installments: false,
      installment_count: "2",
      installment_freq: "monthly",
    });
    setFormError(null);
    setShowForm(true);
  }

  function handleTypeChange(type: TransactionType) {
    setForm(f => ({ ...f, type, category: CATEGORIES[type][0]! }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSaving(true);

    try {
      const base = {
        description: form.description || undefined,
        amount: parseFloat(form.amount),
        type: form.type,
        transaction_date: form.transaction_date,
        due_date: form.due_date || undefined,
        category: form.category,
        notes: form.notes || undefined,
      };

      if (editId) {
        // Edição — PATCH simples
        await api.patch(`/transactions/${editId}`, base);
      } else if (form.installments) {
        // Parcelamento — cria N transações em loop
        const count = Math.max(2, Math.min(24, parseInt(form.installment_count) || 2));
        const days = FREQ_DAYS[form.installment_freq];
        for (let i = 0; i < count; i++) {
          setSavingProgress(`Criando parcela ${i + 1} de ${count}...`);
          const dateOffset = addDays(form.transaction_date, i * days);
          await api.post("/transactions", {
            ...base,
            transaction_date: dateOffset,
            due_date: dateOffset,
            description: base.description
              ? `${base.description} (${i + 1}/${count})`
              : `Parcela ${i + 1}/${count}`,
          });
        }
      } else {
        await api.post("/transactions", base);
      }

      setShowForm(false);
      setForm(EMPTY_FORM);
      setEditId(null);
      setSavingProgress("");
      await load();
    } catch (err: any) {
      setFormError(err.message ?? "Erro ao salvar lançamento.");
    } finally {
      setSaving(false);
      setSavingProgress("");
    }
  }

  async function handleConfirm(id: string) {
    try {
      await api.patch(`/transactions/${id}/confirm`, {});
      await load();
    } catch (err: any) {
      setFormError(err.message);
    }
  }

  async function openReceipt(t: Transaction) {
    setReceiptTx(t);
    setUploadError(null);
    setSignedUrl(null);
    if (t.receipt_url) {
      // Gera signed URL para visualização (válida 1 hora)
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data } = await supabase.storage
        .from("receipts")
        .createSignedUrl(t.receipt_url, 3600);
      setSignedUrl(data?.signedUrl ?? null);
    }
  }

  async function handleReceiptUpload(file: File) {
    if (!receiptTx) return;
    setUploading(true);
    setUploadError(null);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão inválida.");

      // Path: tenant_id/transaction_id/filename
      const ext = file.name.split(".").pop();
      const path = `${receiptTx.id}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("receipts")
        .upload(path, file, { upsert: true });
      if (upErr) throw new Error(upErr.message);

      // Salva path na transação via API
      await api.patch(`/transactions/${receiptTx.id}`, { receipt_url: path });

      // Gera signed URL para exibição imediata
      const { data: signed } = await supabase.storage
        .from("receipts")
        .createSignedUrl(path, 3600);
      setSignedUrl(signed?.signedUrl ?? null);

      // Atualiza lista local
      setTransactions(prev =>
        prev.map(t => t.id === receiptTx.id ? { ...t, receipt_url: path } : t)
      );
      setReceiptTx(prev => prev ? { ...prev, receipt_url: path } : prev);
    } catch (err: any) {
      setUploadError(err.message ?? "Erro ao enviar comprovante.");
    } finally {
      setUploading(false);
    }
  }

  async function openLogs(t: Transaction) {
    setLogsTx(t);
    setLogsLoading(true);
    setLogs([]);
    try {
      const data = await api.get<TransactionLog[]>(`/transactions/${t.id}/logs`);
      setLogs(Array.isArray(data) ? data : []);
    } catch {
      setLogs([]);
    } finally {
      setLogsLoading(false);
    }
  }

  const totals = transactions.reduce(
    (acc, t) => {
      if (t.status === "cancelled") return acc;
      const amt = parseFloat(t.amount);
      if (t.type === "revenue") acc.revenue += amt;
      else acc.expense += amt;
      return acc;
    },
    { revenue: 0, expense: 0 }
  );
  const resultado = totals.revenue - totals.expense;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lançamentos</h1>
          <p className="text-sm text-gray-500 mt-0.5">{transactions.length} no período</p>
        </div>
        <button
          onClick={openNew}
          className="shrink-0 px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors"
        >
          + Novo Lançamento
        </button>
      </div>

      {/* Totais */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border-l-4 border-brand-500 border border-gray-100 p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Receitas</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(totals.revenue)}</p>
        </div>
        <div className="bg-white rounded-xl border-l-4 border-red-400 border border-gray-100 p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Despesas</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(totals.expense)}</p>
        </div>
        <div className={`bg-white rounded-xl border-l-4 border border-gray-100 p-4 shadow-sm ${resultado >= 0 ? "border-l-brand-500" : "border-l-red-400"}`}>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Resultado</p>
          <p className={`text-2xl font-bold mt-1 ${resultado >= 0 ? "text-gray-900" : "text-red-600"}`}>
            {formatCurrency(resultado)}
          </p>
        </div>
      </div>

      {/* Modal formulário */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">
                {editId ? "Editar Lançamento" : "Novo Lançamento"}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                  {formError}
                </div>
              )}

              {/* Tipo */}
              <div className="grid grid-cols-2 gap-2">
                {(["expense", "revenue"] as TransactionType[]).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleTypeChange(t)}
                    className={`py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                      form.type === t
                        ? t === "expense"
                          ? "bg-red-50 border-red-300 text-red-700"
                          : "bg-green-50 border-green-300 text-green-700"
                        : "bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100"
                    }`}
                  >
                    {t === "expense" ? "💸 Despesa" : "💰 Receita"}
                  </button>
                ))}
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600">Descrição</label>
                <input
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                  placeholder={form.type === "expense" ? "Ex: Conta de luz — abril" : "Ex: Vendas do dia"}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-600">Valor (R$) *</label>
                  <input
                    required type="number" min="0.01" step="0.01"
                    value={form.amount}
                    onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                    placeholder="0,00"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Data *</label>
                  <input
                    required type="date"
                    value={form.transaction_date}
                    onChange={e => setForm(f => ({ ...f, transaction_date: e.target.value }))}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-600">Categoria *</label>
                  <select
                    required
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-300"
                  >
                    {CATEGORIES[form.type].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Vencimento</label>
                  <input
                    type="date"
                    value={form.due_date}
                    onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600">Observações / NF</label>
                <input
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                  placeholder="Ex: NF-001, referência interna"
                />
              </div>

              {/* Parcelamento — só em modo criação */}
              {!editId && (
                <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.installments}
                      onChange={e => setForm(f => ({ ...f, installments: e.target.checked }))}
                      className="accent-brand-600 h-4 w-4"
                    />
                    <span className="text-sm font-medium text-gray-700">Parcelar lançamento</span>
                    <span className="text-xs text-gray-400">TV 10x, seguro anual, etc.</span>
                  </label>

                  {form.installments && (
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="text-xs font-medium text-gray-600">Nº de parcelas</label>
                        <input
                          type="number" min="2" max="24"
                          value={form.installment_count}
                          onChange={e => setForm(f => ({ ...f, installment_count: e.target.value }))}
                          className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600">Frequência</label>
                        <select
                          value={form.installment_freq}
                          onChange={e => setForm(f => ({ ...f, installment_freq: e.target.value as Frequency }))}
                          className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-300"
                        >
                          {(Object.keys(FREQ_LABELS) as Frequency[]).map(f => (
                            <option key={f} value={f}>{FREQ_LABELS[f]}</option>
                          ))}
                        </select>
                      </div>
                      {form.amount && form.installment_count && (
                        <p className="col-span-2 text-xs text-gray-500 bg-gray-50 rounded px-3 py-2">
                          Serão criados <strong>{form.installment_count}</strong> lançamentos de{" "}
                          <strong>{formatCurrency(parseFloat(form.amount) || 0)}</strong> cada,{" "}
                          iniciando em {new Date(form.transaction_date + "T00:00:00").toLocaleDateString("pt-BR")}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
                >
                  {saving
                    ? (savingProgress || "Salvando...")
                    : editId
                    ? "Salvar Alterações"
                    : form.installments
                    ? `Criar ${form.installment_count} parcelas`
                    : "Salvar Lançamento"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Comprovante */}
      {receiptTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Comprovante</h2>
                <p className="text-xs text-gray-400 mt-0.5">{receiptTx.description || receiptTx.category}</p>
              </div>
              <button onClick={() => setReceiptTx(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <div className="p-5 space-y-4">
              {uploadError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                  {uploadError}
                </div>
              )}

              {/* Visualizar comprovante existente */}
              {signedUrl && (
                <div className="rounded-lg border border-gray-200 overflow-hidden">
                  {signedUrl.includes(".pdf") ? (
                    <a href={signedUrl} target="_blank" rel="noreferrer"
                      className="flex items-center gap-2 p-4 text-brand-600 hover:bg-brand-50 text-sm font-medium">
                      📄 Abrir PDF do comprovante
                    </a>
                  ) : (
                    <a href={signedUrl} target="_blank" rel="noreferrer">
                      <img src={signedUrl} alt="Comprovante" className="w-full max-h-64 object-contain bg-gray-50" />
                    </a>
                  )}
                </div>
              )}

              {/* Upload */}
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-2">
                  {receiptTx.receipt_url ? "Substituir comprovante" : "Anexar comprovante"}
                </label>
                <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 cursor-pointer transition-colors
                  ${uploading ? "opacity-50 pointer-events-none" : "border-gray-300 hover:border-brand-400 hover:bg-brand-50"}`}>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    className="hidden"
                    onChange={e => {
                      const f = e.target.files?.[0];
                      if (f) handleReceiptUpload(f);
                    }}
                  />
                  {uploading ? (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
                      Enviando...
                    </div>
                  ) : (
                    <>
                      <span className="text-2xl mb-1">📎</span>
                      <span className="text-sm text-gray-500">Clique para selecionar</span>
                      <span className="text-xs text-gray-400 mt-1">JPG, PNG, PDF — máx. 10 MB</span>
                    </>
                  )}
                </label>
              </div>

              {receiptTx.receipt_url && signedUrl && (
                <a href={signedUrl} target="_blank" rel="noreferrer"
                  className="block text-center text-xs text-brand-600 hover:underline">
                  Abrir em nova aba →
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Audit Log */}
      {logsTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Histórico de Alterações</h2>
                <p className="text-xs text-gray-400 mt-0.5">{logsTx.description || logsTx.category}</p>
              </div>
              <button onClick={() => setLogsTx(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <div className="p-5">
              {logsLoading ? (
                <div className="flex justify-center py-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
                </div>
              ) : logs.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-6">Nenhum log encontrado.</p>
              ) : (
                <ol className="relative border-l border-gray-200 space-y-4 ml-3">
                  {logs.map(log => (
                    <li key={log.id} className="ml-4">
                      <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border-2 border-white bg-gray-300" />
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${ACTION_COLORS[log.action] ?? "text-gray-600 bg-gray-100 border-gray-200"}`}>
                          {ACTION_LABELS[log.action] ?? log.action}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(log.changed_at).toLocaleString("pt-BR")}
                        </span>
                      </div>
                      {log.action === "updated" && log.old_data && log.new_data && (
                        <div className="text-xs text-gray-500 space-y-0.5">
                          {(["amount", "description", "category", "transaction_date", "due_date", "notes"] as const).map(field => {
                            const oldVal = (log.old_data as any)?.[field];
                            const newVal = (log.new_data as any)?.[field];
                            if (oldVal === newVal || (oldVal == null && newVal == null)) return null;
                            return (
                              <p key={field}>
                                <span className="font-medium text-gray-600">{field}:</span>{" "}
                                <span className="line-through text-red-400">{String(oldVal ?? "—")}</span>
                                {" → "}
                                <span className="text-green-600">{String(newVal ?? "—")}</span>
                              </p>
                            );
                          })}
                        </div>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <input
          type="date" value={filterFrom}
          onChange={e => setFilterFrom(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
        />
        <input
          type="date" value={filterTo}
          onChange={e => setFilterTo(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
        />
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value as "" | TransactionType)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-300"
        >
          <option value="">Todos os tipos</option>
          <option value="revenue">Receita</option>
          <option value="expense">Despesa</option>
        </select>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as "" | TransactionStatus)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-300"
        >
          <option value="">Todos os status</option>
          <option value="pending">Pendente</option>
          <option value="confirmed">Confirmado</option>
          <option value="cancelled">Cancelado</option>
        </select>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {["Descrição", "Tipo", "Valor", "Data", "Categoria", "Status", "Ações"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center">
                    <div className="flex justify-center">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
                    </div>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-gray-400 text-sm">
                    Nenhum lançamento no período.
                  </td>
                </tr>
              ) : (
                transactions.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-900">{t.description || "—"}</span>
                      {t.notes && <span className="block text-xs text-gray-400">{t.notes}</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        t.type === "revenue"
                          ? "bg-green-50 text-green-700 border border-green-200"
                          : "bg-red-50 text-red-700 border border-red-200"
                      }`}>
                        {t.type === "revenue" ? "Receita" : "Despesa"}
                      </span>
                    </td>
                    <td className={`px-4 py-3 font-semibold whitespace-nowrap ${t.type === "revenue" ? "text-green-700" : "text-red-700"}`}>
                      {t.type === "expense" ? "- " : "+ "}{formatCurrency(parseFloat(t.amount))}
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {new Date(t.transaction_date + "T00:00:00").toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-medium">
                        {t.category}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[t.status]}`}>
                        {STATUS_LABELS[t.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 flex-wrap">
                        {t.status === "pending" && (
                          <>
                            <button
                              onClick={() => handleConfirm(t.id)}
                              className="text-xs text-brand-600 hover:text-brand-800 font-medium hover:underline"
                            >
                              Confirmar
                            </button>
                            <button
                              onClick={() => openEdit(t)}
                              className="text-xs text-gray-500 hover:text-gray-700 font-medium hover:underline"
                            >
                              Editar
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => openReceipt(t)}
                          className={`text-xs font-medium hover:underline ${
                            t.receipt_url
                              ? "text-green-600 hover:text-green-800"
                              : "text-gray-400 hover:text-gray-600"
                          }`}
                          title={t.receipt_url ? "Ver comprovante" : "Anexar comprovante"}
                        >
                          {t.receipt_url ? "📎 Comprovante" : "Anexar"}
                        </button>
                        <button
                          onClick={() => openLogs(t)}
                          className="text-xs text-gray-400 hover:text-gray-600 hover:underline"
                          title="Ver histórico de alterações"
                        >
                          Log
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
