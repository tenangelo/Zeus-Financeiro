# Zeus Financeiro — Environment Setup (Claude Code)

## Projeto Overview

**Status**: Semana 2 (Parsers de Importação)
**Stack**: Next.js (Frontend) + NestJS (Backend) + Supabase (BD)
**Monorepo**: pnpm workspaces (Turborepo)

---

## Pastas Principais

```
apps/
├── web/          → Frontend Next.js (localhost:3000)
│   └── src/app/
└── api/          → Backend NestJS (localhost:3001)
    └── src/
        ├── import/    ⭐ SEU FOCO (parsers, upload)
        ├── auth/
        ├── transactions/
        └── ...

supabase/         → Database + RLS policies
packages/         → Shared types (@zeus/database, @zeus/shared)
```

---

## Desenvolvimento Semana 2

### Criar Arquivos

```bash
# Parsers (NOVO)
apps/api/src/import/parsers/nfce-parser.ts
apps/api/src/import/parsers/csv-parser.ts
apps/api/src/import/parsers/index.ts

# DTOs (NOVO, opcional)
apps/api/src/import/dto/upload-nfce.dto.ts
apps/api/src/import/dto/upload-csv.dto.ts
```

### Expandir Controller

```
apps/api/src/import/import.controller.ts
  + @Post("upload-nfce")
  + @Post("upload-csv")
```

---

## Rodar Projeto

```bash
# Terminal 1: Frontend
cd apps/web && pnpm run dev
# → http://localhost:3000

# Terminal 2: Backend
cd apps/api && pnpm run dev
# → http://localhost:3001
```

---

## Documentação Importante

1. **QUICK_START_SEMANA2.md** (5 min) ← COMECE AQUI
2. **SEMANA2_PARSERS_IMPORTACAO.md** (detailed)
3. **PREPARACAO_SEMANA2.md** (checklist)

---

## Dependências Instaladas

- `xml2js` ← Parsear XML NFCe (instale com: `pnpm add xml2js`)
- `papaparse` ← Parsear CSV (já instalado)
- `xlsx` ← Parsear Excel (já instalado)
- `date-fns` ← Normalizar datas (já instalado)
- `decimal.js` ← Valores monetários (já instalado)

---

## Estrutura do Parser NFCe

**Input**: Buffer XML (arquivo do PDV)
**Process**: Parsear → Validar → Extrair dados
**Output**: `NFCeData` ou null

```typescript
{
  chaveNFe: string;
  dataEmissao: "YYYY-MM-DD";
  valorTotal: number;
  itens: { codigo, descricao, quantidade, ... }[];
  status: "autorizado" | "rejeitado" | "cancelado";
}
```

---

## Estrutura do Parser CSV

**Input**: Buffer CSV + Template (Saipos, GrandChef, etc)
**Process**: Detectar template → Mapear colunas → Normalizar
**Output**: Array de transações

```typescript
[
  { transaction_date: "2026-04-05", amount: 45.50, ... },
  { transaction_date: "2026-04-05", amount: 120.00, ... },
]
```

---

## Endpoints a Criar

### POST /import/upload-nfce
```bash
curl -X POST http://localhost:3001/api/import/upload-nfce \
  -H "Authorization: Bearer <token>" \
  -F "files=@nfe-001.xml" \
  -F "files=@nfe-002.xml"

Retorna:
{
  processed: number,
  failed: number,
  errors: []
}
```

### POST /import/upload-csv
```bash
curl -X POST http://localhost:3001/api/import/upload-csv \
  -H "Authorization: Bearer <token>" \
  -F "file=@vendas.csv" \
  -F "template=saipos"  # opcional

Retorna:
{
  rows_processed: number,
  rows_failed: number,
  errors: []
}
```

---

## Banco de Dados (Supabase)

**Tabelas relacionadas**:
- `transactions` ← Onde inserir dados
- `import_jobs` ← Rastreamento de imports
- `profiles` ← Usuário autenticado
- `tenants` ← Empresa do usuário (multi-tenancy)

**RLS**: Todas as queries filtram por tenant_id (segurança)

---

## Testes

Criar em: `apps/api/test/parsers/`

```bash
# Rodar testes
cd apps/api && pnpm run test

# Testes específicos
pnpm run test -- parsers/nfce-parser.spec.ts
```

---

## Próximas Fases

- **Semana 3**: Trigger.dev (background jobs)
- **Semana 4**: UI no frontend
- **Semana 5**: Notificações + Webhooks

---

**Happy coding! 🚀**
