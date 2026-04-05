# Quick Start — Semana 2 (5 minutos)

Angelo, comece por aqui!

---

## 1. Entender o Escopo

**Semana 2 = Importar dados de PDVs**

- **NFCe**: PDV emite XML → você parseia → insere como transação
- **CSV**: PDV emite planilha → você parseia → insere como transações

---

## 2. Arquivos que Você vai Criar

```
apps/api/src/import/parsers/
├── nfce-parser.ts          ← NOVO (200 linhas)
├── csv-parser.ts           ← NOVO (200 linhas)
└── index.ts                ← NOVO (3 linhas)
```

E expandir:
```
apps/api/src/import/
└── import.controller.ts    ← ADICIONAR 2 endpoints
```

---

## 3. Antes de Começar (5 min)

```bash
# Terminal 1: Ir para API
cd apps/api

# Terminal 1: Instalar xml2js (pra parsear XML)
pnpm add xml2js
pnpm add -D @types/xml2js

# Terminal 1: Criar pasta
mkdir -p src/import/parsers

# Terminal 2: Rodar dev (leave running)
cd apps/api
pnpm run dev
```

---

## 4. Estrutura Base dos Arquivos

### Arquivo 1: `apps/api/src/import/parsers/nfce-parser.ts`

```typescript
/**
 * Parse NFCe XML (Nota Fiscal Eletrônica modelo 65)
 * Exemplo: vendas.xml do PDV → estrutura TypeScript
 */

export interface NFCeItem {
  codigo: string;
  descricao: string;
  quantidade: number;
  unidade: string;
  valorUnitario: number;
  valorItem: number;
}

export interface NFCeData {
  chaveNFe: string;
  dataEmissao: string;           // YYYY-MM-DD
  horaEmissao: string;           // HH:MM:SS
  cnpjEmissor: string;
  nomeEmissor: string;
  valorTotal: number;
  itens: NFCeItem[];
  status: "autorizado" | "rejeitado" | "cancelado";
}

export class NFCeParser {
  /**
   * Parseia XML NFCe e retorna dados estruturados
   */
  static parse(xmlBuffer: Buffer): NFCeData | null {
    // TODO: Implementar
    // 1. Converter buffer pra string
    // 2. Usar xml2js pra parsear
    // 3. Extrair dados (veja estrutura em SEMANA2_PARSERS_IMPORTACAO.md)
    // 4. Validar se status === "autorizado"
    // 5. Retornar NFCeData ou null
    return null;
  }

  /**
   * Converte NFCeData em Transaction (pro banco)
   */
  static toTransaction(nfce: NFCeData, tenantId: string, userId: string) {
    return {
      tenant_id: tenantId,
      type: "income" as const,
      category: "nfce_importada",
      description: `NFCe ${nfce.chaveNFe}`,
      amount: nfce.valorTotal,
      transaction_date: nfce.dataEmissao,
      status: "confirmed" as const,
      import_source: "nfce",
      created_by: userId,
      metadata: {
        chaveNFe: nfce.chaveNFe,
        cnpjEmissor: nfce.cnpjEmissor,
        itens: nfce.itens,
      },
    };
  }

  private static isValidNFCe(doc: any): boolean {
    // TODO: Verificar se é NFCe válida
    return true;
  }

  private static extractItens(doc: any): NFCeItem[] {
    // TODO: Extrair itens do XML
    return [];
  }
}
```

### Arquivo 2: `apps/api/src/import/parsers/csv-parser.ts`

```typescript
/**
 * Parse CSV/Excel de PDVs (Saipos, GrandChef, etc)
 * Exemplo: vendas-abril.csv → array de transações
 */

export interface CSVTemplate {
  name: string;
  columnMapping: Record<string, string>;  // "Data" → "transaction_date"
  dateFormat?: string;
  decimalSeparator?: "," | ".";
}

export class CSVParser {
  // Templates pré-configurados
  static readonly TEMPLATES: Record<string, CSVTemplate> = {
    saipos: {
      name: "saipos",
      columnMapping: {
        "Data": "transaction_date",
        "Valor": "amount",
        "Descrição": "description",
        "Tipo": "type",
        "Categoria": "category",
      },
      dateFormat: "DD/MM/YYYY",
      decimalSeparator: ",",
    },
    grandchef: {
      name: "grandchef",
      columnMapping: {
        "data_venda": "transaction_date",
        "valor_total": "amount",
        "descricao_produto": "description",
      },
      dateFormat: "YYYY-MM-DD",
      decimalSeparator: ".",
    },
    generic: {
      name: "generic",
      columnMapping: {},
      dateFormat: "YYYY-MM-DD",
      decimalSeparator: ".",
    },
  };

  /**
   * Detecta template automaticamente
   */
  static detectTemplate(csvBuffer: Buffer): CSVTemplate {
    // TODO: Implementar
    // 1. Ler primeira linha (headers)
    // 2. Contar quantas colunas conhecidas pra cada template
    // 3. Retornar template com mais matches
    // 4. Se nenhum match, retornar "generic"
    return this.TEMPLATES.generic;
  }

  /**
   * Parse CSV com mapeamento
   */
  static parse(
    csvBuffer: Buffer,
    template: CSVTemplate
  ): Array<Record<string, unknown>> {
    // TODO: Implementar
    // 1. Parsear CSV (usar papaparse já instalado)
    // 2. Aplicar columnMapping
    // 3. Normalizar datas
    // 4. Normalizar valores (vírgula → ponto)
    // 5. Retornar array de rows
    return [];
  }

  /**
   * Converte row CSV em Transaction
   */
  static toTransaction(row: Record<string, unknown>, tenantId: string, userId: string) {
    return {
      tenant_id: tenantId,
      type: row["type"] ?? "expense",
      category: row["category"] ?? "importado",
      description: row["description"] ?? "Importado",
      amount: parseFloat(String(row["amount"]).replace(",", ".")),
      transaction_date: row["transaction_date"],
      status: "confirmed" as const,
      import_source: "csv",
      created_by: userId,
    };
  }
}
```

