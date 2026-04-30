# Zeus Financeiro — Semana 2: Parsers de Importação (NFCe + CSV)

**Status**: 🚀 Pronto para Desenvolvimento
**Data Início**: 5 de Abril de 2026
**Próxima Fase**: Semana 3 (Trigger.dev + Processamento em Background)

---

## 📋 Visão Geral da Semana 2

A Semana 1 estabeleceu:
- ✅ Multi-tenancy com RLS
- ✅ Auth integrado (Supabase)
- ✅ TenantProvider no frontend

Agora (Semana 2) vamos criar:
- 🎯 **Parser XML NFCe** — ler notas fiscais de PDV (NFC-e modelo 65)
- 🎯 **Parser CSV Universal** — planilhas de qualquer PDV
- 🎯 **Endpoint de Upload** — receber arquivos e enfileirar processamento

---

## 🎯 Tarefas da Semana 2

### 1️⃣ Parser XML NFCe

**Arquivo**: `apps/api/src/import/parsers/nfce-parser.ts`

#### O que é NFCe?
- **NFC-e** = Nota Fiscal de Consumidor Eletrônica (Modelo 65)
- Emitida por PDVs (Saipos, Totvs, Flinnt, etc)
- Formato: **XML**
- Contém: data/hora, itens vendidos, totalizações

#### Estrutura do XML NFCe (Exemplo)
```xml
<?xml version="1.0" encoding="UTF-8"?>
<nfeProc versao="4.00">
  <NFe>
    <infNFe Id="NFe12345678901234567890123456789012345678901234">
      <ide>
        <dhEmi>2026-04-05T14:30:00</dhEmi>
        <dEmi>20260405</dEmi>
        <!-- Emissão -->
      </ide>
      <emit>
        <CNPJ>12345678901234</CNPJ>
        <xNome>Restaurante XYZ</xNome>
      </emit>
      <dest>
        <CPF>12345678901</CPF>
        <!-- Consumidor -->
      </dest>
      <det nItem="1">
        <prod>
          <code>001</code>
          <xProd>Prato Executivo</xProd>
          <qCom>1.00</qCom>
          <uCom>un</uCom>
          <vUnCom>45.50</vUnCom>
          <vItem12741>0.00</vItem12741>
        </prod>
        <imposto>
          <ICMS>
            <ICMSSN>
              <orig>0</orig>
              <CSOSN>102</CSOSN>
            </ICMSSN>
          </ICMS>
        </imposto>
      </det>
      <det nItem="2">
        <prod>
          <code>002</code>
          <xProd>Bebida</xProd>
          <qCom>2.00</qCom>
          <uCom>un</uCom>
          <vUnCom>8.50</vUnCom>
        </prod>
      </det>
      <total>
        <vProd>62.50</vProd>
        <vFrete>0.00</vFrete>
        <vSeg>0.00</vSeg>
        <vDesc>0.00</vDesc>
        <vNF>62.50</vNF>
      </total>
      <transp>
        <modFrete>9</modFrete>
      </transp>
    </infNFe>
  </NFe>
  <protNFe>
    <infProt>
      <tpAmb>2</tpAmb>
      <verAplic>0000000</verAplic>
      <chNFe>1234567890123456789012345678901234567890</chNFe>
      <dhRecbto>2026-04-05T14:35:00</dhRecbto>
      <nProt>123456789012345</nProt>
      <digVal>abcdef1234567890</digVal>
      <cStat>100</cStat>
      <xMotivo>Autorizado o uso da NF-e</xMotivo>
    </infProt>
  </protNFe>
</nfeProc>
```

#### Tarefa: Implementar Parser NFCe

