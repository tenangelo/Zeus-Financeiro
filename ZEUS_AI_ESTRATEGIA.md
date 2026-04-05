# Zeus Financeiro — Estratégia de IA e Posicionamento

## Visão: "Assessoria Financeira com Resultados"

O Zeus não é um PDV. Não compete com iFood, Stone, TOTVS ou Saipos. O Zeus é o **CFO de IA do restaurante** — um assessor financeiro que importa dados de qualquer PDV, analisa, prevê e **avisa o dono no WhatsApp** quando algo precisa de atenção.

Nenhuma ferramenta no mercado brasileiro faz isso de verdade hoje. A Tamy (tamy.ai) se aproxima, mas depende de humanos classificando notas. O Zeus automatiza com IA.

---

## Arquitetura de Importação de PDV (Não Reinventar a Roda)

### Princípio: Ser o "Assessor", não o "Operador"

O restaurante já tem PDV (Saipos, GrandChef, ControleNaMão, TOTVS, Stone, etc). O Zeus **importa os dados de vendas** e transforma em inteligência financeira.

### Padrões de Importação Suportados

| Fonte | Formato | Como Importar |
|-------|---------|---------------|
| NFCe (Nota Fiscal do Consumidor) | XML modelo 65 | Upload manual ou API SEFAZ |
| SAT (SP) / MFe (CE) | XML | Upload ou integração |
| Relatórios de PDV | CSV/XLSX | Parser universal |
| Planilhas manuais | XLSX/CSV | Template Zeus padronizado |
| iFood / Rappi / 99Food | API ou CSV exportado | Connector específico |
| Stone / Cielo / Rede | OFX / CSV | Importação bancária |
| SPED Fiscal | TXT padrão | Parser SPED |

### Fluxo Técnico

```
[PDV existente] → exporta XML/CSV
      ↓
[Zeus Importer] → Parser + Classificação IA
      ↓
[Supabase] → Dados normalizados por tenant
      ↓
[AI Engine] → Análises, previsões, alertas
      ↓
[WhatsApp/Telegram] → Notificação para o gestor
```

### Implementação Open-Source

- **Parser XML NFCe/SAT**: Usar `fast-xml-parser` (npm) — já compatível com Node.js/NestJS
- **Parser OFX**: Usar `ofx-js` para importar extratos bancários
- **Parser CSV universal**: Já tem `papaparse` no projeto
- **Parser XLSX**: Já tem `xlsx` no projeto

---

## Funcionalidades de IA — O Diferencial Real

### 1. Zeus Alertas (WhatsApp/Telegram)

O dono do restaurante recebe mensagens proativas sobre a saúde financeira do negócio. Não precisa abrir sistema nenhum.

**Alertas Críticos (vermelho):**
- "Conta de R$ 2.340 da distribuidora ABC vence amanhã. Saldo atual: R$ 1.800. Atenção!"
- "Custo do prato 'Filé à Parmegiana' subiu 23% este mês. Margem atual: 38% → 15%. Revisar ficha técnica."
- "Caixa projetado para daqui 7 dias: NEGATIVO em R$ 3.200. Ações sugeridas: [ver no app]"

**Alertas de Oportunidade (verde):**
- "Prato 'Hambúrguer Artesanal' vendeu 47% a mais esta semana. Considere destaque no cardápio."
- "Sexta-feira é historicamente seu melhor dia. Ticket médio: R$ 78. Sugestão: promoção de entrada para aumentar."
- "Fornecedor XYZ aumentou preço 12% nos últimos 3 meses. Encontrei 2 alternativas com preço menor."

**Resumo Diário (toda manhã):**
- "Bom dia! Ontem: Faturamento R$ 8.420 | Ticket médio R$ 52 | 162 atendimentos | CMV 31%. Semana está 8% acima da meta."

**Resumo Semanal (segunda-feira):**
- DRE simplificado da semana
- Top 5 pratos mais lucrativos
- Top 5 pratos que estão dando prejuízo
- Contas a pagar da semana
- Comparativo com semana anterior

