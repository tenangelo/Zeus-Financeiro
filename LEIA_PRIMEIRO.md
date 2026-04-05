# LEIA PRIMEIRO — Semana 2 Setup

**Data**: 5 de Abril de 2026
**Status**: Ambiente pronto para desenvolvimento
**Desenvolvedor**: Angelo

---

## TL;DR (Muito Longo; Não Li)

```
1. Leia este arquivo (2 min)
2. Abra QUICK_START_SEMANA2.md (5 min)
3. Abra SEMANA2_PARSERS_IMPORTACAO.md (30 min detalhado)
4. Comece a implementar!
```

---

## Oi, Angelo! 👋

A Semana 2 é sobre **importar dados de PDVs** (restaurantes). Você vai criar dois parsers:

1. **Parser NFCe** — ler XMLs de vendas dos PDVs
2. **Parser CSV** — ler planilhas de qualquer PDV

Tudo já está estruturado. Basta seguir os passos.

---

## O que Já Está Pronto

✅ **Semana 1** (concluída)
- Multi-tenancy com RLS (segurança)
- Auth via Supabase
- Frontend + Backend rodando

✅ **Infraestrutura**
- Servidor NestJS (backend)
- Database Supabase
- Endpoints base de import

✅ **Documentação**
- Guias passo-a-passo
- Exemplos de código
- Estrutura do projeto

---

## O que Você Vai Fazer (Semana 2)

### 1. Parser NFCe (Dia 1)

**Arquivo**: `apps/api/src/import/parsers/nfce-parser.ts`

Uma NFCe é um XML emitido pelo PDV com dados de uma venda. Você vai:
- Parsear XML
- Extrair dados estruturados
- Converter para transação
- Inserir no banco

**Exemplo**: Restaurante vende prato por R$45,50 → XML → Banco de dados

### 2. Parser CSV (Dia 2)

**Arquivo**: `apps/api/src/import/parsers/csv-parser.ts`

Um CSV é uma planilha do PDV com múltiplas vendas. Você vai:
- Detectar formato automaticamente (Saipos, GrandChef, etc)
- Mapear colunas
- Normalizar datas/valores
- Inserir múltiplas transações

**Exemplo**: CSV com 100 vendas → Banco de dados (100 transações)

### 3. Endpoints de Upload (Dia 3-4)

**Arquivo**: `apps/api/src/import/import.controller.ts` (expandir)

Dois novos endpoints HTTP:
- `POST /import/upload-nfce` — recebe XML
- `POST /import/upload-csv` — recebe CSV

---

## Documentação Disponível

| Arquivo | Tempo | Descrição |
|---------|-------|-----------|
| **LEIA_PRIMEIRO.md** (este) | 2 min | Visão geral |
| **QUICK_START_SEMANA2.md** | 5 min | Quick reference (comece aqui!) |
| **SEMANA2_PARSERS_IMPORTACAO.md** | 30 min | Documentação detalhada + exemplos |
| **PREPARACAO_SEMANA2.md** | 10 min | Checklist de preparação |
| **ESTRUTURA_PROJETO_VISUAL.txt** | 5 min | Estrutura visual do projeto |
| **RODAR_LOCALMENTE.md** | 20 min | Setup do ambiente (já feito) |
| **FASE1_SEMANA1_IMPLEMENTACAO.md** | - | Referência da Semana 1 |

---

## Roteiro Recomendado

### Agora (15 minutos)
1. Leia este arquivo (LEIA_PRIMEIRO.md)
2. Abra QUICK_START_SEMANA2.md
3. Abra ESTRUTURA_PROJETO_VISUAL.txt (veja a árvore do projeto)

### Antes de Começar (30 minutos)
1. Leia SEMANA2_PARSERS_IMPORTACAO.md
   - Especialmente seção 1️⃣ (NFCe)
   - Especialmente seção 2️⃣ (CSV)
2. Instale dependência: `pnpm add xml2js @types/xml2js`
3. Crie arquivos vazios no `apps/api/src/import/parsers/`

### Desenvolvendo (5 dias)
**Dia 1**: Parser NFCe
**Dia 2**: Parser CSV
**Dia 3-4**: Endpoints
**Dia 5**: Testes + docs

