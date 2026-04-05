"use client";

import { useRef, useState } from "react";
import { api } from "@/lib/api";

type ImportType = "transactions" | "ingredients" | "stock_movements";
type JobStatus = "pending" | "processing" | "completed" | "failed";

interface ImportResult {
  job_id: string;
  status: JobStatus;
  total_rows: number;
  imported_rows: number;
  error_rows: number;
  errors: Array<{ row: number; message: string }>;
}

const IMPORT_TYPES: Record<ImportType, { label: string; description: string; columns: string[] }> = {
  transactions: {
    label: "Lançamentos Financeiros",
    description: "Importe receitas e despesas em lote",
    columns: ["description", "amount", "type (revenue/expense)", "due_date (DD/MM/YYYY)", "category (opcional)", "reference_number (opcional)"],
  },
  ingredients: {
    label: "Ingredientes",
    description: "Cadastre ingredientes em massa",
    columns: ["name", "unit", "unit_cost", "min_stock_alert (opcional)", "category (opcional)"],
  },
  stock_movements: {
    label: "Movimentações de Estoque",
    description: "Importe entradas e saídas de estoque",
    columns: ["ingredient_name", "movement_type (purchase/adjustment)", "quantity", "unit_cost (obrigatório para compras)", "notes (opcional)"],
  },
};

export default function ImportPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [importType, setImportType] = useState<ImportType>("transactions");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  }

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setResult(null);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", importType);

      // Use fetch directly since api helper uses JSON
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;

      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";
      const res = await fetch(`${apiUrl}/import/upload`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message ?? `Erro ${res.status}`);
      }

      const data = await res.json() as ImportResult;
      setResult(data);
    } catch (err: any) {
      setUploadError(err.message ?? "Erro ao importar arquivo.");
    } finally {
      setUploading(false);
    }
  }

  const info = IMPORT_TYPES[importType];

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Importar CSV / Excel</h1>
        <p className="text-sm text-gray-500 mt-1">Importe dados em massa a partir de planilhas</p>
      </div>

      {/* Tipo de importação */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-5">
        <label className="text-sm font-medium text-gray-700 block mb-3">O que deseja importar?</label>
        <div className="space-y-2">
          {(Object.keys(IMPORT_TYPES) as ImportType[]).map(type => (
            <label key={type}
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${importType === type ? "border-brand-500 bg-brand-50" : "border-gray-200 hover:bg-gray-50"}`}>
              <input type="radio" name="importType" value={type} checked={importType === type}
                onChange={() => setImportType(type)} className="mt-0.5 accent-brand-600" />
              <div>
                <p className="text-sm font-medium text-gray-900">{IMPORT_TYPES[type].label}</p>
                <p className="text-xs text-gray-500">{IMPORT_TYPES[type].description}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Colunas esperadas */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-5">
        <p className="text-xs font-semibold text-amber-800 mb-2 uppercase">Colunas esperadas no arquivo</p>
        <div className="flex flex-wrap gap-2">
          {info.columns.map(col => (
            <code key={col} className="px-2 py-1 bg-white border border-amber-200 rounded text-xs text-amber-900">{col}</code>
          ))}
        </div>
        <p className="text-xs text-amber-700 mt-2">
          A primeira linha deve ser o cabeçalho. Datas no formato DD/MM/AAAA ou AAAA-MM-DD.
        </p>
      </div>

      {/* Upload zone */}
      <div
        onDrop={handleDrop}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => fileRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors mb-5
          ${dragOver ? "border-brand-500 bg-brand-50" : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"}`}
      >
        <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden"
          onChange={e => setFile(e.target.files?.[0] ?? null)} />
        {file ? (
          <div>
            <p className="text-sm font-medium text-gray-900">{file.name}</p>
            <p className="text-xs text-gray-500 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
            <button
              type="button"
              onClick={e => { e.stopPropagation(); setFile(null); setResult(null); }}
              className="mt-2 text-xs text-red-500 hover:underline"
            >
              Remover
            </button>
          </div>
        ) : (
          <div>
            <p className="text-sm text-gray-500">Arraste um arquivo CSV ou Excel aqui</p>
            <p className="text-xs text-gray-400 mt-1">ou clique para selecionar</p>
            <p className="text-xs text-gray-400 mt-1">.csv · .xlsx · .xls</p>
          </div>
        )}
      </div>

      <button
        onClick={handleUpload}
        disabled={!file || uploading}
        className="w-full py-3 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {uploading ? "Importando..." : "Iniciar Importação"}
      </button>

      {/* Erro inline */}
      {uploadError && (
        <div className="mt-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {uploadError}
        </div>
      )}

      {/* Resultado */}
      {result && (
        <div className={`mt-6 rounded-lg border p-5 ${result.error_rows === 0 ? "border-green-200 bg-green-50" : "border-yellow-200 bg-yellow-50"}`}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">{result.error_rows === 0 ? "✓" : "⚠"}</span>
            <h3 className="text-sm font-semibold text-gray-900">
              {result.error_rows === 0 ? "Importação concluída com sucesso!" : "Importação concluída com avisos"}
            </h3>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center mb-4">
            <div>
              <p className="text-2xl font-bold text-gray-900">{result.total_rows}</p>
              <p className="text-xs text-gray-500">Total de linhas</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{result.imported_rows}</p>
              <p className="text-xs text-gray-500">Importadas</p>
            </div>
            <div>
              <p className={`text-2xl font-bold ${result.error_rows > 0 ? "text-red-600" : "text-gray-400"}`}>{result.error_rows}</p>
              <p className="text-xs text-gray-500">Com erro</p>
            </div>
          </div>
          {result.errors.length > 0 && (
            <div className="bg-white rounded border border-yellow-200 p-3">
              <p className="text-xs font-semibold text-gray-700 mb-2">Erros encontrados:</p>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {result.errors.map((err, i) => (
                  <p key={i} className="text-xs text-red-600">
                    <span className="font-medium">Linha {err.row}:</span> {err.message}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
