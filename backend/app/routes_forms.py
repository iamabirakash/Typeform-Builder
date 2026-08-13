from datetime import datetime
import secrets

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from .database import get_db
from .auth import current_creator
from .models import Creator, Form, FormActivity, Question
from .models_response import Response
from .schemas import ActivityOut, FormCreate, FormListItem, FormOut, FormUpdate, QuestionCreate, QuestionOut, QuestionUpdate, ReorderRequest, TemplateOut

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

def owned_form(db: Session, form_id: int, creator: Creator) -> Form:
    form = get_form(db, form_id)
    if form.creator_id != creator.id:
        raise HTTPException(status_code=403, detail="You do not own this form")
    return form

def owned_question(db: Session, question_id: int, creator: Creator) -> Question:
    question = get_question(db, question_id)
    if question.form.creator_id != creator.id:
        raise HTTPException(status_code=403, detail="You do not own this question")
    return question

def log_activity(db: Session, form_id: int, action: str, details: str | None = None):
    db.add(FormActivity(form_id=form_id, action=action, details=details))

@router.get("/forms", response_model=list[FormListItem])
def list_forms(search: str | None = None, folder: str | None = None, archived: bool = False, creator: Creator = Depends(current_creator), db: Session = Depends(get_db)):
    query = select(Form, func.count(Response.id)).outerjoin(Response).where(Form.creator_id == creator.id, Form.is_archived == archived).group_by(Form.id).order_by(Form.is_favorite.desc(), Form.updated_at.desc())
    if search:
        query = query.where(Form.title.ilike(f"%{search}%"))
    if folder:
        query = query.where(Form.folder == folder)
    rows = db.execute(query).all()
    return [FormListItem(id=form.id, title=form.title, status=form.status, response_count=count, updated_at=form.updated_at, tags=form.tags, folder=form.folder, is_favorite=form.is_favorite, is_archived=form.is_archived) for form, count in rows]

@router.get("/forms/templates", response_model=list[TemplateOut])
def list_templates(creator: Creator = Depends(current_creator)):
    return [
        TemplateOut(id="customer-feedback", title="Customer feedback", description="Learn what customers think.", questions=[{"type": "rating", "title": "How would you rate your experience?", "required": True, "settings": {"min": 1, "max": 5}}, {"type": "long_text", "title": "What could we improve?"}]),
        TemplateOut(id="event-signup", title="Event signup", description="Collect registrations quickly.", questions=[{"type": "short_text", "title": "What is your name?", "required": True}, {"type": "email", "title": "What is your email?", "required": True}]),
        TemplateOut(id="team-pulse", title="Team pulse", description="Run a lightweight team check-in.", questions=[{"type": "rating", "title": "How are you feeling this week?", "settings": {"min": 1, "max": 5}}, {"type": "long_text", "title": "Anything you want to share?"}]),
    ]

@router.post("/forms", response_model=FormOut, status_code=status.HTTP_201_CREATED)
def create_form(payload: FormCreate, creator: Creator = Depends(current_creator), db: Session = Depends(get_db)):
    form = Form(creator_id=creator.id, title=payload.title.strip(), theme={"color": "#635bff", "font": "Inter", "background": "#ffffff"})
    db.add(form)
    db.commit()
    log_activity(db, form.id, "created")
    db.commit()
    return get_form(db, form.id)

@router.get("/forms/{form_id}", response_model=FormOut)
def read_form(form_id: int, creator: Creator = Depends(current_creator), db: Session = Depends(get_db)):
    return owned_form(db, form_id, creator)

@router.patch("/forms/{form_id}", response_model=FormOut)
def update_form(form_id: int, payload: FormUpdate, creator: Creator = Depends(current_creator), db: Session = Depends(get_db)):
    form = owned_form(db, form_id, creator)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(form, key, value.strip() if isinstance(value, str) and key == "title" else value)
    form.updated_at = datetime.utcnow()
    log_activity(db, form.id, "updated", ", ".join(payload.model_dump(exclude_unset=True).keys()))
    db.commit()
    return get_form(db, form_id)

