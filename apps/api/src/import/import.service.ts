import { Injectable, Inject, BadRequestException } from "@nestjs/common";
import { SupabaseClient } from "@supabase/supabase-js";
import * as Papa from "papaparse";
import * as XLSX from "xlsx";
import { USER_SUPABASE_CLIENT } from "../supabase/supabase.module";
import type { Database } from "@zeus/database";

type ImportJob = Database["public"]["Tables"]["import_jobs"]["Row"];

// Mapeamento de colunas de arquivos externos para o schema interno
export interface ColumnMapping {
  [sourceColumn: string]: string; // ex: { "Data": "transaction_date", "Valor": "amount" }
}

// Linha normalizada após aplicar o mapeamento
type NormalizedRow = Record<string, unknown>;

export interface ImportResult {
  job: ImportJob;
  rows_processed: number;
  rows_failed: number;
  errors: Array<{ row: number; field: string; error: string }>;
}

@Injectable()
export class ImportService {
  constructor(
    @Inject(USER_SUPABASE_CLIENT)
    private readonly supabase: SupabaseClient<Database>
  ) {}

  /**
   * Importa transações a partir de um buffer CSV ou Excel.
   * Normaliza colunas, valida cada linha e insere em batch.
   */
  async importTransactions(
    tenantId: string,
    userId: string,
    fileBuffer: Buffer,
    fileName: string,
    mapping: ColumnMapping
  ): Promise<ImportResult> {
    // 1. Cria o job de importação
    const { data: job, error: jobError } = await this.supabase
      .from("import_jobs")
      .insert({
        tenant_id: tenantId,
        file_type: this.detectFileType(fileName),
        original_filename: fileName,
        target_table: "transactions",
        status: "processing",
        mapping_config: mapping,
        created_by: userId,
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (jobError || !job) {
      throw new Error(`Erro ao criar job de importação: ${jobError?.message}`);
    }

    // 2. Parseia o arquivo
    let rawRows: Record<string, string>[];
    try {
      rawRows = this.parseFile(fileBuffer, fileName);
    } catch (e) {
      await this.failJob(job.id, String(e));
      throw new BadRequestException(`Erro ao processar arquivo: ${e}`);
    }

    // 3. Normaliza e valida cada linha
    const validRows: Array<Record<string, unknown>> = [];
    const errors: Array<{ row: number; field: string; error: string }> = [];

    rawRows.forEach((raw, index) => {
      const rowNum = index + 2; // +2 porque linha 1 é o header
      const normalized = this.applyMapping(raw, mapping);
      const validation = this.validateTransactionRow(normalized);

      if (validation.valid) {
        validRows.push({
          tenant_id: tenantId,
          type: normalized["type"] ?? "expense",
          category: normalized["category"] ?? "importado",
          description: normalized["description"] ?? null,
          amount: parseFloat(String(normalized["amount"]).replace(",", ".")),
          transaction_date: this.normalizeDate(String(normalized["transaction_date"])),
          status: "confirmed",
          import_source: "csv",
          import_job_id: job.id,
          created_by: userId,
        });
      } else {
        validation.errors.forEach((err) => errors.push({ row: rowNum, ...err }));
      }
    });

    // 4. Insere em batch (chunks de 500 para evitar timeout)
    const CHUNK_SIZE = 500;
    for (let i = 0; i < validRows.length; i += CHUNK_SIZE) {
      const chunk = validRows.slice(i, i + CHUNK_SIZE);
      const { error: insertError } = await this.supabase
        .from("transactions")
        .insert(chunk as any);

      if (insertError) {
        errors.push({ row: i, field: "batch", error: insertError.message });
      }
    }

    // 5. Atualiza job com resultado
    await this.supabase
      .from("import_jobs")
      .update({
        status: errors.length > 0 && validRows.length === 0 ? "failed" : "completed",
        rows_total: rawRows.length,
        rows_processed: validRows.length,
        rows_failed: errors.length,
        error_log: errors,
        completed_at: new Date().toISOString(),
      })
      .eq("id", job.id);

    return {
      job: { ...job, status: "completed" },
      rows_processed: validRows.length,
      rows_failed: errors.length,
      errors,
    };
  }

  /**
   * Detecta as colunas disponíveis no arquivo para exibir no frontend
   * antes do usuário confirmar o mapeamento.
   */
  detectColumns(fileBuffer: Buffer, fileName: string): string[] {
    const rows = this.parseFile(fileBuffer, fileName);
    return rows.length > 0 ? Object.keys(rows[0]!) : [];
  }

  // ---------------------------------------------------------------------------
  // PRIVADOS
  // ---------------------------------------------------------------------------

  private parseFile(
    buffer: Buffer,
    fileName: string
  ): Record<string, string>[] {
    const ext = fileName.split(".").pop()?.toLowerCase();

    if (ext === "csv") {
      const text = buffer.toString("utf-8");
      const result = Papa.parse<Record<string, string>>(text, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h) => h.trim(),
        transform: (v) => v.trim(),
      });
      if (result.errors.length > 0) {
        throw new Error(`CSV inválido: ${result.errors[0]?.message}`);
      }
      return result.data;
    }

    if (ext === "xlsx" || ext === "xls") {
      const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
      const sheet = workbook.Sheets[workbook.SheetNames[0]!]!;
      return XLSX.utils.sheet_to_json<Record<string, string>>(sheet, {
        defval: "",
        raw: false,
      });
    }

    throw new BadRequestException(
      `Formato não suportado: ${ext}. Use CSV ou Excel (.xlsx/.xls).`
    );
  }

