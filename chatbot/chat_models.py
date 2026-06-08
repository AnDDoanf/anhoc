from typing import Any, Literal, Optional

from pydantic import AliasChoices, BaseModel, ConfigDict, Field

Language = Literal["vi", "en", "mixed"]
TutorMode = Literal["hint", "solve", "check", "explain", "practice", "review"]


class TutorChatRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    user_id: str = Field(validation_alias=AliasChoices("userId", "user_id"))
    conversation_id: Optional[str] = Field(default=None, validation_alias=AliasChoices("conversationId", "conversation_id"))
    message: str
    grade: Optional[int] = None
    lesson_id: Optional[str] = Field(default=None, validation_alias=AliasChoices("lessonId", "lesson_id"))
    mode: Optional[TutorMode] = "solve"
    language: Optional[Language] = None
    locale: Optional[str] = None
    provider: Optional[str] = "ollama"


class TutorChatResponse(BaseModel):
    conversation_id: str = Field(serialization_alias="conversationId")
    answer: str
    language: Language
    intent: str
    mode: TutorMode
    steps: list[str] = []
    final_answer: Optional[str] = Field(default=None, serialization_alias="finalAnswer")
    suggested_actions: list[str] = Field(default_factory=list, serialization_alias="suggestedActions")
    context_used: dict[str, Any] = Field(default_factory=dict, serialization_alias="contextUsed")


class CheckAnswerRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    user_id: str = Field(validation_alias=AliasChoices("userId", "user_id"))
    question: str
    student_answer: str = Field(validation_alias=AliasChoices("studentAnswer", "student_answer"))
    language: Optional[Language] = None


class CheckAnswerResponse(BaseModel):
    is_correct: bool = Field(serialization_alias="isCorrect")
    correct_answer: Optional[str] = Field(default=None, serialization_alias="correctAnswer")
    feedback: str
    language: Language


class PracticeRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    user_id: str = Field(validation_alias=AliasChoices("userId", "user_id"))
    topic: str
    grade: Optional[int] = None
    difficulty: Optional[str] = "easy"
    language: Optional[Language] = None


class PracticeResponse(BaseModel):
    question: str
    hint: str
    answer: str
    solution: list[str]
    language: Language


class WidgetChatResponse(BaseModel):
    thought: str
    answer: str
    context_used: dict[str, Any]
    remaining_uses: int
