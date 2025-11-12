"""
경로 최적화 관련 API 라우터
"""
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/path-optimize", tags=["path-optimize"])


class PathRequest(BaseModel):
    """경로 최적화 요청 모델"""
    start_point: dict
    end_point: dict
    constraints: dict = {}


@router.post("/optimize")
async def optimize_path(request: PathRequest):
    """경로 최적화"""
    # TODO: modules/path_optimize/service.py의 비즈니스 로직 호출
    return {"message": "경로 최적화 완료", "optimized_path": []}


@router.get("/history")
async def get_optimization_history():
    """최적화 이력 조회"""
    # TODO: modules/path_optimize/service.py의 비즈니스 로직 호출
    return {"message": "최적화 이력 조회"}

