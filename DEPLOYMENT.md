# Deployment Guide - MachineHealth App

## Quick Deploy (Recommended)

### Step 1: Deploy Database & Backend on Railway

1. **Create Railway Account**
   - Go to [railway.app](https://railway.app)
   - Sign up with GitHub

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Connect your GitHub and select the monitoringApp repository
   - Choose the `backend` folder as root directory

3. **Add PostgreSQL Database**
   - In your Railway project, click "New"
   - Select "Database" → "PostgreSQL"
   - Railway will automatically create and connect it

4. **Set Environment Variables**
   In Railway dashboard, go to your backend service → Variables:
   ```
   NODE_ENV=production
   JWT_SECRET=your-secure-random-string-min-32-characters
   ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
   FRONTEND_URL=https://your-app.vercel.app
   ```
   
   Note: `DATABASE_URL` is automatically set by Railway when you add PostgreSQL

5. **Run Database Migrations**
   In Railway, go to your service → Settings → Run Command:
   ```bash
   npm run db:migrate && npm run db:seed && npm run start
   ```

6. **Get Your Backend URL**
   - Go to Settings → Domains
   - Generate a domain (e.g., `machinehealth-api.up.railway.app`)
   - Copy this URL for the frontend

---

### Step 2: Deploy Frontend on Vercel

1. **Create Vercel Account**
   - Go to [vercel.com](https://vercel.com)
   - Sign up with GitHub

2. **Import Project**
   - Click "New Project"
   - Import your GitHub repository
   - Set Root Directory to `.` (the main folder, not backend)

3. **Configure Build Settings**
   ```
   Framework Preset: Vite
   Build Command: npm run build
   Output Directory: dist
   Install Command: npm install
   ```

4. **Set Environment Variables**
   ```
   VITE_API_URL=https://your-backend.up.railway.app/api
   ```

5. **Deploy**
   - Click "Deploy"
   - Wait for build to complete
   - Your app is live at `https://your-app.vercel.app`

---

## Post-Deployment Checklist

### Update CORS Settings
In Railway, update the `FRONTEND_URL` environment variable to your actual Vercel URL:
```
FRONTEND_URL=https://machinehealth.vercel.app
```

### Test the Deployment
1. Open your Vercel URL on mobile
2. Try logging in with: `demo@example.com` / `demo123`
3. Test recording a sample (grant accelerometer permission)
4. Generate an AI report

### Custom Domain (Optional)
- **Vercel**: Settings → Domains → Add your domain
- **Railway**: Settings → Domains → Add custom domain

---

## Alternative Deployment Options

### Option 2: Render (All-in-One)
- Free tier available
- Slightly slower cold starts
- Good for hobby projects

### Option 3: DigitalOcean App Platform
- $5/month for basic
- More control
- Good for scaling

### Option 4: AWS (Advanced)
- Elastic Beanstalk for backend
- RDS for PostgreSQL
- S3 + CloudFront for frontend
- More complex but scalable

---

## Mobile App Wrapper (Optional)

To publish to App Store / Play Store, you can wrap the web app:

### Using Capacitor (Recommended)
```bash
npm install @capacitor/core @capacitor/cli
npx cap init MachineHealth com.yourcompany.machinehealth
npx cap add ios
npx cap add android
npm run build
npx cap sync
```

### Using PWA
Add to `index.html`:
```html
<link rel="manifest" href="/manifest.json">
```

Create `public/manifest.json` for "Add to Home Screen" functionality.

---

## Estimated Costs

| Service | Free Tier | Paid |
|---------|-----------|------|
| Vercel | 100GB bandwidth/mo | $20/mo for more |
| Railway | $5 free credit/mo | ~$5-10/mo |
| **Total** | **Free to start** | **~$5-15/mo** |

---

## Quick Commands

```bash
# Push to GitHub (triggers auto-deploy)
git add .
git commit -m "Deploy to production"
git push origin main

# Check backend logs on Railway
railway logs

# Check frontend logs on Vercel
vercel logs
```
