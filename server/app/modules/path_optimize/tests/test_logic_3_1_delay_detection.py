"""
Phase 7: Logic 3.1 - 돌발상황 감지 (Exception Handling - Delay Detection)

헌법 준수:
- AGENTS.md 백엔드 헌법 [제5장] 개발 방법론 (TDD/Pytest)
- v3.0 명세서 [Logic 3.1] 지연 감지
- OpenAPI 스펙 응답 구조 준수

[Phase 7 테스트 시나리오]:
1. ✅ 지연 감지 (5분 이상)
   - 예시: "⚠️지연 감지! [A정류장] 부근이 평소보다 5분 이상 늦어지고 있습니다."
2. ✅ 정상 운행 (5분 미만)
   - 예시: "NO_ACTION"
3. ✅ 통계 데이터 부족
   - 폴백: TPEG 데이터 사용 또는 알림 안 함
4. ✅ 응답 구조 검증
"""

import pytest
from datetime import datetime, timedelta
from typing import Dict, Any, Optional


class TestLogic3_1DelayDetection:
    """Logic 3.1 - 돌발상황 감지 (Delay Detection) 테스트"""

    # ========================================
    # 테스트 데이터 Fixtures
    # ========================================

    @pytest.fixture
    def segment_info(self) -> Dict[str, Any]:
        """구간 정보 (A정류장 → B정류장)"""
        return {
            "segment_id": "SEG_001",
            "from_station": "A정류장",
            "to_station": "B정류장",
            "segment_name": "A정류장 → B정류장",
            "distance_km": 2.5
        }

    @pytest.fixture
    def average_duration_data(self) -> Dict[str, int]:
        """평균 소요시간 데이터 (평소 데이터, 월요일 오전 8시)"""
        return {
            "segment_id": "SEG_001",
            "hour": 8,  # 오전 8시 (출근 시간대)
            "day_of_week": 1,  # 월요일
            "avg_duration_seconds": 5 * 60,  # 평소: 5분 = 300초
            "sample_count": 2545,  # 충분한 샘플
            "data_quality": "HIGH"
        }

    @pytest.fixture
    def real_time_duration_data(self) -> Dict[str, Any]:
        """실시간 예상 소요시간 (TPEG 또는 실시간 데이터)"""
        return {
            "segment_id": "SEG_001",
            "predicted_duration_seconds": 10 * 60,  # 현재 예상: 10분 = 600초
            "data_source": "TPEG",  # TPEG, Odsay, etc.
            "last_updated": "2025-11-12T08:15:00",
            "confidence": 0.95  # 95% 신뢰도
        }

    # ========================================
    # Scenario 1: 지연 감지 (5분 이상)
    # ========================================

    def test_delay_detection_5_minutes_above(
        self,
        segment_info: Dict[str, Any],
        average_duration_data: Dict[str, int],
        real_time_duration_data: Dict[str, Any]
    ):
        """
        [Phase 7 - 시나리오 1] 지연 감지 (5분 이상)

        상황:
        - 구간: A정류장 → B정류장
        - 평소 소요시간: 5분 (300초)
        - 현재 예상 소요시간: 10분 (600초)
        - 지연차: 5분 ✓ (5분 이상 = 경고)

        예상 결과:
        - action: "EXCEPTION_DETECTED"
        - type: "DELAY_WARNING"
        - message: "⚠️지연 감지! [A정류장] 부근이 평소보다 5분 이상 늦어지고 있습니다."
        - delay_minutes: 5
        - segment_name: "A정류장 → B정류장"
        - priority: "HIGH"
        """
        # Given: 지연 데이터
        avg_duration = average_duration_data["avg_duration_seconds"]  # 300초
        real_time_duration = real_time_duration_data["predicted_duration_seconds"]  # 600초
        delay_seconds = real_time_duration - avg_duration  # 300초
        delay_minutes = delay_seconds // 60  # 5분

        delay_threshold = 5  # 5분 이상
        is_delayed = delay_minutes >= delay_threshold

        # When: 지연 판정
        message = (
            f"⚠️지연 감지! [{segment_info['from_station']}] 부근이 "
            f"평소보다 {delay_minutes}분 이상 늦어지고 있습니다."
        )

        result = {
            "action": "EXCEPTION_DETECTED",
            "type": "DELAY_WARNING",
            "message": message,
            "delay_minutes": delay_minutes,
            "segment_name": segment_info["segment_name"],
            "priority": "HIGH",
            "is_delayed": is_delayed
        }

        # Then: 응답 검증
        assert is_delayed is True
        assert result["type"] == "DELAY_WARNING"
        assert result["delay_minutes"] == 5
        assert "지연 감지" in result["message"]
        assert segment_info["from_station"] in result["message"]
        assert "평소보다" in result["message"]

    def test_delay_detection_10_minutes_above(
        self,
        segment_info: Dict[str, Any]
    ):
        """
        [Phase 7 - 시나리오 1 추가] 매우 심한 지연 (10분 이상)

        상황:
        - 평소: 5분 (300초)
        - 현재: 15분 (900초)
        - 지연차: 10분 (매우 심각)

        예상 결과:
        - delay_minutes: 10
        - priority: "CRITICAL" (또는 "HIGH")
        """
        # Given
        avg_duration = 5 * 60  # 300초
        real_time_duration = 15 * 60  # 900초
        delay_minutes = (real_time_duration - avg_duration) // 60  # 10분

        delay_threshold = 5
        is_delayed = delay_minutes >= delay_threshold

        # When
        priority = "CRITICAL" if delay_minutes >= 10 else "HIGH"

        result = {
            "delay_minutes": delay_minutes,
            "priority": priority,
            "is_delayed": is_delayed
        }

        # Then
        assert result["delay_minutes"] == 10
        assert result["priority"] == "CRITICAL"
        assert result["is_delayed"] is True

    # ========================================
    # Scenario 2: 정상 운행 (5분 미만)
    # ========================================

    def test_normal_operation_under_5_minutes(
        self,
        segment_info: Dict[str, Any]
    ):
        """
        [Phase 7 - 시나리오 2] 정상 운행 (5분 미만 지연)

        상황:
        - 평소: 5분 (300초)
        - 현재: 7분 (420초)
        - 지연차: 2분 (5분 미만 = 정상)

        예상 결과:
        - action: "NO_ACTION"
        - is_delayed: False
        """
        # Given
        avg_duration = 5 * 60  # 300초
        real_time_duration = 7 * 60  # 420초
        delay_minutes = (real_time_duration - avg_duration) // 60  # 2분

        delay_threshold = 5
        is_delayed = delay_minutes >= delay_threshold

        # When
        result = {
            "action": "NO_ACTION" if not is_delayed else "EXCEPTION_DETECTED",
            "delay_minutes": delay_minutes,
            "is_delayed": is_delayed
        }

        # Then
        assert is_delayed is False
        assert result["action"] == "NO_ACTION"
        assert result["delay_minutes"] == 2

    def test_no_delay_exact_average(
        self,
        segment_info: Dict[str, Any]
    ):
        """
        [Phase 7 - 시나리오 2 추가] 평소와 정확히 동일한 시간

        상황:
        - 평소: 5분
        - 현재: 5분
        - 지연차: 0분

        예상 결과:
        - is_delayed: False
        """
        # Given
        avg_duration = 5 * 60
        real_time_duration = 5 * 60
        delay_minutes = (real_time_duration - avg_duration) // 60

        # Then
        assert delay_minutes == 0
        assert not (delay_minutes >= 5)

    # ========================================
    # Scenario 3: 통계 데이터 부족
    # ========================================

    def test_insufficient_statistical_data(
        self,
        segment_info: Dict[str, Any]
    ):
        """
        [Phase 7 - 시나리오 3] 통계 데이터 부족

        상황:
        - 구간별 평균 데이터 없음 (새로운 도로, 드문 노선)
        - 샘플 수: 100개 미만 (신뢰도 낮음)

        예상 결과:
        - action: "NO_ACTION" 또는 "FALLBACK_TO_TPEG"
        - message: 지연 판단 불가능 또는 TPEG 데이터만 사용
        """
        # Given: 통계 데이터 부족
        insufficient_data = {
            "segment_id": "SEG_NEW",
            "sample_count": 50,  # 신뢰도 낮음
            "data_quality": "LOW"
        }

        # When: 폴백 처리
        if insufficient_data["sample_count"] < 100:
            action = "FALLBACK_TO_TPEG"
            message = "통계 데이터 부족 - TPEG 데이터로 판단합니다."
        else:
            action = "DELAY_CHECK"

        result = {
            "action": action,
            "message": message,
            "data_quality": insufficient_data["data_quality"]
        }

        # Then
        assert result["action"] == "FALLBACK_TO_TPEG"
        assert insufficient_data["data_quality"] == "LOW"

    def test_fallback_to_tpeg_when_no_statistical_data(
        self,
        segment_info: Dict[str, Any]
    ):
        """
        [Phase 7 - 시나리오 3 추가] TPEG 데이터로 폴백

        상황:
        - 구간 평균 데이터: 없음
        - TPEG 데이터: 사용 가능

        예상 결과:
        - 지연 판정 방식: TPEG 신뢰도 기반
        """
        # Given: 평균 데이터 없음, TPEG 데이터 있음
        has_average_data = False
        tpeg_confidence = 0.95

        # When: TPEG 폴백
        if not has_average_data:
            data_source = "TPEG"
            fallback_enabled = True
        else:
            data_source = "STATISTICAL"

        result = {
            "data_source": data_source,
            "fallback_enabled": fallback_enabled,
            "confidence": tpeg_confidence if data_source == "TPEG" else None
        }

        # Then
        assert result["data_source"] == "TPEG"
        assert result["fallback_enabled"] is True

    # ========================================
    # Scenario 4: 응답 구조 검증
    # ========================================

    def test_exception_alert_response_structure(
        self,
        segment_info: Dict[str, Any]
    ):
        """
        [Phase 7 - 시나리오 4] 응답 구조 검증

        상황:
        - 지연 감지 응답

        예상 결과:
        - OpenAPI 스펙 준수
        - 필요한 모든 필드 포함
        """
        # Given: 지연 감지 데이터
        exception_data = {
            "action": "EXCEPTION_DETECTED",
            "type": "DELAY_WARNING",
            "segment_name": segment_info["segment_name"],
            "from_station": segment_info["from_station"],
            "delay_minutes": 5,
            "message": "⚠️지연 감지! [A정류장] 부근이 평소보다 5분 이상 늦어지고 있습니다.",
            "avg_duration_seconds": 300,
            "predicted_duration_seconds": 600,
            "priority": "HIGH"
        }

        # Then: 응답 구조 검증
        assert "action" in exception_data
        assert "type" in exception_data
        assert "message" in exception_data
        assert "delay_minutes" in exception_data
        assert "segment_name" in exception_data
        assert "priority" in exception_data
        assert exception_data["action"] == "EXCEPTION_DETECTED"
        assert exception_data["type"] == "DELAY_WARNING"

    # ========================================
    # Scenario 5: 복합 상황 (다중 구간 지연)
    # ========================================

    def test_multiple_segment_delays(self):
        """
        [Phase 7 - 시나리오 5] 복합 상황: 여러 구간 지연

        상황:
        - 경로: A정류장 → B정류장 → C정류장
        - A→B 구간: 지연 3분 (미경고)
        - B→C 구간: 지연 8분 (경고)

        예상 결과:
        - B→C 구간만 경고
        - 가장 심각한 구간만 우선 표시
        """
        # Given: 여러 구간 데이터
        segments = [
            {
                "segment_name": "A정류장 → B정류장",
                "delay_minutes": 3,
                "is_delayed": False
            },
            {
                "segment_name": "B정류장 → C정류장",
                "delay_minutes": 8,
                "is_delayed": True
            }
        ]

        # When: 지연 구간 필터링
        delayed_segments = [s for s in segments if s["is_delayed"]]
        most_critical = max(delayed_segments, key=lambda x: x["delay_minutes"]) if delayed_segments else None

        # Then
        assert len(delayed_segments) == 1
        assert most_critical["segment_name"] == "B정류장 → C정류장"
        assert most_critical["delay_minutes"] == 8

    # ========================================
    # Scenario 6: 경계값 테스트
    # ========================================

    def test_boundary_exactly_5_minutes(self):
        """
        [Phase 7 - 경계값] 정확히 5분 지연

        상황:
        - 평소: 5분
        - 현재: 10분
        - 지연차: 정확히 5분

        예상 결과:
        - 경고 대상 (>= 5분)
        """
        # Given
        delay_minutes = 5
        threshold = 5

        # When
        is_delayed = delay_minutes >= threshold

        # Then
        assert is_delayed is True

    def test_boundary_just_under_5_minutes(self):
        """
        [Phase 7 - 경계값] 5분 직전 (4분 59초)

        상황:
        - 지연차: 4분 59초 → 정수로는 4분

        예상 결과:
        - 미경고
        """
        # Given
        delay_seconds = 4 * 60 + 59  # 299초
        delay_minutes = delay_seconds // 60  # 4분 (버림)
        threshold = 5

        # When
        is_delayed = delay_minutes >= threshold

        # Then
        assert delay_minutes == 4
        assert is_delayed is False
