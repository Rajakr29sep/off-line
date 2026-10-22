from pydantic import BaseModel, Field

class AskRequest(BaseModel):
    question: str = Field(min_length=1, max_length=3000)
    categoryId: str = Field(default="emergency-knowledge", max_length=100)
    topic: str = Field(default="", max_length=300)
