# Preparação Ambiente — Semana 2

**Angelo**: Use este documento para verificar que tudo está pronto antes de começar.

---

## ✅ Pré-requisitos Atendidos

- ✅ Semana 1 (Multi-tenancy + RLS) **CONCLUÍDA**
- ✅ Ambiente local funcionando (Next.js + NestJS)
- ✅ Banco de dados com seed data
- ✅ Login funcionando
- ✅ Endpoints base de import prontos

---

## 📂 Estrutura do Projeto

```
zeus-financeiro/
├── apps/
│   ├── api/                          # Backend NestJS
│   │   ├── src/
│   │   │   ├── main.ts              # Porta 3001
│   │   │   ├── app.module.ts        # Modulos da app
│   │   │   ├── import/              # ⭐ Seu foco
│   │   │   │   ├── import.controller.ts      (Expandir com NFCe)
│   │   │   │   ├── import.service.ts        (Existente)
│   │   │   │   ├── import.module.ts         (Existente)
│   │   │   │   └── parsers/         (CRIAR)
│   │   │   │       ├── nfce-parser.ts       (NOVO)
│   │   │   │       ├── csv-parser.ts        (NOVO)
│   │   │   │       └── index.ts             (NOVO)
│   │   │   ├── auth/                # Guards de autenticação
│   │   │   ├── transactions/        # Transações (onde insere dados)
│   │   │   └── ...
│   │   ├── package.json             # Dependências (add xml2js)
│   │   └── test/                    # Testes (criar fixtures)
│   │
│   └── web/                         # Frontend Next.js
│       ├── src/
│       │   ├── app/
│       │   └── lib/
│       └── ...
│
├── packages/
│   ├── database/                    # Types gerados (não mexer)
│   └── shared/                      # Types compartilhadas
│
├── supabase/
│   ├── migrations/                  # Scripts SQL
│   └── seed.sql                     # Dados de teste
│
└── 📄 Documentação
    ├── SEMANA2_PARSERS_IMPORTACAO.md  (⭐ Leia primeiro)
    ├── RODAR_LOCALMENTE.md
    └── FASE1_SEMANA1_IMPLEMENTACAO.md
```

---

## 🎯 O que Você vai Criar (Semana 2)

### 1. Parser NFCe (`apps/api/src/import/parsers/nfce-parser.ts`)

Arquivo: ~200-250 linhas

**Responsabilidades**:
- Receber Buffer XML (NFCe do PDV)
- Parsear XML → extrair dados estruturados
- Validar se é NFCe válida (status = "autorizado")
- Converter para formato interno (Transaction)
- Retornar dados ou null se inválido

**Saída esperada**: `NFCeData` (interface)
```typescript
{
  chaveNFe: "1234567890123456789012345678901234567890",
  dataEmissao: "2026-04-05",
  horaEmissao: "14:30:00",
  cnpjEmissor: "12345678901234",
  nomeEmissor: "Restaurante XYZ",
  valorTotal: 125.50,
  itens: [
    { codigo: "001", descricao: "Prato Executivo", quantidade: 1, ... },
    { codigo: "002", descricao: "Bebida", quantidade: 2, ... },
  ],
  status: "autorizado"
}
```

### 2. Parser CSV (`apps/api/src/import/parsers/csv-parser.ts`)

Arquivo: ~200-250 linhas

**Responsabilidades**:
- Receber Buffer CSV/Excel
- Detectar template automaticamente (Saipos, GrandChef, etc)
- Aplicar mapeamento de colunas
- Normalizar datas e valores monetários
- Retornar array de transações

**Exemplos de templates**:
```typescript
{
  saipos: {
    "Data" → "transaction_date",
    "Valor" → "amount",
    "Descrição" → "description",
    ...
  },
  grandchef: {
    "data_venda" → "transaction_date",
    "valor_total" → "amount",
    ...
  }
}
```

### 3. Endpoints de Upload (`apps/api/src/import/import.controller.ts`)

Adicionar 2 novos endpoints:

**POST /import/upload-nfce**
```bash
curl -X POST http://localhost:3001/api/import/upload-nfce \
  -H "Authorization: Bearer <token>" \
  -F "files=@nfe-001.xml" \
  -F "files=@nfe-002.xml"
```

**POST /import/upload-csv**
```bash
curl -X POST http://localhost:3001/api/import/upload-csv \
  -H "Authorization: Bearer <token>" \
  -F "file=@vendas-abril.csv" \
  -F "template=saipos"
```

---

## 🚀 Como Começar

### Passo 1: Revisar Documentação (30 min)

1. Abra `SEMANA2_PARSERS_IMPORTACAO.md` ← **Leia tudo!**
2. Entenda estrutura de NFCe (seção "O que é NFCe?")
3. Veja exemplo de XML em branco
4. Veja interfaces TypeScript esperadas

### Passo 2: Instalar Dependência

```bash
cd apps/api
pnpm add xml2js
pnpm add -D @types/xml2js
```

### Passo 3: Criar Arquivo Base

```bash
# Criar diretório de parsers
mkdir -p apps/api/src/import/parsers

# Criar arquivo vazio
touch apps/api/src/import/parsers/nfce-parser.ts
touch apps/api/src/import/parsers/csv-parser.ts
touch apps/api/src/import/parsers/index.ts
```

