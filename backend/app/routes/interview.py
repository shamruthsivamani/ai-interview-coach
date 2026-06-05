import re
from typing import Dict, List, Optional

from fastapi import APIRouter
from pydantic import BaseModel


router = APIRouter(prefix="/interview", tags=["Interview Coach"])

QUESTION_BANK: Dict[str, List[str]] = {
    "hr": [
        "Tell me about yourself and the kind of role you are looking for.",
        "Describe a time you handled pressure or a tight deadline.",
        "What are your strengths and how do they help you in a team?",
        "Why should we hire you for this role?",
    ],
    "web": [
        "Walk me through how React state changes update the UI.",
        "How would you optimize a slow web page that loads many API results?",
        "Explain how you would design authentication for a FastAPI and React app.",
        "Tell me about a frontend bug you solved and how you debugged it.",
    ],
    "ai": [
        "Explain a machine learning project you built and how you evaluated its performance.",
        "How would you handle overfitting in a model trained on a small dataset?",
        "What is the difference between supervised and unsupervised learning?",
        "Describe how you would deploy an AI feature into a production web app.",
    ],
    "data": [
        "How would you clean a messy dataset before analysis?",
        "Explain a dashboard or analytics project you have built.",
        "How do you decide which metric best represents product success?",
        "Describe how you would find insights from resume or hiring data.",
    ],
}

DOMAIN_KEYWORDS = {
    "hr": {"team", "project", "communication", "learning", "challenge", "responsibility", "impact", "growth"},
    "web": {"react", "api", "state", "component", "performance", "authentication", "backend", "frontend"},
    "ai": {"model", "data", "training", "accuracy", "evaluation", "feature", "deployment", "overfitting"},
    "data": {"dataset", "cleaning", "metric", "analysis", "visualization", "insight", "dashboard", "query"},
}

FILLER_WORDS = {"um", "uh", "like", "actually", "basically", "literally", "you know", "so"}


class QuestionRequest(BaseModel):
    domain: str = "hr"
    round: int = 1


class EvaluationRequest(BaseModel):
    domain: str = "hr"
    question: str
    answer: str
    duration_seconds: Optional[int] = 90
    face_metrics: Optional[Dict[str, int]] = None


def clamp(value: int, low: int = 0, high: int = 100) -> int:
    return max(low, min(high, value))


def count_fillers(answer: str) -> int:
    normalized = answer.lower()
    return sum(len(re.findall(rf"\b{re.escape(word)}\b", normalized)) for word in FILLER_WORDS)


def evaluate(payload: EvaluationRequest) -> Dict:
    words = re.findall(r"[A-Za-z0-9+#.-]+", payload.answer.lower())
    word_count = len(words)
    unique_words = len(set(words))
    duration_minutes = max((payload.duration_seconds or 90) / 60, 0.25)
    words_per_minute = round(word_count / duration_minutes)
    filler_count = count_fillers(payload.answer)

    domain = payload.domain.lower()
    keywords = DOMAIN_KEYWORDS.get(domain, DOMAIN_KEYWORDS["hr"])
    keyword_hits = sorted({word for word in words if word in keywords})

    structure_markers = sum(
        marker in payload.answer.lower()
        for marker in ["first", "second", "because", "for example", "result", "therefore", "finally"]
    )

    relevance = clamp(35 + len(keyword_hits) * 9 + structure_markers * 4 + min(word_count, 120) // 6)
    clarity = clamp(85 - filler_count * 6 - max(0, abs(words_per_minute - 135) // 4) + structure_markers * 5)
    confidence = clamp(55 + min(word_count, 120) // 3 - filler_count * 5)

    if payload.face_metrics:
        confidence = clamp(
            round(
                confidence * 0.65
                + payload.face_metrics.get("eyeContact", 65) * 0.2
                + payload.face_metrics.get("engagement", 65) * 0.15
            )
        )

    technical_quality = clamp(40 + len(keyword_hits) * 10 + unique_words // 4 + structure_markers * 6)
    overall = round((relevance + clarity + confidence + technical_quality) / 4)

    tips = []
    if word_count < 45:
        tips.append("Add one concrete example with the action you took and the result you achieved.")
    if filler_count > 2:
        tips.append("Slow down slightly and pause silently instead of using filler words.")
    if len(keyword_hits) < 3:
        tips.append("Use more role-specific keywords from the question to prove technical fit.")
    if structure_markers < 2:
        tips.append("Structure the answer with a clear beginning, example, and result.")
    if not tips:
        tips.append("Strong answer. Add one measurable outcome to make it more memorable.")

    return {
        "overall": overall,
        "scores": {
            "confidence": confidence,
            "clarity": clarity,
            "relevance": relevance,
            "technicalQuality": technical_quality,
        },
        "speech": {
            "wordCount": word_count,
            "wordsPerMinute": words_per_minute,
            "fillerCount": filler_count,
        },
        "keywordHits": keyword_hits,
        "tips": tips,
    }


@router.post("/question")
def generate_question(payload: QuestionRequest):
    domain = payload.domain.lower()
    questions = QUESTION_BANK.get(domain, QUESTION_BANK["hr"])
    index = (max(payload.round, 1) - 1) % len(questions)
    return {"domain": domain, "round": payload.round, "question": questions[index]}


@router.post("/evaluate")
def evaluate_answer(payload: EvaluationRequest):
    return evaluate(payload)
