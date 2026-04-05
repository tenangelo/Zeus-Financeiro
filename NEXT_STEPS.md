# Next Steps — Get Zeus Financeiro Online

Your code is now on GitHub with full CI/CD infrastructure! Here's how to get it running in production.

## 🎯 Immediate Action Items

### ✅ Done
- [x] Code pushed to GitHub: https://github.com/tenangelo/Zeus-Financeiro
- [x] CI/CD pipeline configured (`.github/workflows/deploy.yml`)
- [x] Vercel config ready (`vercel.json`)
- [x] Railway config ready (`railway.json`)
- [x] Full deployment guide in `DEPLOYMENT.md`

### ⏳ Next (15 minutes)
- [ ] **Create Vercel Account** → Deploy frontend
- [ ] **Create Railway Account** → Deploy backend
- [ ] **Add GitHub Actions Secrets** → Enable auto-deployment
- [ ] **Test both deployments** → Verify they work together

---

## 📋 Step-by-Step Checklist

### 1. Set Up Vercel (Frontend)

**Time: 5 minutes**

1. Go to https://vercel.com/signup
2. Sign up with GitHub account (easier)
3. Click "Add New..." → "Project"
4. Select `Zeus-Financeiro` repository
5. Configure:
   - Root Directory: `apps/web`
   - Build Command: (leave as default, reads from vercel.json)
6. Click "Environment Variables"
7. Add these variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL = https://mqayqkwcuxhovunmwgpy.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY = (get from Supabase → Settings → API → Anon key)
   NEXT_PUBLIC_API_URL = (you'll update this after Railway deploys)
   ```
8. Click "Deploy" — wait 2-3 minutes
9. Copy your Vercel URL (e.g., `https://zeus-financeiro.vercel.app`)

### 2. Set Up Railway (Backend)

**Time: 5 minutes**

1. Go to https://railway.app/signup
2. Sign up with GitHub account
3. Create New Project → "Deploy from GitHub repo"
4. Select `Zeus-Financeiro` repository
5. Railway will auto-detect Node.js project
6. Wait for build to complete (you'll see in logs)
7. Click on project → "Settings" → "Environment"
8. Add these variables:
   ```
   NODE_ENV = production
   PORT = 3001
   SUPABASE_URL = https://mqayqkwcuxhovunmwgpy.supabase.co
   SUPABASE_SERVICE_ROLE_KEY = (get from Supabase → Settings → API → Service Role key)
   JWT_SECRET = (create a random string or use: $(openssl rand -base64 32))
   JWT_AUDIENCE = authenticated
   JWT_ISSUER = https://mqayqkwcuxhovunmwgpy.supabase.co/auth/v1
   ALLOWED_ORIGINS = (paste your Vercel URL from step 1)
   ```
9. Copy your Railway URL (e.g., `https://api-zeus.railway.app`)

### 3. Update Vercel with Railway URL

**Time: 2 minutes**

1. Go back to Vercel project
2. Settings → Environment Variables
3. Update `NEXT_PUBLIC_API_URL` = (your Railway URL from step 2)
4. Vercel will auto-redeploy (wait 1-2 minutes)

### 4. Add GitHub Actions Secrets

**Time: 5 minutes**

1. Go to GitHub repository → Settings → Secrets and variables → Actions
2. Click "New repository secret" and add:

**For Vercel:**
```
Name: VERCEL_TOKEN
Value: (go to https://vercel.com/account/tokens, create new token)
```

```
Name: VERCEL_ORG_ID
Value: (go to https://vercel.com/account/settings, copy Org ID)
```

```
Name: VERCEL_PROJECT_ID
Value: (go to Vercel project, copy project ID from URL or settings)
```

**For Railway:**
```
Name: RAILWAY_TOKEN
Value: (go to https://railway.app/account/tokens, create new token)
```

### 5. Test Your Deployment

**Time: 5 minutes**

1. Visit your Vercel URL (frontend)
   - Should show login page
   - If not, check Vercel logs for errors

2. Test backend API:
   ```bash
   curl https://api-zeus.railway.app/health
   ```
   Should return: `{"status":"ok"}`

3. Try logging in with Supabase test account

4. Push a small change to GitHub (e.g., update README) and watch auto-deployment happen!

---

## 🔑 Where to Get Your Credentials

### Supabase
1. Go to https://supabase.com/dashboard
2. Select project `mqayqkwcuxhovunmwgpy`
3. Settings → API
   - **Project URL**: Copy this
   - **Anon (public) Key**: Copy this (for frontend)
   - **Service Role Key**: Copy this (for backend - KEEP SECRET)

### Vercel
1. https://vercel.com/account/tokens → Create token
2. https://vercel.com/account/settings → Copy Org ID
3. Your project → Settings → Copy Project ID

### Railway
1. https://railway.app/account/tokens → Create token

---

## 🚀 After Deployment

### Automatic Updates

From now on:
1. Make code changes locally
2. Commit with `git commit -m "feat: description"`
3. Push with `git push origin main`
4. GitHub Actions automatically:
   - Runs tests
   - Builds frontend
   - Builds backend
   - Deploys to Vercel (frontend)
   - Deploys to Railway (backend)

Watch deployment at: GitHub → Actions tab

### Monitoring

**Vercel Logs**:
- Dashboard → Deployments → Click deployment → Logs

**Railway Logs**:
- Dashboard → Project → Deployments → Click deployment → Logs

**API Health**:
```bash
curl https://your-api.railway.app/health
```

---

## ⚠️ Common Issues

### Frontend shows "API Error"
- Check NEXT_PUBLIC_API_URL is correct in Vercel
- Check Railway backend is running (Railway logs)
- Ensure ALLOWED_ORIGINS includes your Vercel URL

### Railway build fails
- Check logs for errors
- Verify all environment variables are set
- Check Node version (should be 20)
- Try redeploying manually from Railway dashboard

### Can't login
- Verify Supabase credentials are correct
- Check Supabase auth is enabled
- Look at Supabase logs for auth errors

### GitHub Actions failing
- Check workflow file: `.github/workflows/deploy.yml`
- Verify all secrets are set
- Check build logs in GitHub Actions tab

---

## 📞 Need Help?

1. **Deployment Issues**: Check `DEPLOYMENT.md` (full guide)
2. **Local Testing**: Check `README.md` (setup instructions)
3. **API Reference**: Check API docs at `https://your-api.railway.app/api/docs`
4. **Database**: Check migrations in `supabase/migrations/`

---

## 🎉 You're Almost Done!

After these steps:
- ✅ Frontend running on Vercel
- ✅ Backend running on Railway
- ✅ Automatic deployments on GitHub push
- ✅ Full financial management system online

**Total time: ~25-30 minutes**

Next features to implement:
- [ ] Automatic expense categorization via Claude API
- [ ] Dashboard KPIs (CMV%, ticket médio, EBITDA%)
- [ ] WhatsApp alerts for overdue accounts
- [ ] Custom report generation

Good luck! 🚀
