import json
import re
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from .database import get_db
from .models import Form, Question
from .models_response import Answer, Response
from .schemas import AnswerUpsert, PublicFormOut, ResponseCreate, ResponseCreated

router = APIRouter(prefix="/api")

def public_form(db: Session, slug: str) -> Form:
    form = db.scalar(select(Form).options(selectinload(Form.questions)).where(Form.public_slug == slug, Form.status == "published"))
    if form is None:
        raise HTTPException(status_code=404, detail="This form isn't available")
    return form

def response_for_public(db: Session, response_id: int) -> Response:
    response = db.get(Response, response_id)
    if response is None:
        raise HTTPException(status_code=404, detail="Response not found")
    form = db.get(Form, response.form_id)
    if form is None or form.status != "published":
        raise HTTPException(status_code=404, detail="This form isn't available")
    return response

@router.get("/public/forms/{slug}", response_model=PublicFormOut)
def read_public_form(slug: str, db: Session = Depends(get_db)):
    return public_form(db, slug)

@router.post("/public/forms/{slug}/responses", response_model=ResponseCreated, status_code=status.HTTP_201_CREATED)
def create_public_response(slug: str, payload: ResponseCreate | None = None, db: Session = Depends(get_db)):
    form = public_form(db, slug)
    response = Response(form_id=form.id, respondent_meta=payload.respondent_meta if payload else None)
    db.add(response)
    db.commit()
    db.refresh(response)
    return ResponseCreated(response_id=response.id)

@router.patch("/public/responses/{response_id}/answers")
def upsert_public_answer(response_id: int, payload: AnswerUpsert, db: Session = Depends(get_db)):
    response = response_for_public(db, response_id)
    question = db.scalar(select(Question).where(Question.id == payload.question_id, Question.form_id == response.form_id))
    if question is None:
        raise HTTPException(status_code=404, detail="Question not found for this response")
    answer = db.scalar(select(Answer).where(Answer.response_id == response_id, Answer.question_id == question.id))
    value = payload.value if isinstance(payload.value, str) else json.dumps(payload.value)
    if answer is None:
        answer = Answer(response_id=response_id, question_id=question.id, value=value)
        db.add(answer)
    else:
        answer.value = value
    db.commit()
    return {"answer_id": answer.id, "question_id": question.id, "value": payload.value}

@router.post("/public/responses/{response_id}/complete")
def complete_public_response(response_id: int, db: Session = Depends(get_db)):
    response = response_for_public(db, response_id)
    questions = db.scalars(select(Question).where(Question.form_id == response.form_id)).all()
    answered = {answer.question_id for answer in response.answers}
    missing = [question.title for question in questions if question.required and question.id not in answered]
    if missing:
        raise HTTPException(status_code=400, detail=f"Required questions unanswered: {', '.join(missing)}")
    response.is_complete = True
    response.submitted_at = datetime.utcnow()
    db.commit()
    return {"response_id": response.id, "is_complete": True}
