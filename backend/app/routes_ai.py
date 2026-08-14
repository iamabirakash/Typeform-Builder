from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from .ai_service import analyze_open_text_responses, generate_form_from_prompt, suggest_questions_for_goal
from .auth import current_creator
from .database import get_db
from .models import Form, Question
from .models_response import Answer, Response

router = APIRouter(prefix="/api")


class FormPromptRequest:
    def __init__(self, prompt: str):
        self.prompt = prompt


@router.post("/ai/form-suggestions")
def ai_form_suggestions(payload: dict[str, str], creator=Depends(current_creator)):
    prompt = (payload or {}).get("prompt", "").strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="A prompt is required")
    return generate_form_from_prompt(prompt)


@router.post("/ai/question-suggestions")
def ai_question_suggestions(payload: dict[str, str], creator=Depends(current_creator)):
    goal = (payload or {}).get("goal", "").strip()
    if not goal:
        raise HTTPException(status_code=400, detail="A goal is required")
    return {"questions": suggest_questions_for_goal(goal)}


@router.get("/forms/{form_id}/ai-insights")
def form_ai_insights(form_id: int, creator=Depends(current_creator), db: Session = Depends(get_db)):
    form = db.get(Form, form_id)
    if form is None:
        raise HTTPException(status_code=404, detail="Form not found")
    if form.creator_id != creator.id:
        raise HTTPException(status_code=403, detail="You do not own this form")

    open_text_questions = db.scalars(
        select(Question.id).where(Question.form_id == form.id).where(Question.type.in_(["short_text", "long_text"]))
    ).all()

    if not open_text_questions:
        return {
            "title": form.title,
            "summary": "This form has no open-text questions yet, so there are no AI-written insights to surface.",
            "sentiment": {"overall": "neutral", "positive": 0, "negative": 0, "neutral": 0},
            "themes": [],
            "intent": ["Add a short text or long text question to start collecting qualitative feedback."],
            "recommendations": ["Add an open-text question to capture context behind the score-based responses."],
        }

    answers = db.scalars(
        select(Answer.value)
        .join(Response, Response.id == Answer.response_id)
        .where(Response.form_id == form.id)
        .where(Answer.question_id.in_(open_text_questions))
        .order_by(Response.submitted_at.desc())
    ).all()

    result = analyze_open_text_responses(list(answers))
    return {
        "title": form.title,
        "summary": result["summary"],
        "sentiment": result["sentiment"],
        "themes": result["themes"],
        "intent": result["intent"],
        "recommendations": result["recommendations"],
    }
