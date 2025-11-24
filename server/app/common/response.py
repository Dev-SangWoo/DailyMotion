"""
공통 응답 래퍼 (Envelope Pattern)

OpenAPI 스펙 준수:
- 모든 2xx 응답을 {"data": <payload>} 형태로 래핑
- Swagger 호환성 보장

사용법:
    from app.common.response import Envelope

    @app.get("/example", response_model=Envelope[ExampleResponse])
    def get_example():
        return {"data": ExampleResponse(...)}
"""

from pydantic import BaseModel
from typing import TypeVar, Generic

# Generic 타입 변수
T = TypeVar('T')


class Envelope(BaseModel, Generic[T]):
    """
    Envelope 응답 래퍼

    모든 2xx 응답을 {"data": <payload>} 형태로 래핑합니다.

    예시:
        {"data": {"alertType": "GO_NOW", "message": "..."}}
    """
    data: T

    class Config:
        schema_extra = {
            "example": {
                "data": {
                    "alertType": "GO_NOW",
                    "message": "지금 출발하세요"
                }
            }
        }