  private applyMapping(
    row: Record<string, string>,
    mapping: ColumnMapping
  ): NormalizedRow {
    const normalized: NormalizedRow = {};
    for (const [sourceCol, targetField] of Object.entries(mapping)) {
      normalized[targetField] = row[sourceCol] ?? "";
    }
    // Colunas não mapeadas são mantidas com o nome original
    for (const [col, val] of Object.entries(row)) {
      if (!Object.keys(mapping).includes(col)) {
        normalized[col] = val;
      }
    }
    return normalized;
  }

  private validateTransactionRow(row: NormalizedRow): {
    valid: boolean;
    errors: Array<{ field: string; error: string }>;
  } {
    const errors: Array<{ field: string; error: string }> = [];

    if (!row["amount"] || isNaN(parseFloat(String(row["amount"]).replace(",", ".")))) {
      errors.push({ field: "amount", error: "Valor inválido ou ausente." });
    }

    if (!row["transaction_date"]) {
      errors.push({ field: "transaction_date", error: "Data ausente." });
    }

    if (!row["category"]) {
      errors.push({ field: "category", error: "Categoria ausente." });
    }

    return { valid: errors.length === 0, errors };
  }

  private normalizeDate(raw: string): string {
    // Aceita formatos: DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.substring(0, 10);

    const parts = raw.split(/[\/\-]/);
    if (parts.length === 3) {
      const [a, b, c] = parts;
      // Heurística: se primeiro campo tem 4 dígitos, é YYYY-MM-DD
      if (a!.length === 4) return `${a}-${b?.padStart(2, "0")}-${c?.padStart(2, "0")}`;
      // Assumir DD/MM/YYYY (padrão brasileiro)
      return `${c}-${b?.padStart(2, "0")}-${a?.padStart(2, "0")}`;
    }

    return raw; // Devolve original e deixa o banco rejeitar se inválido
  }

  /** Mapeamento padrão por tipo de importação (colunas em PT-BR comuns). */
  buildDefaultMapping(importType: string): ColumnMapping {
    const maps: Record<string, ColumnMapping> = {
      transactions: {
        descricao: "description", description: "description",
        valor: "amount", amount: "amount",
        tipo: "type", type: "type",
        vencimento: "due_date", data: "due_date", due_date: "due_date",
        categoria: "category", category: "category",
        numero: "reference_number", referencia: "reference_number",
      },
      ingredients: {
        nome: "name", name: "name",
        unidade: "unit", unit: "unit",
        custo: "unit_cost", unit_cost: "unit_cost",
        estoque_minimo: "min_stock_alert",
        categoria: "category", category: "category",
      },
      stock_movements: {
        ingrediente: "ingredient_name", ingredient_name: "ingredient_name",
        tipo: "movement_type", movement_type: "movement_type",
        quantidade: "quantity", quantity: "quantity",
        custo: "unit_cost", unit_cost: "unit_cost",
        observacao: "notes", notes: "notes",
      },
    };
    return maps[importType] ?? {};
  }

  /** Importa ingredientes em lote. */
  async importIngredients(
    tenantId: string,
    userId: string,
    fileBuffer: Buffer,
    fileName: string,
  ): Promise<ImportResult> {
    const mapping = this.buildDefaultMapping("ingredients");
    const rows = this.parseFile(fileBuffer, fileName);
    const normalized = rows.map((r) => this.applyMapping(r, mapping));

    const validRows: any[] = [];
    const errors: Array<{ row: number; field: string; error: string }> = [];

    for (let i = 0; i < normalized.length; i++) {
      const row = normalized[i]!;
      if (!row["name"]) { errors.push({ row: i + 2, field: "name", error: "Nome obrigatório" }); continue; }
      if (!row["unit"])  { errors.push({ row: i + 2, field: "unit",  error: "Unidade obrigatória" }); continue; }
      validRows.push({
        tenant_id: tenantId,
        name: String(row["name"]),
        unit: String(row["unit"]),
        unit_cost: parseFloat(String(row["unit_cost"] ?? "0")) || 0,
        min_stock_alert: parseFloat(String(row["min_stock_alert"] ?? "0")) || 0,
        category: row["category"] ? String(row["category"]) : null,
        created_by: userId,
      });
    }

    const BATCH = 500;
    for (let i = 0; i < validRows.length; i += BATCH) {
      await this.supabase.from("ingredients").insert(validRows.slice(i, i + BATCH) as any);
    }

    return {
      job: { id: "", status: "completed" } as any,
      rows_processed: validRows.length,
      rows_failed: errors.length,
      errors,
    };
  }

  private detectFileType(fileName: string): "csv" | "excel" | "xml" {
    const ext = fileName.split(".").pop()?.toLowerCase();
    if (ext === "csv") return "csv";
    if (ext === "xlsx" || ext === "xls") return "excel";
    return "csv";
  }

  private async failJob(jobId: string, errorMsg: string): Promise<void> {
    await this.supabase
      .from("import_jobs")
      .update({ status: "failed", error_log: [{ error: errorMsg }] })
      .eq("id", jobId);
  }
}
