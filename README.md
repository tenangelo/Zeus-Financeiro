# Zeus Financeiro — AI CFO for Restaurant Management

A comprehensive financial management SaaS platform for restaurants built with NestJS, Next.js, and Supabase. Includes transaction tracking, financial statements (DRE), cost management (CMV), inventory tracking, and AI-powered insights.

![Status](https://img.shields.io/badge/status-active-brightgreen)
![License](https://img.shields.io/badge/license-proprietary-blue)

## Features

### 📊 Financial Management
- **DRE (Demonstrativo de Resultado)** — Complete income statement generation
- **CMV (Custo de Mercadoria Vendida)** — Cost of goods sold tracking from inventory
- **Cash Flow Dashboard** — Real-time revenue, expenses, and net position
- **Transaction Management** — Create, edit (pending only), and categorize transactions
- **Parcelamento Support** — Split payments across multiple installments (weekly/biweekly/monthly)

### 📦 Inventory & Stock
- **Stock Movement Tracking** — Purchase, consumption, waste, adjustments, returns
- **Ingredient Management** — Technical sheets (fichas técnicas) and recipes
- **Low Stock Alerts** — Automatic notifications for items below threshold
- **CMV Calculation** — Automatic cost calculation from consumption

### 🔐 Multi-Tenant Architecture
- **Row Level Security (RLS)** — Complete tenant isolation at database level
- **JWT Authentication** — ECC P-256 key support via Supabase Auth
- **Audit Logging** — Immutable transaction history with before/after tracking
- **Receipt Storage** — Secure attachment storage per transaction

### 🚀 Deployment Ready
- **GitHub Actions CI/CD** — Automatic testing and deployment on push
- **Vercel Frontend** — Serverless Next.js deployment
- **Railway Backend** — Container-based Node.js deployment
- **Supabase Database** — Managed PostgreSQL with RLS

## Tech Stack

### Frontend
- **Next.js 15** (App Router)
- **TypeScript** + React
- **Tailwind CSS** + Shadcn UI
- **Recharts** (Data visualization)

### Backend
- **NestJS** with Fastify adapter
- **TypeScript**
- **Decimal.js** (Financial precision)
- **Supabase Client** (Database & Auth)

### Database
- **Supabase** (PostgreSQL with RLS)
- **Row Level Security** (Multi-tenant isolation)
- **Postgres Triggers** (Audit logging)
- **Supabase Storage** (Receipt attachments)

## Getting Started

### Local Development

#### 1. Install Dependencies
```bash
# Install pnpm if needed
npm install -g pnpm

# Install project dependencies
pnpm install
```

#### 2. Set Up Environment Variables

**Frontend** — `apps/web/.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://mqayqkwcuxhovunmwgpy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
NEXT_PUBLIC_API_URL=http://localhost:3001
```

**Backend** — `apps/api/.env`:
```
NODE_ENV=development
PORT=3001
SUPABASE_URL=https://mqayqkwcuxhovunmwgpy.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
JWT_SECRET=<your-secret>
JWT_AUDIENCE=authenticated
JWT_ISSUER=https://mqayqkwcuxhovunmwgpy.supabase.co/auth/v1
ALLOWED_ORIGINS=http://localhost:3000
```

#### 3. Start Development Servers

```bash
# Terminal 1: Backend (Port 3001)
pnpm run dev --filter=apps/api

# Terminal 2: Frontend (Port 3000)
pnpm run dev --filter=apps/web
```

#### 4. Access the Application

- **Frontend**: http://localhost:3000
- **API**: http://localhost:3001
- **API Docs**: http://localhost:3001/api/docs

### Database Setup

Migrations are automatically applied via Supabase. To manually apply:

```bash
pnpm exec supabase db pull  # Pull latest migrations from Supabase
pnpm exec supabase migration new <name>  # Create new migration
pnpm exec supabase db push  # Push migrations
```

## Project Structure

```
.
├── apps/
│   ├── api/              # NestJS backend (port 3001)
│   │   ├── src/
│   │   │   ├── auth/     # JWT & tenant guards
│   │   │   ├── transactions/  # Transaction CRUD + DRE calculations
│   │   │   ├── stock/    # Inventory movement tracking
│   │   │   ├── cmv/      # Cost of goods sold
│   │   │   ├── ingredients/   # Ingredient management
│   │   │   ├── recipes/  # Technical sheets
│   │   │   └── import/   # POS data import
│   │   └── main.ts       # NestJS bootstrap
│   │
│   └── web/              # Next.js frontend (port 3000)
│       ├── src/
│       │   ├── app/
│       │   │   ├── login/         # Authentication
│       │   │   ├── dashboard/
│       │   │   │   ├── page.tsx   # Main dashboard
│       │   │   │   ├── transactions/  # Transaction management
│       │   │   │   ├── dre/       # Financial statements
│       │   │   │   ├── cmv/       # Cost tracking
│       │   │   │   ├── stock/     # Inventory
│       │   │   │   ├── ingredients/   # Ingredient admin
│       │   │   │   ├── recipes/   # Recipe management
│       │   │   │   └── import/    # Data imports
│       │   ├── components/    # Reusable UI components
│       │   ├── lib/           # Utilities & APIs
│       │   └── middleware.ts  # Auth middleware
│       └── tailwind.config.ts
│
├── packages/
│   ├── database/   # Supabase types (auto-generated)
│   └── shared/     # Shared utilities & validators
│
├── supabase/       # Database migrations & config
├── .github/workflows/  # CI/CD pipeline
├── vercel.json     # Frontend deployment config
├── railway.json    # Backend deployment config
└── DEPLOYMENT.md   # Production deployment guide
```

## API Endpoints

### Authentication
- `POST /auth/login` — User login
- `POST /auth/refresh` — Refresh JWT token
- `POST /auth/logout` — User logout

### Transactions
- `GET /v1/transactions` — List transactions (paginated)
- `POST /v1/transactions` — Create transaction
- `PATCH /v1/transactions/:id` — Update pending transaction
- `PATCH /v1/transactions/:id/confirm` — Mark as paid/received
- `GET /v1/transactions/:id/logs` — Audit history
- `GET /v1/transactions/cash-flow` — Cash flow summary
- `GET /v1/transactions/dre/calculate` — Generate DRE statement

### Stock Management
- `GET /v1/stock/movements` — List stock movements
- `POST /v1/stock/movements` — Record movement
- `GET /v1/ingredients` — List ingredients
- `POST /v1/ingredients` — Create ingredient

### Cost Management
- `GET /v1/cmv/calculate` — Calculate CMV for period

All endpoints require:
- `Authorization: Bearer <JWT token>`
- `x-tenant-id: <tenant UUID>` header for multi-tenant isolation

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete step-by-step deployment instructions.

### Quick Deploy

#### Frontend (Vercel)
1. Create Vercel account
2. Import GitHub repository
3. Set root directory: `apps/web`
4. Add environment variables
5. Deploy

#### Backend (Railway)
1. Create Railway account
2. Create project from GitHub
3. Set root directory: `apps/api`
4. Add environment variables
5. Deploy

### Environment Variables Required

**Vercel (Frontend)**:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_API_URL` (Railway backend URL)

**Railway (Backend)**:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET`
- `JWT_AUDIENCE`
- `JWT_ISSUER`
- `ALLOWED_ORIGINS` (Vercel frontend URL)

## Database Schema

### Core Tables
- `auth.users` — Supabase managed users
- `tenants` — Organization/restaurant records
- `transactions` — Financial transactions (revenue/expense)
- `transaction_logs` — Immutable audit trail
- `ingredients` — Product inventory
- `stock_movements` — Purchase/consumption/waste tracking
- `recipes` — Technical sheets (fichas técnicas)
- `categories` — Transaction categorization

### Key Policies
- Row Level Security (RLS) enforced per tenant
- Transaction logs are immutable (no UPDATE/DELETE)
- Receipts stored in private Supabase Storage bucket

## Features in Development

- ⏳ Automatic expense categorization via Claude API
- ⏳ Dashboard KPIs (CMV%, average ticket, prime cost, EBITDA%)
- ⏳ Accounts payable with pre-due alerts (3 days)
- ⏳ WhatsApp bot for AI insights
- ⏳ Multi-currency support
- ⏳ Custom report generation

## Contributing

1. Create feature branch: `git checkout -b feature/your-feature`
2. Make changes and commit: `git commit -m "feat: description"`
3. Push and create pull request
4. CI/CD will automatically test before merge

## Support

For issues or questions:
1. Check [DEPLOYMENT.md](./DEPLOYMENT.md) for deployment help
2. Review API documentation at `/api/docs`
3. Check database schema at `supabase/migrations/`

## License

Proprietary — All rights reserved

## Roadmap

### Phase 1 (Current) ✅
- Transaction management with audit logs
- DRE statement generation
- CMV calculation from inventory
- Stock tracking
- Receipt attachment
- Multi-tenant support

### Phase 2 (Next)
- AI-powered expense categorization
- WhatsApp notifications
- Advanced KPI dashboards
- Custom report builder

### Phase 3 (Future)
- Mobile app
- POS integrations
- Real-time collaboration
- Multi-currency support

---

**Built with ❤️ for restaurant management**
