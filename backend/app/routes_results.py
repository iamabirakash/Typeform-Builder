import json
from collections import Counter
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from .database import get_db
from .auth import current_creator
from .models import Form, Question
from .models_response import Answer, Response
from .schemas import AnswerOut, FormSummary, ResponseDetail, ResponseListItem, ResponsePage, SummaryItem

router = APIRouter(prefix="/api")

def require_form(db: Session, form_id: int, creator) -> Form:
    form = db.get(Form, form_id)
    if form is None:
        raise HTTPException(status_code=404, detail="Form not found")
    if form.creator_id != creator.id:
        raise HTTPException(status_code=403, detail="You do not own this form")
    return form

def decode(value: str) -> Any:
    try:
        return json.loads(value)
    except (TypeError, json.JSONDecodeError):
        return value

@router.get("/forms/{form_id}/responses", response_model=ResponsePage)
def list_responses(form_id: int, page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100), creator = Depends(current_creator), db: Session = Depends(get_db)):
    require_form(db, form_id, creator)
    total = db.scalar(select(func.count(Response.id)).where(Response.form_id == form_id)) or 0
    rows = db.scalars(select(Response).where(Response.form_id == form_id).order_by(Response.submitted_at.desc()).offset((page - 1) * page_size).limit(page_size)).all()
    return ResponsePage(page=page, page_size=page_size, total=total, items=[ResponseListItem.model_validate(row) for row in rows])

@router.get("/forms/{form_id}/responses/{response_id}", response_model=ResponseDetail)
def read_response(form_id: int, response_id: int, creator = Depends(current_creator), db: Session = Depends(get_db)):
    require_form(db, form_id, creator)
    response = db.scalar(select(Response).options(selectinload(Response.answers).selectinload(Answer.question)).where(Response.id == response_id, Response.form_id == form_id))
    if response is None:
        raise HTTPException(status_code=404, detail="Response not found")
    answers = [AnswerOut(question_id=a.question_id, question_title=a.question.title, value=decode(a.value)) for a in response.answers]
    return ResponseDetail(id=response.id, form_id=response.form_id, submitted_at=response.submitted_at, is_complete=response.is_complete, respondent_meta=response.respondent_meta, answers=answers)

@router.get("/forms/{form_id}/summary", response_model=FormSummary)
def form_summary(form_id: int, creator = Depends(current_creator), db: Session = Depends(get_db)):
    require_form(db, form_id, creator)
    responses = db.scalars(select(Response).where(Response.form_id == form_id)).all()
    questions = db.scalars(select(Question).where(Question.form_id == form_id).order_by(Question.order_index)).all()
    summaries = []
    for question in questions:
        answers = db.scalars(select(Answer).where(Answer.question_id == question.id).join(Response, Answer.response_id == Response.id).where(Response.form_id == form_id).order_by(Response.submitted_at.desc())).all()
        values = [decode(answer.value) for answer in answers]
        item = SummaryItem(question_id=question.id, question_title=question.title, type=question.type, total_answers=len(values))
        if question.type in {"multiple_choice", "dropdown", "yes_no"}:
            item.counts = dict(Counter(str(value) for value in values))
        elif question.type == "rating":
            numeric = [float(value) for value in values if isinstance(value, (int, float)) or str(value).replace('.', '', 1).isdigit()]
            item.average = round(sum(numeric) / len(numeric), 2) if numeric else None
            item.distribution = dict(Counter(str(value) for value in values))
        else:
            item.samples = values[:5]
        summaries.append(item)
    return FormSummary(form_id=form_id, total_responses=len(responses), completed_responses=sum(response.is_complete for response in responses), questions=summaries)