```typescript
// apps/api/src/import/parsers/nfce-parser.ts

export interface NFCeData {
  chaveNFe: string;           // Chave da nota
  dataEmissao: string;         // ISO 8601 (YYYY-MM-DD)
  horaEmissao: string;         // HH:MM:SS
  cnpjEmissor: string;         // CNPJ do restaurante
  nomeEmissor: string;         // Nome do restaurante
  cpfConsumidor?: string;      // CPF ou vazio
  itens: NFCeItem[];
  valorTotal: number;          // Total em reais
  status: "autorizado" | "rejeitado" | "cancelado";
}

export interface NFCeItem {
  codigo: string;              // Código do item no PDV
  descricao: string;           // Nome do prato/item
  quantidade: number;
  unidade: string;             // "un", "kg", etc
  valorUnitario: number;
  valorItem: number;           // quantidade * valorUnitario
  icms?: {
    cst: string;
    aliquota?: number;
  };
}

export class NFCeParser {
  /**
   * Parse um arquivo XML NFCe e extrai dados estruturados.
   *
   * @param xmlBuffer Buffer do arquivo XML
   * @returns NFCeData estruturada ou null se inválido
   */
  static parse(xmlBuffer: Buffer): NFCeData | null {
    // TODO: Implementar
    // 1. Parser XML (usar xml2js ou similar)
    // 2. Extrair campos obrigatórios
    // 3. Validar estrutura
    // 4. Retornar objeto tipado
  }

  /**
   * Valida se XML é NFCe válida.
   */
  private static isValidNFCe(doc: any): boolean {
    // TODO: Verificar:
    // - Existe <nfeProc> ?
    // - Existe <NFe><infNFe> ?
    // - Existe <protNFe><infProt> ?
    // - cStat === 100 (autorizado)?
    return true;
  }

  /**
   * Extrai itens da nota fiscal.
   */
  private static extractItens(doc: any): NFCeItem[] {
    // TODO: Iterar sobre <det nItem="...">
    // Para cada item, extrair prod, imposto, etc
    return [];
  }

  /**
   * Converte NFCeData em Transaction (para inserir no banco).
   *
   * Observação: 1 NFCe = 1 transação com valor total,
   * ou seria melhor 1 NFCe = múltiplas transações (um por item)?
   *
   * Recomendação: 1 NFCe = 1 transação de receita.
   * Os itens ficam em `description` ou numa tabela separada se precisar.
   */
  static toTransaction(nfce: NFCeData, tenantId: string, userId: string) {
    return {
      tenant_id: tenantId,
      type: "income",           // Receita
      category: "nfce_importada",
      description: `NFCe ${nfce.chaveNFe} - ${nfce.nomeEmissor}`,
      amount: nfce.valorTotal,
      transaction_date: nfce.dataEmissao,
      status: "confirmed",
      import_source: "nfce",
      import_job_id: null,      // Será preenchido pelo controller
      created_by: userId,
      metadata: {
        chaveNFe: nfce.chaveNFe,
        cnpjEmissor: nfce.cnpjEmissor,
        dataHoraEmissao: `${nfce.dataEmissao}T${nfce.horaEmissao}`,
        itens: nfce.itens,       // Guardar itens para análise futura
      },
    };
  }
}
```

---

### 2️⃣ Parser CSV Universal

**Arquivo**: `apps/api/src/import/parsers/csv-parser.ts`

#### O que é?

Um parser que lê CSV/Excel de **qualquer PDV** com mapeamento customizável.

Arquivos esperados:
- **Saipos**: colunas em PT-BR (Data, Valor, Descrição, etc)
- **GrandChef**: colunas diferentes
- **Flinnt**: outro formato
- **Genérico**: o usuário mapeia

#### Tarefa: Implementar Parser CSV

