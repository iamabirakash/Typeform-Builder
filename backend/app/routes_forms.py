from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from .database import get_db
from .models import Creator, Form, Question
from .models_response import Response
from .schemas import FormCreate, FormListItem, FormOut, FormUpdate, QuestionCreate, QuestionOut, QuestionUpdate, ReorderRequest

router = APIRouter(prefix="/api")

def default_creator(db: Session) -> Creator:
    creator = db.get(Creator, 1)
    if creator is None:
        creator = Creator(id=1, name="Default Creator")
        db.add(creator)
        db.flush()
    return creator

def get_form(db: Session, form_id: int) -> Form:
    form = db.scalar(select(Form).options(selectinload(Form.questions)).where(Form.id == form_id))
    if form is None:
        raise HTTPException(status_code=404, detail="Form not found")
    return form

def get_question(db: Session, question_id: int) -> Question:
    question = db.get(Question, question_id)
    if question is None:
        raise HTTPException(status_code=404, detail="Question not found")
    return question

@router.get("/forms", response_model=list[FormListItem])
def list_forms(db: Session = Depends(get_db)):
    rows = db.execute(select(Form, func.count(Response.id)).outerjoin(Response).group_by(Form.id).order_by(Form.updated_at.desc())).all()
    return [FormListItem(id=form.id, title=form.title, status=form.status, response_count=count, updated_at=form.updated_at) for form, count in rows]

@router.post("/forms", response_model=FormOut, status_code=status.HTTP_201_CREATED)
def create_form(payload: FormCreate, db: Session = Depends(get_db)):
    creator = default_creator(db)
    form = Form(creator_id=creator.id, title=payload.title.strip(), theme={"color": "#635bff", "font": "Inter", "background": "#ffffff"})
    db.add(form)
    db.commit()
    return get_form(db, form.id)

@router.get("/forms/{form_id}", response_model=FormOut)
def read_form(form_id: int, db: Session = Depends(get_db)):
    return get_form(db, form_id)

@router.patch("/forms/{form_id}", response_model=FormOut)
def update_form(form_id: int, payload: FormUpdate, db: Session = Depends(get_db)):
    form = get_form(db, form_id)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(form, key, value.strip() if isinstance(value, str) and key == "title" else value)
    form.updated_at = datetime.utcnow()
    db.commit()
    return get_form(db, form_id)

@router.delete("/forms/{form_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_form(form_id: int, db: Session = Depends(get_db)):
    form = get_form(db, form_id)
    db.delete(form)
    db.commit()

@router.post("/forms/{form_id}/duplicate", response_model=FormOut, status_code=status.HTTP_201_CREATED)
def duplicate_form(form_id: int, db: Session = Depends(get_db)):
    source = get_form(db, form_id)
    duplicate = Form(creator_id=source.creator_id, title=f"{source.title} copy", description=source.description, theme=source.theme, thank_you_message=source.thank_you_message, status="draft")
    db.add(duplicate)
    db.flush()
    for question in source.questions:
        db.add(Question(form_id=duplicate.id, type=question.type, title=question.title, description=question.description, required=question.required, order_index=question.order_index, options=question.options, settings=question.settings))
    db.commit()
    return get_form(db, duplicate.id)

@router.post("/forms/{form_id}/questions", response_model=QuestionOut, status_code=status.HTTP_201_CREATED)
def create_question(form_id: int, payload: QuestionCreate, db: Session = Depends(get_db)):
    form = get_form(db, form_id)
    question = Question(form_id=form.id, order_index=len(form.questions), **payload.model_dump())
    db.add(question)
    db.commit()
    db.refresh(question)
    return question

@router.patch("/questions/{question_id}", response_model=QuestionOut)
def update_question(question_id: int, payload: QuestionUpdate, db: Session = Depends(get_db)):
    question = get_question(db, question_id)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(question, key, value)
    db.commit()
    db.refresh(question)
    return question

@router.delete("/questions/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_question(question_id: int, db: Session = Depends(get_db)):
    question = get_question(db, question_id)
    form_id = question.form_id
    db.delete(question)
    db.flush()
    remaining = db.scalars(select(Question).where(Question.form_id == form_id).order_by(Question.order_index)).all()
    for index, item in enumerate(remaining):
        item.order_index = index
    db.commit()

@router.post("/forms/{form_id}/questions/reorder", response_model=list[QuestionOut])
def reorder_questions(form_id: int, payload: ReorderRequest, db: Session = Depends(get_db)):
    form = get_form(db, form_id)
    questions = {question.id: question for question in form.questions}
    if len(payload.question_ids) != len(questions) or set(payload.question_ids) != set(questions):
        raise HTTPException(status_code=400, detail="question_ids must contain every question exactly once")
    for index, question_id in enumerate(payload.question_ids):
        questions[question_id].order_index = index
    db.commit()
    return db.scalars(select(Question).where(Question.form_id == form_id).order_by(Question.order_index)).all()
