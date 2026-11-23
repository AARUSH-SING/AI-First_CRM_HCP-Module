# Production Deployment Guide

This project can be deployed either as a **unified single-service deployment** (both frontend and backend served together from one container/service) or as **split services** (frontend on Vercel/Netlify, backend on Render/Railway).

---

## Option 1: Unified 1-Click Deployment on Render.com (Recommended & Free)

Render can build the frontend, package the Python backend, and serve both from a single URL without CORS issues.

### Steps:
1. **Push your code to GitHub**:
   ```bash
   git remote add origin https://github.com/<your-username>/<your-repo-name>.git
   git branch -M main
   git push -u origin main
   ```
2. Go to [Render Dashboard](https://dashboard.render.com).
3. Click **New +** -> **Blueprint**.
4. Connect your GitHub repository.
5. Render will automatically detect [render.yaml](./render.yaml).
6. Under Environment Variables, set your secret:
   - `GROQ_API_KEY`: *(your Groq API key)*
7. Click **Apply**. Render will build and host your web service at a public URL (e.g. `https://ai-first-crm-hcp.onrender.com`).

---

## Option 2: Deploy to Railway.app

1. Push your repository to GitHub.
2. Go to [Railway.app](https://railway.app).
3. Click **New Project** -> **Deploy from GitHub repo**.
4. Select your repository.
5. In the service settings, go to **Variables** and add:
   - `GROQ_API_KEY`: *(your Groq API key)*
   - `GROQ_MODEL`: `openai/gpt-oss-120b`
6. In **Settings** -> **Networking**, click **Generate Domain**.
7. Railway will build the `Dockerfile` and provide your live HTTPS domain.

---

## Option 3: Split Deployment (Frontend on Vercel + Backend on Render)

### Backend on Render:
1. Go to [Render](https://dashboard.render.com) -> **New +** -> **Web Service**.
2. Connect your repo.
3. Configure settings:
   - **Root Directory**: `backend`
   - **Runtime**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Add Environment Variables:
   - `GROQ_API_KEY`: *(your Groq API key)*
   - `GROQ_MODEL`: `openai/gpt-oss-120b`
5. Note your backend URL (e.g. `https://my-backend.onrender.com`).

### Frontend on Vercel:
1. Go to [Vercel](https://vercel.com) -> **Add New...** -> **Project**.
2. Import your GitHub repo.
3. Set **Root Directory** to `frontend`.
4. Add Environment Variable:
   - `VITE_API_BASE_URL`: `https://my-backend.onrender.com`
5. Click **Deploy**.

---

## Option 4: Self-Hosting / Local Production with Docker

Run the entire application in a production container:

```powershell
docker compose up --build -d
```

The app will be available at `http://localhost:8000`.