```typescript
// apps/api/src/import/parsers/csv-parser.ts

export interface CSVTemplate {
  name: string;                     // "saipos", "grandchef", etc
  filePattern?: string;             // ex: "*.csv"
  columnMapping: Record<string, string>;  // ex: { "Data": "transaction_date" }
  dateFormat?: string;              // "DD/MM/YYYY", "YYYY-MM-DD", etc
  decimalSeparator?: "," | ".";     // Para valores
  defaultCategory?: string;
}

export class CSVParser {
  /**
   * Lista de templates pré-configurados.
   */
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
      columnMapping: {
        // Usuário vai customizar
      },
      dateFormat: "YYYY-MM-DD",
      decimalSeparator: ".",
    },
  };

  /**
   * Parseia CSV e aplica mapeamento de colunas.
   *
   * @param csvBuffer Buffer do arquivo CSV
   * @param template Template com mapeamento de colunas
   * @returns Array de transações normalizadas
   */
  static parse(
    csvBuffer: Buffer,
    template: CSVTemplate
  ): Array<Record<string, unknown>> {
    // TODO: Implementar
    // 1. Parsear CSV usando papaparse
    // 2. Aplicar columnMapping
    // 3. Normalizar datas segundo dateFormat
    // 4. Normalizar valores decimais
    // 5. Retornar array de transações
    return [];
  }

  /**
   * Detecta qual template usar baseado no arquivo.
   *
   * Heurística simples: procura colunas conhecidas no header.
   */
  static detectTemplate(csvBuffer: Buffer): CSVTemplate {
    // TODO: Implementar
    // 1. Ler primeiro header
    // 2. Contar quantas colunas conhecidas tem pra cada template
    // 3. Retornar template com mais matches
    // Fallback: "generic" (usuário precisa mapear manualmente)
    return this.TEMPLATES.generic;
  }

  /**
   * Converte linha CSV normalizada em Transaction.
   */
  static toTransaction(row: Record<string, unknown>, tenantId: string, userId: string) {
    return {
      tenant_id: tenantId,
      type: row["type"] ?? "expense",
      category: row["category"] ?? "importado",
      description: row["description"] ?? "Importado",
      amount: parseFloat(String(row["amount"]).replace(",", ".")),
      transaction_date: row["transaction_date"],
      status: "confirmed",
      import_source: "csv",
      import_job_id: null,
      created_by: userId,
    };
  }
}
```

---

### 3️⃣ Expandir Upload Endpoint

**Arquivo existente**: `apps/api/src/import/import.controller.ts`

O endpoint de upload já existe, mas precisa ser expandido para suportar **NFCe**.

#### Tarefa: Adicionar suporte a NFCe

```typescript
// apps/api/src/import/import.controller.ts

@Post("upload-nfce")
@Version("1")
@ApiConsumes("multipart/form-data")
@ApiOperation({ summary: "Importar NFCe XML diretamente" })
@ApiBody({
  schema: {
    type: "object",
    properties: {
      files: {
        type: "array",
        items: { type: "string", format: "binary" },
        description: "Um ou mais arquivos XML",
      },
    },
  },
})
async uploadNFCe(@Request() req: AuthenticatedRequest) {
  // TODO: Implementar
  // 1. Receber múltiplos arquivos XML
  // 2. Para cada XML:
  //    - Parsear com NFCeParser
  //    - Validar
  //    - Converter pra Transaction
  //    - Inserir no banco
  // 3. Retornar resultado (processadas, erros, etc)
}

@Post("upload-csv")
@Version("1")
@ApiConsumes("multipart/form-data")
@ApiOperation({
  summary: "Importar CSV com detecção automática de template",
})
@ApiBody({
  schema: {
    type: "object",
    properties: {
      file: { type: "string", format: "binary" },
      template: {
        type: "string",
        enum: ["saipos", "grandchef", "generic"],
        description: "Template de mapeamento. Se omitir, detecta automaticamente.",
      },
    },
  },
})
async uploadCSV(@Request() req: AuthenticatedRequest) {
  // TODO: Implementar
  // 1. Receber arquivo CSV
  // 2. Detectar ou usar template fornecido
  // 3. Parsear com CSVParser
  // 4. Validar linhas
  // 5. Inserir em batch
  // 6. Retornar resultado
}
```

---

## 📁 Estrutura de Arquivos

Crie esta estrutura dentro de `apps/api/src/import/`:

```
apps/api/src/import/
├── import.controller.ts          (⭐ Expandir com NFCe + CSV)
├── import.service.ts             (Já existe, pode manter ou refatorar)
├── import.module.ts              (Já existe)
├── parsers/
│   ├── nfce-parser.ts            (🆕 Criar)
│   ├── csv-parser.ts             (🆕 Criar)
│   └── index.ts                  (🆕 Exports)
└── dto/
    ├── upload-nfce.dto.ts        (🆕 Criar)
    └── upload-csv.dto.ts         (🆕 Criar)
```

---

## 🔌 Dependências Necessárias

Verifique se estão instaladas (já devem estar):

```json
{
  "papaparse": "^5.5.3",        // Parsear CSV
  "xlsx": "^0.18.5",            // Parsear Excel
  "xml2js": "^0.6.2",           // NOVO: Parsear XML (adicione ao package.json)
  "date-fns": "^4.1.0",         // Já tem, usar para datas
  "decimal.js": "^10.5.0"       // Já tem, usar para valores monetários
}
```

