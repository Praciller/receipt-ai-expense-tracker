# 🚀 Backend Deployment Guide

## Quick Deploy Options

### Option 1: Railway (Recommended - Free Tier)
1. Go to [Railway.app](https://railway.app)
2. Sign up/Login with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select `Praciller/receipt-ai-expense-tracker`
5. Railway will auto-detect the configuration from `railway.json`
6. Add environment variable: `GOOGLE_API_KEY` = your Google API key
7. Deploy! Your backend will be available at: `https://your-app.railway.app`

### Option 2: Render (Free Tier)
1. Go to [Render.com](https://render.com)
2. Sign up/Login with GitHub
3. Click "New" → "Web Service"
4. Connect `Praciller/receipt-ai-expense-tracker` repository
5. Configure:
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
   - **Environment**: Add `GOOGLE_API_KEY` variable
6. Deploy! Your backend will be available at: `https://your-app.onrender.com`

### Option 3: Heroku (Free Tier Discontinued, Paid)
1. Install Heroku CLI
2. `heroku create receipt-ai-backend`
3. `heroku config:set GOOGLE_API_KEY=your_key`
4. `git push heroku main`

## Environment Variables Required
- `GOOGLE_API_KEY`: Your Google Gemini API key
- `PYTHONPATH`: "." (usually auto-set)

## API Endpoints
Once deployed, your backend will have:
- **Health Check**: `GET /health`
- **Process Receipt**: `POST /process-receipt`
- **API Docs**: `GET /docs`
- **OpenAPI Schema**: `GET /openapi.json`

## Testing Deployment
```bash
# Test health endpoint
curl https://your-backend-url.com/health

# Test receipt processing (with image file)
curl -X POST "https://your-backend-url.com/process-receipt" \
  -F "file=@receipt.jpg" \
  -F "advanced=true"
```

## CORS Configuration
The backend is configured to accept requests from:
- `https://receipt-ai-expense-tracker.vercel.app` (your frontend)
- `http://localhost:3000` (local development)
- Any origin (for testing - should be restricted in production)

## Next Steps
1. Deploy backend using one of the options above
2. Get your backend URL (e.g., `https://your-app.railway.app`)
3. Update frontend to use the new backend URL
4. Test end-to-end functionality
