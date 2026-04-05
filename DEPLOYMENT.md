# Zeus Financeiro — Deployment Guide

This guide covers deploying Zeus Financeiro to production using **Vercel** (frontend) and **Railway** (backend).

## Prerequisites

- GitHub account with the repository: https://github.com/tenangelo/Zeus-Financeiro
- Supabase project (project ref: `mqayqkwcuxhovunmwgpy`)
- Supabase credentials:
  - Project URL: Get from Settings → API
  - Anon Key: Get from Settings → API (public key)
  - Service Role Key: Keep secure (for backend only)

---

## Step 1: Deploy Frontend to Vercel

### 1.1 Create Vercel Account

1. Go to https://vercel.com/signup
2. Sign up with GitHub (recommended)
3. Authorize Vercel to access your GitHub account

### 1.2 Create New Project

1. Dashboard → "Add New..." → "Project"
2. Select repository: `Zeus-Financeiro`
3. Configure project:
   - **Framework Preset**: Next.js
   - **Root Directory**: `apps/web`
   - **Build Command**: `pnpm run build`
   - **Output Directory**: `.next`

### 1.3 Set Environment Variables

In Vercel project settings → Environment Variables, add:

```
NEXT_PUBLIC_SUPABASE_URL=https://mqayqkwcuxhovunmwgpy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_API_URL=https://api-zeus.railway.app (or your Railway backend URL)
```

### 1.4 Deploy

- Click "Deploy"
- Wait for build to complete
- Your frontend will be live at `https://<project>.vercel.app`

---

## Step 2: Deploy Backend to Railway

### 2.1 Create Railway Account

1. Go to https://railway.app
2. Sign up with GitHub
3. Authorize Railway to access your GitHub account

### 2.2 Create New Project

1. Dashboard → "Create New Project"
2. Select "Deploy from GitHub repo"
3. Choose `Zeus-Financeiro` repository
4. Configure:
   - **Root Directory**: `apps/api`
   - **Node Version**: 20

### 2.3 Set Environment Variables

In Railway project settings → Variables, add:

```
NODE_ENV=production
PORT=3001

# Supabase
SUPABASE_URL=https://mqayqkwcuxhovunmwgpy.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# JWT (use ECC P-256 keys)
JWT_SECRET=<your-hs256-secret-key>
JWT_AUDIENCE=authenticated
JWT_ISSUER=https://mqayqkwcuxhovunmwgpy.supabase.co/auth/v1

# CORS
ALLOWED_ORIGINS=https://<vercel-project>.vercel.app
```

### 2.4 Deploy

- Railway will automatically detect `package.json` in `apps/api`
- Build and deploy automatically
- Your backend will be live at `https://api-zeus.railway.app` (or custom domain)

---

## Step 3: Update GitHub Actions Secrets

To enable automatic CI/CD, add these secrets to your GitHub repository:

**Settings → Secrets and variables → Actions**

### Frontend Secrets
```
VERCEL_TOKEN=<your-vercel-token>
VERCEL_ORG_ID=<your-vercel-org-id>
VERCEL_PROJECT_ID=<vercel-web-project-id>
NEXT_PUBLIC_SUPABASE_URL=https://mqayqkwcuxhovunmwgpy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
```

### Backend Secrets
```
RAILWAY_TOKEN=<your-railway-api-token>
SUPABASE_URL=https://mqayqkwcuxhovunmwgpy.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
JWT_SECRET=<your-secret>
```

---

## Step 4: Verify Deployment

### 4.1 Test Frontend

1. Visit `https://<project>.vercel.app`
2. Should redirect to `/dashboard`
3. Try logging in with test account

### 4.2 Test Backend API

```bash
curl -X GET https://api-zeus.railway.app/v1/transactions/dre/calculate \
  -H "Authorization: Bearer <your-jwt-token>" \
  -H "x-tenant-id: <tenant-id>"
```

### 4.3 Check API Health

```bash
curl https://api-zeus.railway.app/health
```

---

## Step 5: Configure Custom Domain (Optional)

### Vercel Custom Domain
1. Settings → Domains
2. Add your domain (e.g., `app.yourdomain.com`)
3. Update DNS records per Vercel instructions

### Railway Custom Domain
1. Settings → Networking
2. Add custom domain (e.g., `api.yourdomain.com`)
3. Update DNS records per Railway instructions

---

## Troubleshooting

### Build Fails on Vercel

**Check logs**:
- Vercel Dashboard → Deployments → Failed deployment → View logs

**Common issues**:
- Missing environment variables → Add in Settings → Environment Variables
- Node version mismatch → Set Node.js version to 20
- pnpm lock file → Ensure `pnpm-lock.yaml` is committed

### Backend Not Connecting on Railway

**Check logs**:
- Railway Dashboard → Project → Services → Logs

**Common issues**:
- Environment variables not set → Review in Variables section
- Supabase credentials wrong → Get from Supabase Settings
- CORS not allowing frontend domain → Update ALLOWED_ORIGINS

### Frontend Shows "API Error"

**Check**:
1. NEXT_PUBLIC_API_URL points to correct Railway URL
2. Backend is running (check Railway logs)
3. CORS is configured correctly on backend

---

## Environment Variables Reference

### Frontend (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=https://PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
NEXT_PUBLIC_API_URL=https://your-backend-url
```

### Backend (.env)
```
NODE_ENV=production
PORT=3001
SUPABASE_URL=https://PROJECT_ID.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...
JWT_SECRET=your-secret-key
JWT_AUDIENCE=authenticated
JWT_ISSUER=https://PROJECT_ID.supabase.co/auth/v1
ALLOWED_ORIGINS=https://your-frontend-url
```

---

## CI/CD Workflow

The `.github/workflows/deploy.yml` automatically:

1. **On PR to main**: Runs tests and linting
2. **On merge to main**:
   - Builds frontend and backend
   - Deploys to Vercel (frontend)
   - Deploys to Railway (backend)

No manual intervention needed after first setup!

---

## Monitoring

### Vercel Analytics
- Dashboard → Monitoring → Real User Monitoring

### Railway Metrics
- Dashboard → Project → Metrics
- CPU, Memory, Network usage

### Supabase Logs
- Dashboard → Logs
- Database, API, Auth logs

---

## Support

For issues:
1. Check GitHub Actions workflow logs
2. Review Vercel deployment logs
3. Check Railway service logs
4. Verify Supabase credentials and RLS policies

