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

class PublicFormOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    description: str | None
    theme: dict[str, Any] | None
    thank_you_message: str
    public_slug: str
    questions: list[QuestionOut]

class ResponseCreate(BaseModel):
    respondent_meta: dict[str, Any] | None = None

class ResponseCreated(BaseModel):
    response_id: int

class AnswerUpsert(BaseModel):
    question_id: int
    value: Any

class ResponseListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    submitted_at: datetime | None
    is_complete: bool

class ResponsePage(BaseModel):
    page: int
    page_size: int
    total: int
    items: list[ResponseListItem]

class AnswerOut(BaseModel):
    question_id: int
    question_title: str
    value: Any

class ResponseDetail(BaseModel):
    id: int
    form_id: int
    submitted_at: datetime | None
    is_complete: bool
    respondent_meta: dict[str, Any] | None
    answers: list[AnswerOut]

class SummaryItem(BaseModel):
    question_id: int
    question_title: str
    type: str
    total_answers: int
    counts: dict[str, int] | None = None
    average: float | None = None
    distribution: dict[str, int] | None = None
    samples: list[Any] | None = None

class FormSummary(BaseModel):
    form_id: int
    total_responses: int
    completed_responses: int
    questions: list[SummaryItem]

class SignupRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: str = Field(min_length=3, max_length=320)
    password: str = Field(min_length=8, max_length=128)

class LoginRequest(BaseModel):
    email: str
    password: str

class CreatorOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    email: str | None
    auth_provider: str

class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    creator: CreatorOut