**TODO**: Adicionar `xml2js` ao `apps/api/package.json`:

```bash
cd apps/api
pnpm add xml2js
pnpm add -D @types/xml2js
```

---

## 🧪 Testes Recomendados

Crie arquivos de teste em `apps/api/test/parsers/`:

### Teste 1: NFCe Parser

```typescript
// apps/api/test/parsers/nfce-parser.spec.ts

describe("NFCeParser", () => {
  it("deve parsear NFCe válida", () => {
    const xmlBuffer = fs.readFileSync("test/fixtures/nfce-sample.xml");
    const result = NFCeParser.parse(xmlBuffer);

    expect(result).toBeDefined();
    expect(result?.chaveNFe).toBeTruthy();
    expect(result?.valorTotal).toBeGreaterThan(0);
    expect(result?.itens.length).toBeGreaterThan(0);
  });

  it("deve rejeitar NFCe cancelada", () => {
    const xmlBuffer = fs.readFileSync("test/fixtures/nfce-cancelada.xml");
    const result = NFCeParser.parse(xmlBuffer);
    expect(result?.status).toBe("cancelado");
  });

  it("deve converter pra Transaction corretamente", () => {
    const nfce: NFCeData = {
      chaveNFe: "123",
      dataEmissao: "2026-04-05",
      horaEmissao: "14:30:00",
      cnpjEmissor: "12345678901234",
      nomeEmissor: "Restaurante Test",
      itens: [],
      valorTotal: 100.50,
      status: "autorizado",
    };

    const tx = NFCeParser.toTransaction(nfce, "tenant-id", "user-id");
    expect(tx.type).toBe("income");
    expect(tx.category).toBe("nfce_importada");
    expect(tx.amount).toBe(100.50);
  });
});
```

### Teste 2: CSV Parser

```typescript
// apps/api/test/parsers/csv-parser.spec.ts

describe("CSVParser", () => {
  it("deve detectar template Saipos", () => {
    const csvBuffer = fs.readFileSync("test/fixtures/saipos.csv");
    const template = CSVParser.detectTemplate(csvBuffer);
    expect(template.name).toBe("saipos");
  });

  it("deve parsear CSV com mapeamento", () => {
    const csvBuffer = fs.readFileSync("test/fixtures/saipos.csv");
    const rows = CSVParser.parse(csvBuffer, CSVParser.TEMPLATES.saipos);

    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0]).toHaveProperty("transaction_date");
    expect(rows[0]).toHaveProperty("amount");
  });

  it("deve normalizar datas corretamente", () => {
    const csvBuffer = fs.readFileSync("test/fixtures/saipos.csv");
    const rows = CSVParser.parse(csvBuffer, CSVParser.TEMPLATES.saipos);

    // Saipos usa DD/MM/YYYY, deve converter pra YYYY-MM-DD
    const dateParts = String(rows[0]?.transaction_date).split("-");
    expect(dateParts.length).toBe(3);
    expect(dateParts[0]).toMatch(/^\d{4}$/); // YYYY
  });
});
```

---

## 📊 Fixtures de Teste

Crie arquivos de exemplo em `apps/api/test/fixtures/`:

### NFCe Sample
```xml
test/fixtures/nfce-sample.xml
```
(Use o exemplo da seção NFCe acima)

### CSV Saipos
```csv
test/fixtures/saipos.csv
Data,Hora,Valor,Descrição,Tipo,Categoria
05/04/2026,14:30,45.50,Prato Executivo,income,vendas
05/04/2026,14:35,120.00,Almoço Executivo,income,vendas
05/04/2026,15:00,12.50,Água Mineral,expense,suprimentos
```

---

## 🚀 Roteiro de Desenvolvimento

### Dia 1: Parser NFCe
- [ ] Criar `parsers/nfce-parser.ts` com interface `NFCeData`
- [ ] Implementar `NFCeParser.parse()` (parsexml → extração)
- [ ] Implementar `NFCeParser.toTransaction()`
- [ ] Adicionar testes
- [ ] Instalar `xml2js`

