# AI Interview Coach with Real-Time Feedback

A demo-ready AI-powered interview practice app that simulates job interviews and gives instant feedback on speech, facial presentation signals, and answer quality.

## Features

- AI interviewer with domain-based questions: HR, Web Dev, AI/ML, Data Analyst
- Browser speech recognition for live transcript capture
- Speech analytics: word count, speaking pace, filler words
- Camera preview for interview practice
- Live presentation metrics: eye contact, engagement, head stability
- AI-style answer evaluation: confidence, clarity, relevance, technical quality
- Feedback dashboard with improvement tips
- React frontend + FastAPI backend

## Project Structure

```text
AI INTERVIEW COACH/
  backend/
    main.py
    requirements.txt
    app/routes/interview.py
  frontend/
    package.json
    index.html
    src/
      App.jsx
      main.jsx
      styles.css
```

## Run Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

The backend runs at `http://localhost:8000`.

## Run Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend runs at `http://localhost:5173`.

## API

- `GET /` health check
- `POST /interview/question` generate an interview question
- `POST /interview/evaluate` evaluate an answer

## Deployment

### Backend on Render

1. Push this project to GitHub.
2. Create a new Render Web Service from the repo.
3. Use these settings:
   - Root Directory: `backend`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Add this environment variable after the frontend is deployed:
   - `FRONTEND_URL=https://your-frontend-url.vercel.app`

### Frontend on Vercel

1. Import the same GitHub repo in Vercel.
2. Use these settings:
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `dist`
3. Add this environment variable:
   - `VITE_API_URL=https://your-backend-url.onrender.com`

After changing environment variables, redeploy both services.

## Next-Level Upgrades

- Replace heuristic question generation with Gemini/OpenAI.
- Add MediaPipe FaceMesh for real landmark-based eye contact and smile tracking.
- Add Whisper for backend speech-to-text from uploaded audio.
- Save interview sessions and show progress over time.
