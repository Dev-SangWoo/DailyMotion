/**
 * 목업 데이터 (Mock Data)
 *
 * Phase 8: 데이터 연동 & API 통합 준비
 * - Expo 환경에서 실제 API 없이 UI 테스트 가능하도록 함
 * - 다양한 시나리오의 목업 응답 제공
 *
 * 헌법 준수:
 * - CLAUDE.md 제3장: 데이터 페칭 (API 명세에 맞춘 응답)
 * - OpenAPI 스펙 GET /v1/briefings/commute 준수
 */

export interface CommuteBriefingResponse {
  data: {
    alertType: 'GO_NOW' | 'LAST_CHANCE' | 'NO_ACTION';
    message: string;
    recommendedTransport: {
      type: string;
      name: string;
      departureInMinutes: number;
    };
  };
}

/**
 * GO_NOW: 정상 출발 가능 상태
 * - 배경색: 파란색 (정상)
 * - Logic 3.1: 정상 상태 (지연 감지 없음)
 */
export const mockResponseGoNow: CommuteBriefingResponse = {
  data: {
    alertType: 'GO_NOW',
    message: '지금 출발하면 정시에 도착할 수 있습니다.',
    recommendedTransport: {
      type: 'bus',
      name: '지선버스 123번',
      departureInMinutes: 7,
    },
  },
};

/**
 * LAST_CHANCE: 지연 감지 - 마지노선 경고
 * - 배경색: 주황색 (경고)
 * - Logic 3.2: 지연 감지 시 경고 색상
 */
export const mockResponseLastChance: CommuteBriefingResponse = {
  data: {
    alertType: 'LAST_CHANCE',
    message: '교통 혼잡이 감지되었습니다. 지금 바로 출발해야 정시에 도착할 수 있습니다.',
    recommendedTransport: {
      type: 'bus',
      name: '광역버스 3100',
      departureInMinutes: 3,
    },
  },
};

/**
 * NO_ACTION: 아직 출발할 필요 없음
 * - 배경색: 파란색 (정상)
 * - Logic 1.2: 아직 출발 시간이 아님
 */
export const mockResponseNoAction: CommuteBriefingResponse = {
  data: {
    alertType: 'NO_ACTION',
    message: '아직 여유 있습니다. 20분 후 출발하면 정시 도착이 예상됩니다.',
    recommendedTransport: {
      type: 'subway',
      name: '지하철 2호선',
      departureInMinutes: 20,
    },
  },
};

/**
 * 시나리오별 목업 응답 세트
 * - 다양한 상황을 테스트할 수 있도록 여러 버전 제공
 */
export const mockScenarios = {
  // 정상 시나리오
  normalCommute: {
    data: {
      alertType: 'GO_NOW' as const,
      message: '정상 운행 중입니다. 지금 출발해도 괜찮습니다.',
      recommendedTransport: {
        type: 'bus',
        name: '지선버스 456번',
        departureInMinutes: 5,
      },
    },
  },

  // 약간의 혼잡
  lightCongestion: {
    data: {
      alertType: 'GO_NOW' as const,
      message: '약간의 혼잡이 있으나 정시 도착 가능합니다.',
      recommendedTransport: {
        type: 'bus',
        name: '광역버스 7000',
        departureInMinutes: 8,
      },
    },
  },

  // 심각한 혼잡 - 마지노선
  heavyCongestion: {
    data: {
      alertType: 'LAST_CHANCE' as const,
      message: '심각한 교통 혼잡이 감지되었습니다. 즉시 출발하세요!',
      recommendedTransport: {
        type: 'bus',
        name: '지선버스 789번',
        departureInMinutes: 2,
      },
    },
  },

  // 지하철 추천
  subwayRecommendation: {
    data: {
      alertType: 'GO_NOW' as const,
      message: '지하철 이용이 권장됩니다. 지표면 도로의 혼잡이 심합니다.',
      recommendedTransport: {
        type: 'subway',
        name: '지하철 3호선',
        departureInMinutes: 4,
      },
    },
  },

  // 택시/대안 경로 추천
  alternativeRoute: {
    data: {
      alertType: 'LAST_CHANCE' as const,
      message: '택시 또는 대안 경로 이용을 권장합니다.',
      recommendedTransport: {
        type: 'taxi',
        name: '택시',
        departureInMinutes: 1,
      },
    },
  },

  // 여유 있음
  plentyOfTime: {
    data: {
      alertType: 'NO_ACTION' as const,
      message: '현재 충분한 시간이 있습니다. 30분 후 출발해도 괜찮습니다.',
      recommendedTransport: {
        type: 'subway',
        name: '지하철 1호선',
        departureInMinutes: 30,
      },
    },
  },
} as const;

/**
 * 랜덤 목업 응답 선택
 * Expo에서 매번 다른 상태를 테스트하기 위해 사용
 */
export const getRandomMockResponse = (): CommuteBriefingResponse => {
  const scenarios = Object.values(mockScenarios);
  const randomIndex = Math.floor(Math.random() * scenarios.length);
  return scenarios[randomIndex] as CommuteBriefingResponse;
};
