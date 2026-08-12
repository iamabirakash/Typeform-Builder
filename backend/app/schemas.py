from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

QuestionType = Literal["short_text", "long_text", "multiple_choice", "dropdown", "email", "number", "yes_no", "rating"]

class FormCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)

class FormUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None
    theme: dict[str, Any] | None = None
    thank_you_message: str | None = Field(default=None, max_length=1000)

class QuestionCreate(BaseModel):
    type: QuestionType
    title: str = Field(min_length=1, max_length=500)
    description: str | None = None
    required: bool = False
    options: list[str] | None = None
    settings: dict[str, Any] | None = None

    @field_validator("options")
    @classmethod
    def options_are_nonempty(cls, value):
        if value is not None and any(not option.strip() for option in value):
            raise ValueError("options cannot contain blank values")
        return value

class QuestionUpdate(BaseModel):
    type: QuestionType | None = None
    title: str | None = Field(default=None, min_length=1, max_length=500)
    description: str | None = None
    required: bool | None = None
    options: list[str] | None = None
    settings: dict[str, Any] | None = None

class QuestionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    form_id: int
    type: str
    title: str
    description: str | None
    required: bool
    order_index: int
    options: list[str] | None
    settings: dict[str, Any] | None

class FormListItem(BaseModel):
    id: int
    title: str
    status: str
    response_count: int
    updated_at: datetime | None

class FormOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    creator_id: int
    title: str
    description: str | None
    status: str
    public_slug: str | None
    theme: dict[str, Any] | None
    thank_you_message: str
    created_at: datetime | None
    updated_at: datetime | None
    questions: list[QuestionOut]

class ReorderRequest(BaseModel):
    question_ids: list[int] = Field(min_length=1)