**Integração técnica:**
- [Evolution API](https://github.com/EvolutionAPI/evolution-api) — WhatsApp open-source, REST API, Docker, multi-instância por tenant
- [WhatsApp Node.js SDK](https://github.com/WhatsApp/WhatsApp-Nodejs-SDK) — SDK oficial da Meta para plano Business
- Telegram Bot API — nativo, gratuito, sem limitações
- Trigger via Trigger.dev ou jobs agendados no NestJS

---

### 2. Zeus Previsão (IA Preditiva)

Baseado nos dados de vendas importados do PDV, a IA prevê:

**Previsão de Demanda:**
- Quantos pratos de cada tipo serão vendidos amanhã/semana/mês
- Baseado em: histórico de vendas, dia da semana, clima (API OpenWeatherMap), eventos locais, feriados
- Precisão reportada pela indústria: até 95% (fonte: Lineup.ai)
- **Impacto real: redução de 30-40% no desperdício** (fonte: SynergySuite)

**Previsão de Caixa:**
- Projeção de fluxo de caixa para 7, 15 e 30 dias
- Considera contas a pagar agendadas + previsão de receita
- Alerta antecipado de caixa negativo

**Previsão de CMV:**
- Se o preço de um insumo subir X%, quanto impacta cada prato
- Simulação de cenários de inflação no cardápio

**Implementação:**
- Modelo: regressão + time series (pode começar com Prophet do Facebook, open-source)
- Dados: histórico de vendas (XML importado) + clima (OpenWeatherMap API free) + calendário
- Stack: Python (scikit-learn/Prophet) como microserviço ou diretamente com TensorFlow.js no Node

---

### 3. Zeus Cardápio Inteligente (Menu Engineering com IA)

Classificação automática de cada prato do cardápio:

| Categoria | Popularidade | Lucratividade | Ação Sugerida |
|-----------|-------------|---------------|---------------|
| Estrela | Alta | Alta | Manter e destacar |
| Cavalo de Batalha | Alta | Baixa | Aumentar preço ou reduzir custo |
| Quebra-Cabeça | Baixa | Alta | Promover mais |
| Abacaxi | Baixa | Baixa | Substituir do cardápio |

**O que a IA faz automaticamente:**
- Calcula margem real de cada prato (dados de venda do PDV + custo dos insumos)
- Sugere reajuste de preço baseado em elasticidade
- Identifica pratos que vendem juntos (cross-sell)
- Sugere combos lucrativos baseado em dados reais
- Alerta quando um prato muda de categoria (ex: "Estrela" virou "Abacaxi")

---

### 4. Zeus DRE Automático

Gera o Demonstrativo de Resultado do Exercício automaticamente:

```
RECEITA BRUTA (importada do PDV)
  (-) Impostos sobre vendas
  (-) Taxas de cartão/delivery
= RECEITA LÍQUIDA
  (-) CMV (Custo de Mercadoria Vendida)
= LUCRO BRUTO
  (-) Folha de pagamento
  (-) Aluguel
  (-) Energia/Água/Gás
  (-) Marketing
  (-) Outros custos fixos
= RESULTADO OPERACIONAL (EBITDA)
  (-) Juros/financeiros
= LUCRO LÍQUIDO
```

**Diferencial IA:**
- Classificação automática de despesas por categoria (IA lê a descrição do lançamento)
- Comparativo automático mês a mês com destaque de variações
- Benchmark: compara com médias do setor de food service
- Alerta: "Seu CMV está em 38%. A média do setor é 32%. Economia potencial: R$ 4.200/mês."

---

### 5. Zeus Contas (Gestão de Contas a Pagar/Receber)

**Contas a Pagar:**
- Importação automática via XML de notas de fornecedores
- Agrupamento por fornecedor e categoria
- Alerta no WhatsApp 3 dias antes do vencimento
- Sugestão de priorização quando caixa está apertado

**Contas a Receber:**
- Reconciliação automática: vendas do PDV x extrato bancário (OFX)
- Identifica diferenças (taxa de cartão cobrada a mais, chargeback, etc)
- Controle de vendas fiado / conta de clientes

---

### 6. Zeus Ficha Técnica com IA

O custo real de cada prato, atualizado automaticamente:

- Cadastro de insumos com preço (pode importar da última nota do fornecedor)
- Composição de cada prato (receita)
- Cálculo automático do custo
- **IA monitora**: quando o preço de um insumo muda na nota fiscal, recalcula todos os pratos afetados
- Alerta: "O preço do queijo mussarela subiu 15%. 12 pratos foram afetados. O prato mais impactado é a Pizza Margherita (margem caiu de 65% para 52%)."

---

### 7. Zeus Benchmark (KPIs do Restaurante)

Dashboard com os indicadores que importam:

| KPI | O que mede | Meta típica |
|-----|-----------|-------------|
| CMV | Custo sobre receita | 28-35% |
| Ticket Médio | Gasto por cliente | Varia por tipo |
| Custo de Folha | Folha sobre receita | 25-35% |
| Prime Cost | CMV + Folha sobre receita | < 65% |
| Giro de Mesa | Quantas vezes a mesa é usada | 2-3x |
| Mix de Vendas | % de cada canal (salão/delivery/takeout) | Varia |
| Break-even | Faturamento mínimo para pagar custos | Calculado |
| Margem EBITDA | Resultado operacional | 10-20% |
| Desperdício | % de insumos desperdiçados | < 5% |

**IA atua em:**
- Alertas quando KPI sai da faixa saudável
- Tendências: "Seu CMV está subindo 2% ao mês nos últimos 3 meses"
- Comparativo entre unidades (para redes)
- Sugestões automáticas de ação para cada KPI fora da meta

---

## Stack Técnica e Open-Source Recomendados

### Mensageria (WhatsApp/Telegram)
| Solução | Tipo | Custo | Melhor para |
|---------|------|-------|-------------|
| [Evolution API](https://github.com/EvolutionAPI/evolution-api) | Open-source | Grátis (self-host) | MVP e testes |
| [WhatsApp Business SDK](https://github.com/WhatsApp/WhatsApp-Nodejs-SDK) | Oficial Meta | Pago por mensagem | Produção (compliance) |
| Telegram Bot API | Oficial | Grátis | Canal secundário |

### IA / Machine Learning
| Solução | Uso |
|---------|-----|
| OpenAI API / Claude API | Classificação de despesas, chat financeiro, análise de notas |
| Prophet (Facebook) | Previsão de demanda e faturamento |
| scikit-learn | Menu engineering, clustering de produtos |
| OpenWeatherMap API | Dados de clima para previsão de vendas |

### Referências de Código Open-Source
| Projeto | O que extrair |
|---------|---------------|
| [Midday](https://github.com/midday-ai/midday) | Padrões de financial overview, reconciliação, AI assistant (Next.js + Supabase) |
| [Twenty CRM](https://github.com/twentyhq/twenty) | Arquitetura multi-tenant, objetos customizáveis (NestJS) |
| [URY ERP](https://github.com/ury-erp/ury) | Lógica de domínio restaurante, POS bridge, KOT |
| [Metabase](https://github.com/metabase/metabase) | Dashboards embeddable por tenant via iframe |
| [Trigger.dev](https://trigger.dev) | Jobs agendados (alertas, relatórios, importações) |

---

## Concorrência e Posicionamento

### O que existe hoje (e por que não resolve)

| Concorrente | O que faz | O que falta |
|-------------|-----------|-------------|
| Saipos | PDV + gestão operacional | Sem IA, sem alertas proativos, financeiro básico |
| GrandChef | PDV + controle financeiro | Não importa de outros PDVs, sem IA preditiva |
| Tamy | Classificação financeira via WhatsApp | Depende de humanos, sem previsão, sem menu engineering |
| ContaAzul | Financeiro genérico | Não entende restaurante, sem CMV, sem ficha técnica |
| Omie | ERP genérico | Complexo demais para restaurante, sem KPIs específicos |
| TOTVS Chef | ERP restaurante | Caro, pesado, sem IA, legado |

### Posicionamento Zeus

> **"O Zeus é o CFO que todo restaurante precisa mas não pode pagar."**

- Não é PDV (importa de qualquer um)
- Não é contabilidade (é gestão financeira operacional)
- Não é ERP pesado (é leve, mobile-first, via WhatsApp)
- É IA que trabalha 24/7 olhando seus números e te avisando

---

## Modelo de Negócio Sugerido

### SaaS Tenant — Planos

| Plano | Público | Preço sugerido | Funcionalidades |
|-------|---------|----------------|-----------------|
| Essencial | 1 unidade, pequeno | R$ 197/mês | Importação PDV, DRE automático, alertas WhatsApp básicos |
| Profissional | 1-3 unidades | R$ 397/mês | + Previsão IA, menu engineering, ficha técnica, benchmark |
| Rede | 4+ unidades | R$ 697/mês + R$97/unidade | + Comparativo entre unidades, dashboard consolidado |

### Upsell com IA
- Consultoria IA sob demanda: "Zeus, como reduzir meu CMV em 5%?" → R$ 47/consulta
- Relatório mensal premium com análise detalhada → incluso no plano Profissional+

---

## Próximos Passos Técnicos (Roadmap)

### Fase 1 — Fundação (Semanas 1-4)
- [ ] Multi-tenancy no Supabase (Row Level Security por tenant)
- [ ] Parser XML NFCe + CSV para importação de vendas
- [ ] Modelo de dados: pratos, insumos, fichas técnicas, contas
- [ ] Auth + onboarding do restaurante

### Fase 2 — Inteligência Financeira (Semanas 5-8)
- [ ] DRE automático a partir dos dados importados
- [ ] Classificação automática de despesas (OpenAI/Claude API)
- [ ] Dashboard financeiro com Recharts (já no projeto)
- [ ] Contas a pagar/receber com alertas

### Fase 3 — IA e Mensageria (Semanas 9-12)
- [ ] Integração Evolution API / WhatsApp Business
- [ ] Alertas proativos (vencimentos, caixa, CMV)
- [ ] Resumo diário/semanal automático
- [ ] Chat: dono pergunta, Zeus responde com dados reais

### Fase 4 — Previsão e Otimização (Semanas 13-16)
- [ ] Previsão de demanda (Prophet + dados históricos)
- [ ] Menu Engineering automático
- [ ] Ficha técnica com recálculo automático
- [ ] KPIs com benchmark do setor

### Fase 5 — Escala (Semanas 17-20)
- [ ] Metabase embedded para dashboards avançados
- [ ] Suporte a múltiplas unidades
- [ ] API pública para integrações
- [ ] App mobile (PWA ou React Native)

---

## Resumo Executivo

O Zeus Financeiro tem uma oportunidade real de mercado. O setor de food service no Brasil fatura mais de R$ 200 bilhões/ano, com mais de 1 milhão de estabelecimentos, e a maioria opera no escuro financeiramente. A combinação de **importação universal de PDV + IA preditiva + alertas via WhatsApp** cria um produto que não existe no mercado hoje.

O posicionamento como "assessoria financeira com resultados" (e não como mais um sistema) é a jogada certa. O restaurante não quer mais um login. Quer alguém (ou algo) que cuide dos números e avise quando precisa agir.

O Zeus pode ser esse "alguém".