### Passo 4: Começar a Implementar

Use Claude Code para:
1. Criar estrutura das classes
2. Implementar métodos um a um
3. Testar localmente
4. Iterar até ficar bom

---

## 📋 Checklist Pré-Semana 2

Execute isto agora (antes de criar os parsers):

- [ ] Leia `SEMANA2_PARSERS_IMPORTACAO.md` completo
- [ ] `cd apps/api && pnpm add xml2js @types/xml2js`
- [ ] `mkdir -p apps/api/src/import/parsers`
- [ ] Entenda estrutura de NFCe (XML example acima)
- [ ] Entenda diferença entre parsers:
  - **NFCe** = XML → dados estruturados → 1 transação
  - **CSV** = Planilha → múltiplas transações
- [ ] Veja endpoints que já existem em `import.controller.ts`

---

## 🎬 Iniciar Desenvolvimento com Claude Code

### Opção A: Editor em Tempo Real

```bash
# Abra o projeto no Claude Code
cd /path/to/zeus-financeiro
claude --no-docs  # Abre interface de edição
```

Você vai ver:
- Estrutura do projeto à esquerda
- Editor de código no meio
- Terminal na parte inferior

### Opção B: Usar VS Code + Integração Claude

Se preferir seu editor:
1. Abra VS Code: `code .` (na pasta do projeto)
2. Instale extensão Claude Code
3. Use atalhos: `Cmd+Shift+C` (Mac) ou `Ctrl+Shift+C` (Windows/Linux)

---

## 💡 Dicas Importantes

### Sobre o Parser NFCe

- **Cada NFCe = 1 transação** (do tipo "income")
- Os itens (pratos, bebidas) ficam em `metadata` para análise futura
- Validar status = "autorizado" (cStat === 100)
- Extrair chaveNFe para rastreabilidade

### Sobre o Parser CSV

- **Templates pré-configurados** para PDVs comuns
- **Detecção automática**: função analisa headers e escolhe template
- **Fallback**: se não reconhecer, usa "generic" e usuário mapeia manualmente
- **Normalizar datas**: BD sempre espera `YYYY-MM-DD`
- **Normalizar valores**: substituir vírgula por ponto antes de parse

### Erros Comuns (não cometer!)

❌ Não fazer insert diretamente no banco dentro do parser
   → Parser deve retornar dados, controller faz insert

❌ Não parsear data sem normalizar
   → Sempre retornar `YYYY-MM-DD`

❌ Não esquecer `tenant_id` nas transações
   → RLS vai rejeitar

✅ Usar interfaces TypeScript
   → `NFCeData`, `NFCeItem`, `CSVTemplate`, etc

✅ Adicionar testes
   → Mínimo: 1 teste por função principal

---

## 📊 Métricas de Sucesso (Semana 2)

**Até o fim da semana, você deve ter**:

- ✅ `NFCeParser` funcional (parseia XML válida)
- ✅ `CSVParser` funcional (detecta template, parseia)
- ✅ Endpoints `/import/upload-nfce` e `/import/upload-csv`
- ✅ Testes para ambos parsers
- ✅ Dados inseridos no banco corretamente
- ✅ RLS validando (so vê dados de seu tenant)
- ✅ Documentação de como usar os endpoints

**Não é necessário** (Semana 3):
- Trigger.dev (background jobs)
- UI no frontend
- Webhooks

---

## 📚 Referências Rápidas

| Item | Localização |
|------|------------|
| Documentação Semana 2 | `SEMANA2_PARSERS_IMPORTACAO.md` |
| Exemplo NFCe XML | `SEMANA2_PARSERS_IMPORTACAO.md` (seção 1️⃣) |
| Controlador atual | `apps/api/src/import/import.controller.ts` |
| Service existente | `apps/api/src/import/import.service.ts` |
| Schema de transactions | `supabase/migrations/*.sql` |
| Testes exemplo | `apps/api/test/**/*.spec.ts` |

---

## 🆘 Se Travar...

1. **"Não entendo XML"**
   - Veja exemplo em `SEMANA2_PARSERS_IMPORTACAO.md` (Tarefa 1️⃣)
   - Use `xml2js` — converte pra objeto JS

2. **"Qual é a diferença entre NFCe e CSV?"**
   - **NFCe**: 1 arquivo XML = 1 venda completa = 1 transação
   - **CSV**: 1 arquivo planilha = múltiplas vendas = múltiplas transações

3. **"Como estruturo o parser?"**
   - Veja interfaces em `SEMANA2_PARSERS_IMPORTACAO.md`
   - Siga exatamente: parse() → validate() → extract() → return

4. **"Erro ao inserir no banco?"**
   - Verificar: tenant_id está preenchido?
   - Verificar: transaction_date é formato válido (YYYY-MM-DD)?
   - Verificar: amount é número válido?

---

## 📞 Suporte

Qualquer dúvida:
1. Abra `SEMANA2_PARSERS_IMPORTACAO.md` (tem tudo!)
2. Procure por palavra-chave (ex: "NFCe", "CSV")
3. Veja exemplos de código já implementados
4. Consulte referências externas (links no fim da doc)

---

**Você está pronto! Let's go! 🚀**
