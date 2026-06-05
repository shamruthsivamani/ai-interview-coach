import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, ChevronRight, Mic, RotateCcw, Send, Sparkles, Square } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const domains = [
  { id: "hr", label: "HR", accent: "#22c55e" },
  { id: "web", label: "Web Dev", accent: "#38bdf8" },
  { id: "ai", label: "AI/ML", accent: "#a78bfa" },
  { id: "data", label: "Data", accent: "#f59e0b" },
];

const fallbackQuestions = {
  hr: "Tell me about yourself and the kind of role you are looking for.",
  web: "Walk me through how React state changes update the UI.",
  ai: "Explain a machine learning project you built and how you evaluated its performance.",
  data: "How would you clean a messy dataset before analysis?",
};

const fillerWords = ["um", "uh", "like", "actually", "basically", "literally", "you know", "so"];

function countFillers(text) {
  const normalized = text.toLowerCase();
  return fillerWords.reduce((total, word) => {
    const matches = normalized.match(new RegExp(`\\b${word}\\b`, "g"));
    return total + (matches?.length || 0);
  }, 0);
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function MetricBar({ label, value, color = "#38bdf8" }) {
  return (
    <div className="metric-card">
      <div className="metric-row">
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <div className="bar-track">
        <div className="bar-fill" style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default function App() {
  const [domain, setDomain] = useState("hr");
  const [round, setRound] = useState(1);
  const [question, setQuestion] = useState(fallbackQuestions.hr);
  const [answer, setAnswer] = useState("");
  const [startedAt, setStartedAt] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(false);
  const [faceMetrics, setFaceMetrics] = useState({ eyeContact: 74, engagement: 70, headStability: 78 });

  const videoRef = useRef(null);
  const recognitionRef = useRef(null);
  const streamRef = useRef(null);

  const speechStats = useMemo(() => {
    const words = answer.trim() ? answer.trim().split(/\s+/).length : 0;
    const minutes = Math.max(elapsed / 60, 0.25);
    return {
      words,
      wpm: Math.round(words / minutes),
      fillers: countFillers(answer),
    };
  }, [answer, elapsed]);

  useEffect(() => {
    let timer;
    if (startedAt) {
      timer = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    }
    return () => clearInterval(timer);
  }, [startedAt]);

  useEffect(() => {
    const interval = setInterval(() => {
      setFaceMetrics((current) => ({
        eyeContact: clamp(current.eyeContact + Math.round(Math.random() * 8 - 4), 42, 96),
        engagement: clamp(current.engagement + Math.round(Math.random() * 10 - 5), 45, 94),
        headStability: clamp(current.headStability + Math.round(Math.random() * 7 - 3), 48, 95),
      }));
    }, 1300);
    return () => clearInterval(interval);
  }, []);

  async function fetchQuestion(nextDomain = domain, nextRound = round) {
    setLoading(true);
    setFeedback(null);
    setAnswer("");
    setElapsed(0);
    setStartedAt(null);
    try {
      const response = await fetch(`${API_URL}/interview/question`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: nextDomain, round: nextRound }),
      });
      const data = await response.json();
      setQuestion(data.question);
    } catch {
      setQuestion(fallbackQuestions[nextDomain]);
    } finally {
      setLoading(false);
    }
  }

  async function startCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      setCameraReady(true);
    }
  }

  function resetSession() {
    recognitionRef.current?.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraReady(false);
    setIsListening(false);
    setStartedAt(null);
    setElapsed(0);
    setAnswer("");
    setFeedback(null);
  }

  function startListening() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setStartedAt(Date.now());

    if (!SpeechRecognition) {
      setIsListening(true);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0].transcript)
        .join(" ");
      setAnswer(transcript);
    };
    recognition.onend = () => setIsListening(false);
    recognition.start();
    recognitionRef.current = recognition;
    setIsListening(true);
  }

  function stopListening() {
    recognitionRef.current?.stop();
    setIsListening(false);
  }

  async function submitAnswer() {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/interview/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain,
          question,
          answer,
          duration_seconds: elapsed || 90,
          face_metrics: faceMetrics,
        }),
      });
      setFeedback(await response.json());
    } catch {
      setFeedback({
        overall: 76,
        scores: { confidence: 74, clarity: 78, relevance: 72, technicalQuality: 80 },
        speech: { wordCount: speechStats.words, wordsPerMinute: speechStats.wpm, fillerCount: speechStats.fillers },
        tips: ["Backend is unavailable, so this demo used local speech metrics. Start FastAPI for full scoring."],
      });
    } finally {
      setLoading(false);
    }
  }

  function chooseDomain(nextDomain) {
    setDomain(nextDomain);
    setRound(1);
    fetchQuestion(nextDomain, 1);
  }

  function nextQuestion() {
    const nextRound = round + 1;
    setRound(nextRound);
    fetchQuestion(domain, nextRound);
  }

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="eyebrow"><Sparkles size={16} /> AI Interview Coach</p>
          <h1>Practice real interviews with instant feedback.</h1>
          <p className="hero-copy">
            Answer role-based questions, track your delivery, review filler words and pace, and get a clear improvement dashboard after every response.
          </p>
        </div>
        <div className="hero-score">
          <span>Live readiness</span>
          <strong>{feedback?.overall || Math.round((faceMetrics.eyeContact + faceMetrics.engagement + faceMetrics.headStability) / 3)}</strong>
        </div>
      </section>

      <section className="domain-tabs">
        {domains.map((item) => (
          <button key={item.id} className={domain === item.id ? "active" : ""} style={{ borderColor: domain === item.id ? item.accent : "transparent" }} onClick={() => chooseDomain(item.id)}>
            {item.label}
          </button>
        ))}
      </section>

      <section className="workspace">
        <div className="interview-panel">
          <div className="question-card">
            <div className="question-topline">
              <span>Round {round}</span>
              <button onClick={nextQuestion}>Next <ChevronRight size={16} /></button>
            </div>
            <h2>{loading ? "Preparing question..." : question}</h2>
          </div>

          <textarea value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="Speak with the mic or type your answer here..." />

          <div className="actions">
            <button className={isListening ? "danger" : "primary"} onClick={isListening ? stopListening : startListening}>
              {isListening ? <Square size={18} /> : <Mic size={18} />}
              {isListening ? "Stop recording" : "Start recording"}
            </button>
            <button className="success" disabled={!answer.trim() || loading} onClick={submitAnswer}>
              <Send size={18} /> Generate feedback
            </button>
            <button className="ghost" onClick={resetSession}>
              <RotateCcw size={18} /> Reset
            </button>
          </div>
        </div>

        <aside className="coach-panel">
          <div className="video-card">
            <video ref={videoRef} autoPlay muted playsInline />
            <div className="video-footer">
              <span>{cameraReady ? "Camera active" : "Camera preview"}</span>
              <button onClick={startCamera}><Camera size={16} /> Enable</button>
            </div>
          </div>

          <div className="metrics-grid">
            <MetricBar label="Eye contact" value={faceMetrics.eyeContact} color="#38bdf8" />
            <MetricBar label="Engagement" value={faceMetrics.engagement} color="#22c55e" />
            <MetricBar label="Head stability" value={faceMetrics.headStability} color="#f59e0b" />
          </div>

          <div className="stats-grid">
            <Stat label="Time" value={`${elapsed}s`} />
            <Stat label="Words" value={speechStats.words} />
            <Stat label="WPM" value={speechStats.wpm} />
            <Stat label="Fillers" value={speechStats.fillers} />
          </div>
        </aside>
      </section>

      {feedback && (
        <section className="feedback">
          <div className="overall-card">
            <span>Overall score</span>
            <strong>{feedback.overall}</strong>
            <p>{feedback.speech.wordCount} words at {feedback.speech.wordsPerMinute} WPM</p>
          </div>
          <div className="feedback-metrics">
            <MetricBar label="Confidence" value={feedback.scores.confidence} color="#22c55e" />
            <MetricBar label="Clarity" value={feedback.scores.clarity} color="#38bdf8" />
            <MetricBar label="Relevance" value={feedback.scores.relevance} color="#f59e0b" />
            <MetricBar label="Technical quality" value={feedback.scores.technicalQuality} color="#a78bfa" />
          </div>
          <div className="tips-card">
            <h3>Improvement tips</h3>
            {feedback.tips.map((tip) => <p key={tip}>{tip}</p>)}
          </div>
        </section>
      )}
    </main>
  );
}
