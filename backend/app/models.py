from datetime import datetime
from typing import Any

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Integer, JSON, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base

class Creator(Base):
    __tablename__ = "creators"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String, default="Default Creator")
    email: Mapped[str | None] = mapped_column(String, nullable=True)
    password_hash: Mapped[str | None] = mapped_column(String, nullable=True)
    auth_provider: Mapped[str] = mapped_column(String, default="password", nullable=False)
    google_sub: Mapped[str | None] = mapped_column(String, unique=True, nullable=True)
    forms: Mapped[list["Form"]] = relationship(back_populates="creator", cascade="all, delete-orphan")

class Form(Base):
    __tablename__ = "forms"
    __table_args__ = (CheckConstraint("status IN ('draft', 'published')", name="ck_forms_status"),)
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    creator_id: Mapped[int] = mapped_column(ForeignKey("creators.id"), nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String, default="draft", nullable=False)
    public_slug: Mapped[str | None] = mapped_column(String, unique=True, nullable=True)
    theme: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    welcome_message: Mapped[str] = mapped_column(String, default="Welcome! Let's get started.")
    thank_you_message: Mapped[str] = mapped_column(String, default="Thanks for completing this form!")
    tags: Mapped[list[str] | None] = mapped_column(JSON, nullable=True, default=list)
    folder: Mapped[str | None] = mapped_column(String, nullable=True)
    is_favorite: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.current_timestamp())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.current_timestamp(), onupdate=func.current_timestamp())
    creator: Mapped[Creator] = relationship(back_populates="forms")
    questions: Mapped[list["Question"]] = relationship(back_populates="form", cascade="all, delete-orphan", order_by="Question.order_index")
    responses: Mapped[list["Response"]] = relationship(back_populates="form", cascade="all, delete-orphan")
    activity: Mapped[list["FormActivity"]] = relationship(back_populates="form", cascade="all, delete-orphan", order_by="desc(FormActivity.created_at)")

class FormActivity(Base):
    __tablename__ = "form_activity"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    form_id: Mapped[int] = mapped_column(ForeignKey("forms.id", ondelete="CASCADE"), nullable=False)
    action: Mapped[str] = mapped_column(String, nullable=False)
    details: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.current_timestamp())
    form: Mapped[Form] = relationship(back_populates="activity")

class Question(Base):
    __tablename__ = "questions"
    __table_args__ = (CheckConstraint("type IN ('short_text', 'long_text', 'multiple_choice', 'dropdown', 'email', 'number', 'yes_no', 'rating')", name="ck_questions_type"),)
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    form_id: Mapped[int] = mapped_column(ForeignKey("forms.id", ondelete="CASCADE"), nullable=False)
    type: Mapped[str] = mapped_column(String, nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    required: Mapped[bool] = mapped_column(Boolean, default=False)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False)
    options: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    settings: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    form: Mapped[Form] = relationship(back_populates="questions")
    answers: Mapped[list["Answer"]] = relationship(back_populates="question")
