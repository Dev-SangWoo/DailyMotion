/**
 * 세이프티가드 스토어
 *
 * 제보된 위험 요소들과 AI 검증 상태를 관리합니다.
 */

import { create } from 'zustand';

export interface RiskReport {
  id: string;
  riskTypes: string[];
  description: string;
  photos: string[];
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  timestamp: number;
  status: 'pending' | 'verified' | 'rejected'; // pending: 검증 중, verified: 승인, rejected: 거부
  severity?: 'low' | 'medium' | 'high'; // AI 검증 후 책정
}

interface SafetyGuardState {
  // 제보 데이터
  riskReports: RiskReport[];

  // 로딩 상태
  isValidating: boolean;
  validatingReportId: string | null;

  // Actions
  actions: {
    addRiskReport: (report: Omit<RiskReport, 'id' | 'timestamp' | 'status'>) => string;
    setValidating: (isValidating: boolean, reportId?: string) => void;
    updateReportStatus: (reportId: string, status: RiskReport['status'], severity?: RiskReport['severity']) => void;
    getRiskReports: () => RiskReport[];
    getPendingReport: () => RiskReport | undefined;
  };
}

export const useSafetyGuardStore = create<SafetyGuardState>((set, get) => ({
  riskReports: [],
  isValidating: false,
  validatingReportId: null,

  actions: {
    /**
     * 새로운 위험 신고 추가
     */
    addRiskReport: (report) => {
      const id = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const newReport: RiskReport = {
        ...report,
        id,
        timestamp: Date.now(),
        status: 'pending',
      };

      set((state) => ({
        riskReports: [newReport, ...state.riskReports],
      }));

      return id;
    },

    /**
     * 검증 상태 설정
     */
    setValidating: (isValidating, reportId) => {
      set({
        isValidating,
        validatingReportId: reportId || null,
      });
    },

    /**
     * 제보 상태 업데이트 (AI 검증 완료)
     */
    updateReportStatus: (reportId, status, severity) => {
      set((state) => ({
        riskReports: state.riskReports.map((report) =>
          report.id === reportId
            ? { ...report, status, severity: severity || report.severity }
            : report
        ),
      }));
    },

    /**
     * 모든 제보 조회
     */
    getRiskReports: () => {
      return get().riskReports;
    },

    /**
     * 가장 최근의 pending 제보 조회 (로딩 화면용)
     */
    getPendingReport: () => {
      return get().riskReports.find((report) => report.status === 'pending');
    },
  },
}));