---

## Arquivos que Você Vai Criar

```
✨ NOVO:
apps/api/src/import/parsers/
├── nfce-parser.ts      (200 linhas)
├── csv-parser.ts       (200 linhas)
└── index.ts            (3 linhas)

📝 EXPANDIR:
apps/api/src/import/
└── import.controller.ts (+ 2 endpoints)
```

Nenhum outro arquivo precisa ser tocado!

---

## Processo de Desenvolvimento

### Passo 1: Ler Documentação
```bash
# Abra no seu editor favorito
SEMANA2_PARSERS_IMPORTACAO.md
```

### Passo 2: Instalar Dependência
```bash
cd apps/api
pnpm add xml2js @types/xml2js
```

### Passo 3: Criar Arquivos
```bash
mkdir -p src/import/parsers
touch src/import/parsers/{nfce-parser,csv-parser,index}.ts
```

### Passo 4: Implementar (seguindo SEMANA2_PARSERS_IMPORTACAO.md)
```bash
code .  # ou use seu editor favorito
```

### Passo 5: Testar
```bash
# Via Swagger: http://localhost:3001/docs
# Via curl: veja exemplos em SEMANA2_PARSERS_IMPORTACAO.md
```

---

## Estrutura Rápida

```typescript
// nfce-parser.ts
class NFCeParser {
  static parse(xmlBuffer): NFCeData | null    // Parse XML
  static toTransaction(nfce, tenantId, userId)  // Converte pra transação
}

// csv-parser.ts
class CSVParser {
  static TEMPLATES = { saipos, grandchef, ... }
  static detectTemplate(csvBuffer): CSVTemplate  // Detecta formato
  static parse(csvBuffer, template): Row[]       // Parse CSV
  static toTransaction(row, tenantId, userId)    // Converte pra transação
}
```

---

## Checklist Pré-Desenvolvimento

- [ ] Leu QUICK_START_SEMANA2.md
- [ ] Leu SEMANA2_PARSERS_IMPORTACAO.md
- [ ] Instalou `xml2js`: `pnpm add xml2js`
- [ ] Criou pasta `apps/api/src/import/parsers/`
- [ ] Entendeu diferença entre NFCe (XML) e CSV
- [ ] Conhece qual endpoint vai implementar
- [ ] Backend (NestJS) está rodando: `pnpm run dev` em `apps/api`

---

## Dúvidas?

### "O que é NFCe?"
→ Leia seção 1️⃣ de SEMANA2_PARSERS_IMPORTACAO.md

### "Como parsear XML?"
→ Use `xml2js`, veja exemplos em SEMANA2_PARSERS_IMPORTACAO.md

### "Qual é a diferença entre NFCe e CSV?"
→ Leia PREPARACAO_SEMANA2.md (seção "Entender o Escopo")

### "Qual é a estrutura dos arquivos?"
→ Veja ESTRUTURA_PROJETO_VISUAL.txt

### "Preciso rodar testes?"
→ Não obrigatório agora, mas recomendado. Veja exemplos em SEMANA2_PARSERS_IMPORTACAO.md

---

## Próximos Passos Após Semana 2

- **Semana 3**: Trigger.dev (processamento em background)
- **Semana 4**: UI no frontend (botão de upload)
- **Semana 5**: Notificações e webhooks

---

## Suporte

Se travar em algo:

1. **Procure no SEMANA2_PARSERS_IMPORTACAO.md** (tem tudo)
2. **Procure em QUICK_START_SEMANA2.md** (exemplos rápidos)
3. **Veja exemplos de código já implementado** em `apps/api/src/import/import.service.ts`

---

## Links Úteis

- **Backend**: http://localhost:3001 (rodando com `pnpm run dev`)
- **Swagger**: http://localhost:3001/docs (documentação de endpoints)
- **Database**: https://app.supabase.com (seu projeto)

---

## Pronto?

Clique em **QUICK_START_SEMANA2.md** e comece! 🚀

---

**Bom desenvolvimento, Angelo!**

*Qualquer dúvida, releia os documentos .md — estão bem detalhados!*
