"""
로깅 설정
프로덕션 및 개발 환경에서의 로깅 구성을 관리합니다.
"""
import logging
import sys
from pathlib import Path
from typing import Any, Dict
from datetime import datetime


def setup_logging(log_level: str = "INFO", log_format: str = "text") -> None:
    """
    애플리케이션 로깅 설정

    Args:
        log_level: 로그 레벨 (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        log_format: 로그 포맷 (text, json)
    """
    # 로그 레벨 설정
    level = getattr(logging, log_level.upper(), logging.INFO)

    # 로그 포맷 설정
    if log_format == "json":
        formatter = JsonFormatter()
    else:
        formatter = TextFormatter()

    # 루트 로거 설정
    root_logger = logging.getLogger()
    root_logger.setLevel(level)

    # 기존 핸들러 제거
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)

    # 콘솔 핸들러
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(level)
    console_handler.setFormatter(formatter)
    root_logger.addHandler(console_handler)

    # 파일 핸들러 (선택 사항)
    # log_dir = Path("logs")
    # log_dir.mkdir(exist_ok=True)
    # file_handler = logging.handlers.RotatingFileHandler(
    #     log_dir / "app.log",
    #     maxBytes=10485760,  # 10MB
    #     backupCount=5
    # )
    # file_handler.setLevel(level)
    # file_handler.setFormatter(formatter)
    # root_logger.addHandler(file_handler)

    # 외부 라이브러리 로그 레벨 조정
    logging.getLogger("uvicorn").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)

    logging.info(f"Logging initialized (level={log_level}, format={log_format})")


class TextFormatter(logging.Formatter):
    """텍스트 형식 로그 포맷터"""

    def __init__(self):
        super().__init__(
            fmt="%(asctime)s | %(levelname)-8s | %(name)s:%(lineno)d | %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S"
        )


class JsonFormatter(logging.Formatter):
    """JSON 형식 로그 포맷터 (프로덕션 권장)"""

    def format(self, record: logging.LogRecord) -> str:
        import json

        log_data: Dict[str, Any] = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }

        # 예외 정보 추가
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)

        # 추가 컨텍스트 정보
        if hasattr(record, "request_id"):
            log_data["request_id"] = record.request_id

        if hasattr(record, "user_id"):
            log_data["user_id"] = record.user_id

        return json.dumps(log_data, ensure_ascii=False)


def get_logger(name: str) -> logging.Logger:
    """
    모듈별 로거 생성

    Args:
        name: 로거 이름 (보통 __name__ 사용)

    Returns:
        logging.Logger: 설정된 로거

    Example:
        >>> logger = get_logger(__name__)
        >>> logger.info("Starting process")
    """
    return logging.getLogger(name)


# 로깅 유틸리티 함수
def log_request(logger: logging.Logger, method: str, path: str, user_id: str = None):
    """HTTP 요청 로깅"""
    extra = {"user_id": user_id} if user_id else {}
    logger.info(f"{method} {path}", extra=extra)


def log_error(logger: logging.Logger, error: Exception, context: Dict[str, Any] = None):
    """에러 로깅 (상세 정보 포함)"""
    logger.error(
        f"Error: {type(error).__name__}: {str(error)}",
        exc_info=True,
        extra=context or {}
    )


def log_metric(logger: logging.Logger, metric_name: str, value: float, tags: Dict[str, str] = None):
    """메트릭 로깅 (모니터링 시스템 연동용)"""
    log_data = {
        "metric": metric_name,
        "value": value,
        "tags": tags or {}
    }
    logger.info(f"METRIC: {log_data}")