@router.delete("/forms/{form_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_form(form_id: int, creator: Creator = Depends(current_creator), db: Session = Depends(get_db)):
    form = owned_form(db, form_id, creator)
    db.delete(form)
    db.commit()

@router.get("/forms/{form_id}/activity", response_model=list[ActivityOut])
def form_activity(form_id: int, creator: Creator = Depends(current_creator), db: Session = Depends(get_db)):
    form = owned_form(db, form_id, creator)
    return db.scalars(select(FormActivity).where(FormActivity.form_id == form.id).order_by(FormActivity.created_at.desc()).limit(50)).all()

@router.post("/forms/{form_id}/archive", response_model=FormOut)
def archive_form(form_id: int, creator: Creator = Depends(current_creator), db: Session = Depends(get_db)):
    form = owned_form(db, form_id, creator)
    form.is_archived = True
    form.updated_at = datetime.utcnow()
    log_activity(db, form.id, "archived")
    db.commit()
    return get_form(db, form.id)

@router.post("/forms/{form_id}/restore", response_model=FormOut)
def restore_form(form_id: int, creator: Creator = Depends(current_creator), db: Session = Depends(get_db)):
    form = owned_form(db, form_id, creator)
    form.is_archived = False
    form.updated_at = datetime.utcnow()
    log_activity(db, form.id, "restored")
    db.commit()
    return get_form(db, form.id)

@router.post("/forms/{form_id}/publish", response_model=FormOut)
def publish_form(form_id: int, creator: Creator = Depends(current_creator), db: Session = Depends(get_db)):
    form = owned_form(db, form_id, creator)
    if not form.questions:
        raise HTTPException(status_code=400, detail="A form must have at least one question before publishing")
    if not form.public_slug:
        form.public_slug = secrets.token_urlsafe(8).lower().replace("_", "-").replace("/", "-")
    form.status = "published"
    form.updated_at = datetime.utcnow()
    db.commit()
    return get_form(db, form_id)

@router.post("/forms/{form_id}/unpublish", response_model=FormOut)
def unpublish_form(form_id: int, creator: Creator = Depends(current_creator), db: Session = Depends(get_db)):
    form = owned_form(db, form_id, creator)
    form.status = "draft"
    form.updated_at = datetime.utcnow()
    db.commit()
    return get_form(db, form_id)

@router.post("/forms/{form_id}/duplicate", response_model=FormOut, status_code=status.HTTP_201_CREATED)
def duplicate_form(form_id: int, creator: Creator = Depends(current_creator), db: Session = Depends(get_db)):
    source = owned_form(db, form_id, creator)
    duplicate = Form(creator_id=source.creator_id, title=f"{source.title} copy", description=source.description, theme=source.theme, welcome_message=source.welcome_message, thank_you_message=source.thank_you_message, tags=list(source.tags or []), folder=source.folder, status="draft")
    db.add(duplicate)
    db.flush()
    for question in source.questions:
        db.add(Question(form_id=duplicate.id, type=question.type, title=question.title, description=question.description, required=question.required, order_index=question.order_index, options=question.options, settings=question.settings))
    db.commit()
    return get_form(db, duplicate.id)

@router.post("/questions/{question_id}/duplicate", response_model=QuestionOut, status_code=status.HTTP_201_CREATED)
def duplicate_question(question_id: int, creator: Creator = Depends(current_creator), db: Session = Depends(get_db)):
    source = owned_question(db, question_id, creator)
    siblings = db.scalars(select(Question).where(Question.form_id == source.form_id).order_by(Question.order_index)).all()
    for item in siblings:
        if item.order_index > source.order_index:
            item.order_index += 1
    duplicate = Question(form_id=source.form_id, type=source.type, title=f"{source.title} copy", description=source.description, required=source.required, order_index=source.order_index + 1, options=source.options, settings=source.settings)
    db.add(duplicate)
    db.commit()
    db.refresh(duplicate)
    return duplicate

@router.post("/forms/{form_id}/questions", response_model=QuestionOut, status_code=status.HTTP_201_CREATED)
def create_question(form_id: int, payload: QuestionCreate, creator: Creator = Depends(current_creator), db: Session = Depends(get_db)):
    form = owned_form(db, form_id, creator)
    question = Question(form_id=form.id, order_index=len(form.questions), **payload.model_dump())
    db.add(question)
    db.commit()
    db.refresh(question)
    return question

@router.patch("/questions/{question_id}", response_model=QuestionOut)
def update_question(question_id: int, payload: QuestionUpdate, creator: Creator = Depends(current_creator), db: Session = Depends(get_db)):
    question = owned_question(db, question_id, creator)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(question, key, value)
    db.commit()
    db.refresh(question)
    return question

@router.delete("/questions/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_question(question_id: int, creator: Creator = Depends(current_creator), db: Session = Depends(get_db)):
    question = owned_question(db, question_id, creator)
    form_id = question.form_id
    db.delete(question)
    db.flush()
    remaining = db.scalars(select(Question).where(Question.form_id == form_id).order_by(Question.order_index)).all()
    for index, item in enumerate(remaining):
        item.order_index = index
    db.commit()

@router.post("/forms/{form_id}/questions/reorder", response_model=list[QuestionOut])
def reorder_questions(form_id: int, payload: ReorderRequest, creator: Creator = Depends(current_creator), db: Session = Depends(get_db)):
    form = owned_form(db, form_id, creator)
    questions = {question.id: question for question in form.questions}
    if len(payload.question_ids) != len(questions) or set(payload.question_ids) != set(questions):
        raise HTTPException(status_code=400, detail="question_ids must contain every question exactly once")
    for index, question_id in enumerate(payload.question_ids):
        questions[question_id].order_index = index
    db.commit()
    return db.scalars(select(Question).where(Question.form_id == form_id).order_by(Question.order_index)).all()
