"""Idempotently populate the local database with useful demo data."""

import json

from sqlalchemy import select

from .database import SessionLocal, init_db
from .models import Creator, Form, Question
from .models_response import Answer, Response


def get_or_create_form(db, creator, title, description, questions):
    form = db.scalar(select(Form).where(Form.creator_id == creator.id, Form.title == title))
    if form is None:
        form = Form(
            creator_id=creator.id,
            title=title,
            description=description,
            status="published",
            public_slug=title.lower().replace(" ", "-") + "-demo",
            theme={"color": "#635bff", "font": "Inter", "background": "#ffffff"},
            thank_you_message="Thanks for sharing your feedback!",
        )
        db.add(form)
        db.flush()
    if not form.questions:
        for index, definition in enumerate(questions):
            db.add(Question(form_id=form.id, order_index=index, **definition))
        db.flush()
    form.status = "published"
    return form


def seed_responses(db, form, answer_sets):
    response_count = len(db.scalars(select(Response).where(Response.form_id == form.id)).all())
    if response_count >= len(answer_sets):
        return
    questions = db.scalars(select(Question).where(Question.form_id == form.id).order_by(Question.order_index)).all()
    for index in range(response_count, len(answer_sets)):
        values, complete = answer_sets[index]
        response = Response(form_id=form.id, is_complete=complete, respondent_meta={"source": "seed", "device": "desktop" if index % 2 == 0 else "mobile"})
        db.add(response)
        db.flush()
        for question, value in zip(questions, values):
            if value is not None:
                encoded = value if isinstance(value, str) else json.dumps(value)
                db.add(Answer(response_id=response.id, question_id=question.id, value=encoded))


def run_seed():
    init_db()
    db = SessionLocal()
    try:
        creator = db.get(Creator, 1)
        if creator is None:
            creator = Creator(id=1, name="Default Creator", email="creator@example.com")
            db.add(creator)
            db.flush()

        feedback_questions = [
            {"type": "rating", "title": "How would you rate your overall experience?", "required": True, "settings": {"min": 1, "max": 5}},
            {"type": "multiple_choice", "title": "What did you like most?", "options": ["Ease of use", "Speed", "Design", "Support"]},
            {"type": "long_text", "title": "Tell us a little more", "description": "Your detail helps our team improve."},
            {"type": "yes_no", "title": "Would you recommend us to a friend?", "required": True},
        ]
        feedback = get_or_create_form(db, creator, "Customer Feedback", "A quick pulse check from our customers.", feedback_questions)
        feedback_answers = [
            ([5, "Ease of use", "The experience was intuitive from the first click.", "yes"], True),
            ([4, "Design", "The clean layout made it easy to find what I needed.", "yes"], True),
            ([5, "Speed", "Everything loaded quickly, even on mobile.", "yes"], True),
            ([3, "Support", "The product is good, but setup documentation could be clearer.", "yes"], True),
            ([4, "Ease of use", "Simple and pleasant overall.", "yes"], True),
            ([2, "Support", "I had trouble finding the right settings.", "no"], False),
            ([5, "Design", "Beautiful and focused.", "yes"], True),
            ([4, "Speed", "Fast enough for our daily workflow.", "yes"], False),
        ]

        signup_questions = [
            {"type": "short_text", "title": "What is your name?", "required": True},
            {"type": "email", "title": "What is your email?", "required": True},
            {"type": "dropdown", "title": "Which session interests you?", "options": ["Product design", "Engineering", "Growth", "Operations"]},
            {"type": "number", "title": "How many people are attending?", "settings": {"min": 1, "max": 20}},
        ]
        signup = get_or_create_form(db, creator, "Event Signup", "Reserve your place at our next community event.", signup_questions)
        signup_answers = [
            (["Ava Patel", "ava@example.com", "Product design", 1], True),
            (["Noah Williams", "noah@example.com", "Engineering", 2], True),
            (["Mia Chen", "mia@example.com", "Growth", 3], True),
            (["Liam Johnson", "liam@example.com", "Operations", 1], True),
            (["Sophia Brown", "sophia@example.com", "Engineering", 4], True),
            (["Oliver Smith", "oliver@example.com", "Product design", 2], False),
            (["Isabella Garcia", "isabella@example.com", "Growth", 1], True),
            (["Ethan Davis", "ethan@example.com", "Operations", 2], False),
        ]

        seed_responses(db, feedback, feedback_answers)
        seed_responses(db, signup, signup_answers)
        db.commit()
        print(f"Seeded Customer Feedback (id={feedback.id}) and Event Signup (id={signup.id})")
    finally:
        db.close()


if __name__ == "__main__":
    run_seed()