### Arquivo 3: `apps/api/src/import/parsers/index.ts`

```typescript
export { NFCeParser, NFCeData, NFCeItem } from "./nfce-parser";
export { CSVParser, CSVTemplate } from "./csv-parser";
```

---

## 5. Expandir Controller

Abra `apps/api/src/import/import.controller.ts` e adicione:

```typescript
import { NFCeParser } from "./parsers";
import { CSVParser } from "./parsers";

// Adicione estes 2 endpoints:

@Post("upload-nfce")
@Version("1")
@ApiOperation({ summary: "Importar NFCe XML" })
async uploadNFCe(@Request() req: AuthenticatedRequest) {
  // TODO: Implementar
  // 1. Receber arquivo(s) XML do multipart
  // 2. Para cada XML:
  //    - Parsear com NFCeParser.parse()
  //    - Converter com NFCeParser.toTransaction()
  //    - Inserir no banco
  // 3. Retornar resultado
}

@Post("upload-csv")
@Version("1")
@ApiOperation({ summary: "Importar CSV com detecção de template" })
async uploadCSV(@Request() req: AuthenticatedRequest) {
  // TODO: Implementar
  // 1. Receber arquivo CSV + (opcionalmente) template name
  // 2. Detectar template (ou usar fornecido)
  // 3. Parsear com CSVParser.parse()
  // 4. Para cada linha:
  //    - Converter com CSVParser.toTransaction()
  //    - Inserir no banco
  // 5. Retornar resultado
}
```

---

## 6. Ordem de Trabalho Recomendada

### Dia 1: NFCe Parser
- [ ] Criar arquivo `nfce-parser.ts`
- [ ] Implementar `NFCeParser.parse()`
- [ ] Implementar `toTransaction()`
- [ ] Testar com XML exemplo

### Dia 2: CSV Parser
- [ ] Criar arquivo `csv-parser.ts`
- [ ] Implementar templates
- [ ] Implementar `detectTemplate()`
- [ ] Implementar `parse()`
- [ ] Testar com CSV exemplo

### Dia 3-4: Upload Endpoints
- [ ] Adicionar `uploadNFCe()` ao controller
- [ ] Adicionar `uploadCSV()` ao controller
- [ ] Testar via Swagger/Postman
- [ ] Validar inserção no banco

### Dia 5: Testes + Documentação
- [ ] Criar testes para parsers
- [ ] Documentação de uso
- [ ] Commit final

---

## 7. Links de Referência

| Arquivo | Descrição |
|---------|-----------|
| `SEMANA2_PARSERS_IMPORTACAO.md` | **LEIA TUDO** antes de começar |
| `PREPARACAO_SEMANA2.md` | Checklist e estrutura |
| `apps/api/src/import/import.controller.ts` | Controller que você vai expandir |
| `apps/api/src/import/import.service.ts` | Service de referência |

---

## 8. Teste Rápido

Depois de implementar, teste assim:

```bash
# Terminal: testar endpoint NFCe
curl -X POST http://localhost:3001/api/import/upload-nfce \
  -H "Authorization: Bearer <seu-token>" \
  -F "files=@nfce-sample.xml"

# Terminal: testar endpoint CSV
curl -X POST http://localhost:3001/api/import/upload-csv \
  -H "Authorization: Bearer <seu-token>" \
  -F "file=@saipos.csv" \
  -F "template=saipos"
```

---

## 9. Próximas Dúvidas?

1. **Documentação completa**: abra `SEMANA2_PARSERS_IMPORTACAO.md`
2. **Exemplos de XML**: veja seção "Estrutura do XML NFCe" lá
3. **Como parsear XML**: use `xml2js` (já instalou)
4. **Como normalizar datas**: use `date-fns` (já existe)
5. **Como tratar valores monetários**: use `Decimal.js` (já existe)

---

**Pronto? Cria os arquivos e bora! 🚀**