### Dia 2: Parser CSV
- [ ] Criar `parsers/csv-parser.ts` com templates
- [ ] Implementar `CSVParser.parse()`
- [ ] Implementar `CSVParser.detectTemplate()`
- [ ] Adicionar suporte a customização (usuário mapeia colunas)
- [ ] Testes

### Dia 3-4: Upload Endpoints
- [ ] Expandir `import.controller.ts` com `uploadNFCe()`
- [ ] Expandir com `uploadCSV()`
- [ ] Criar DTOs (`upload-nfce.dto.ts`, `upload-csv.dto.ts`)
- [ ] Testar endpoints via Swagger/Postman
- [ ] Validar inserção no banco

### Dia 5: Polish + Documentação
- [ ] Testes E2E
- [ ] Documentação de uso (como importar)
- [ ] Tratamento de erros melhorado
- [ ] Logs para debug

---

## 💡 Dicas de Implementação

### 1. XML Parsing com xml2js

```typescript
import { parseString } from "xml2js";

const xmlBuffer = ...;
const xmlText = xmlBuffer.toString("utf-8");

parseString(xmlText, (err, result) => {
  if (err) throw new Error(`XML inválido: ${err}`);

  // result = objeto com estrutura do XML
  const chaveNFe = result.nfeProc.NFe[0].infNFe[0].$.Id;
  const items = result.nfeProc.NFe[0].infNFe[0].det;
  // ... etc
});
```

### 2. Normalizar Datas com date-fns

```typescript
import { parse, format } from "date-fns";
import { ptBR } from "date-fns/locale";

// De "05/04/2026" → "2026-04-05"
const dateBR = "05/04/2026";
const dateObj = parse(dateBR, "dd/MM/yyyy", new Date());
const isoDate = format(dateObj, "yyyy-MM-dd");
```

### 3. Valores Monetários com Decimal.js

```typescript
import Decimal from "decimal.js";

const valor = "45,50"; // String brasileira
const normalizado = new Decimal(valor.replace(",", ".")).toNumber();
// = 45.50
```

### 4. Validar Estrutura XML

```typescript
private static isValidNFCe(doc: any): boolean {
  try {
    const nfe = doc?.nfeProc?.NFe?.[0];
    const infNFe = nfe?.infNFe?.[0];
    const protNFe = doc?.nfeProc?.protNFe?.[0];
    const cStat = protNFe?.infProt?.[0]?.cStat?.[0];

    return cStat === "100"; // Autorizado
  } catch {
    return false;
  }
}
```

---

## 🔗 Integração com Semana 3

Na Semana 3, estes parsers serão usados com **Trigger.dev** para:
1. Enfileirar jobs de importação
2. Processar em background (de forma assíncrona)
3. Enviar notificações quando terminar
4. Reprocessar em caso de erro

Por enquanto (Semana 2), apenas:
- ✅ Parsers bem estruturados
- ✅ Endpoints recebem arquivos
- ✅ Insere direto no banco (sync)

---

## 📚 Arquivos de Referência

**Já implementado (Semana 1)**:
- `apps/api/src/import/import.controller.ts` — Endpoints base
- `apps/api/src/import/import.service.ts` — Lógica de import (CSV/Excel)

**Você vai criar (Semana 2)**:
- `apps/api/src/import/parsers/nfce-parser.ts`
- `apps/api/src/import/parsers/csv-parser.ts`
- `apps/api/src/import/parsers/index.ts`

---

## 🎯 Checklist de Conclusão

- [ ] Dependência `xml2js` instalada
- [ ] `NFCeParser` implementado e testado
- [ ] `CSVParser` com templates implementado
- [ ] `uploadNFCe()` endpoint funcional
- [ ] `uploadCSV()` endpoint funcional
- [ ] Testes E2E passando
- [ ] Documentação de uso escrita
- [ ] Commit no git com mensagem descritiva

---

## 🚀 Próximas Passos (Semana 3)

1. **Trigger.dev Integration**
   - Enfileirar jobs de importação
   - Processar em background

2. **Webhook para Status**
   - Usuário acompanha progresso
   - Notificações ao terminar

3. **UI para Upload**
   - Componente React para enviar arquivo
   - Mostrar resultado/erros

---

**Bom desenvolvimento! 💪**
