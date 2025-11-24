/**
 * 출퇴근 설정 화면 테스트
 * TDD 원칙에 따라 작성된 테스트입니다.
 * 
 * 헌법 준수:
 * - AGENTS.md 프론트엔드 헌법 [제6장] 개발 방법론 (TDD/Jest+RTL)
 * - v3.0 명세서 [3. 필수 사용자 설정] 검증
 * - OpenAPI 스펙 PUT /v1/users/me/settings/commute 연동
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

// React Navigation Mock (모듈이 없어도 Mock 가능)
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
}), { virtual: true });

// React Query Mock - mutation 호출을 추적하기 위해 개선
const mockMutate = jest.fn();
jest.mock('@tanstack/react-query', () => ({
  useMutation: jest.fn(() => ({
    mutate: mockMutate,
    isLoading: false,
    isError: false,
  })),
}), { virtual: true });

// CommuteSettingsScreen import
import CommuteSettingsScreen from './CommuteSettingsScreen';

describe('CommuteSettingsScreen', () => {
  /**
   * [v3.0 명세서 3. 필수 사용자 설정] 사용자 경험 테스트
   * 
   * 사용자는 다음 정보를 입력할 수 있어야 합니다:
   * - 집 주소 (출근지)
   * - 회사 주소 (목적지)
   * - 목표 도착 시각 (출근 모드 전용)
   * - First Mile 기본 소요 시간 (선택)
   * - Last Mile 기본 소요 시간 (선택)
   */
  it('사용자는 필수 설정 입력 필드들을 화면에서 볼 수 있어야 한다', () => {
    // Given: 화면 렌더링
    render(<CommuteSettingsScreen />);
    
    // Then: 집 주소 입력 필드가 보여야 함
    expect(screen.getByText(/집 주소|출근지/i)).toBeTruthy();
    expect(screen.getByPlaceholderText(/집 주소|출근지를 입력하세요/i)).toBeTruthy();
    
    // Then: 회사 주소 입력 필드가 보여야 함
    expect(screen.getByText(/회사 주소|목적지/i)).toBeTruthy();
    expect(screen.getByPlaceholderText(/회사 주소|목적지를 입력하세요/i)).toBeTruthy();
    
    // Then: 목표 도착 시각 입력 필드가 보여야 함
    expect(screen.getByText(/목표 도착 시각|도착 시간/i)).toBeTruthy();
    expect(screen.getByPlaceholderText(/목표 도착 시각|HH:MM/i)).toBeTruthy();
  });
  
  it('사용자는 저장 버튼을 찾을 수 있어야 한다', () => {
    // Given: 화면 렌더링
    render(<CommuteSettingsScreen />);
    
    // Then: 저장 버튼이 보여야 함
    const saveButton = screen.getByRole('button', { name: /저장|설정 저장/i });
    expect(saveButton).toBeTruthy();
  });
  
  it('사용자는 입력 필드에 값을 입력할 수 있어야 한다', () => {
    // Given: 화면 렌더링
    render(<CommuteSettingsScreen />);
    
    // When: 집 주소 입력 필드 찾기
    const homeAddressInput = screen.getByPlaceholderText(/집 주소|출근지를 입력하세요/i);
    
    // Then: 입력 필드가 존재하고 편집 가능해야 함
    expect(homeAddressInput).toBeTruthy();
    // TODO: 실제 입력 테스트는 fireEvent를 사용하여 구현
  });
  
  it('사용자가 모든 필수 정보를 입력하고 저장 버튼을 누르면 API가 호출되어야 한다', () => {
    // Given: mock 초기화
    mockMutate.mockClear();
    
    // Given: 화면 렌더링
    const { getByPlaceholderText, getByRole } = render(<CommuteSettingsScreen />);
    
    // When: 필수 정보 입력
    const homeAddressInput = getByPlaceholderText(/집 주소|출근지를 입력하세요/i);
    const workAddressInput = getByPlaceholderText(/회사 주소|목적지를 입력하세요/i);
    const targetTimeInput = getByPlaceholderText(/목표 도착 시각|HH:MM/i);
    
    fireEvent.changeText(homeAddressInput, '서울 강남구 역삼동 123-45');
    fireEvent.changeText(workAddressInput, '서울 중구 을지로 678-90');
    fireEvent.changeText(targetTimeInput, '08:50');
    
    // When: 저장 버튼 클릭
    const saveButton = getByRole('button', { name: /저장|설정 저장/i });
    fireEvent.press(saveButton);
    
    // Then: React Query mutation이 호출되어야 함
    expect(mockMutate).toHaveBeenCalledTimes(1);
    
    // Then: OpenAPI 스펙에 맞는 데이터 형식으로 호출되어야 함
    const mutationCall = mockMutate.mock.calls[0][0];
    expect(mutationCall).toMatchObject({
      homeAddress: '서울 강남구 역삼동 123-45',
      workAddress: '서울 중구 을지로 678-90',
      targetArrivalTime: '08:50:00', // OpenAPI 스펙: time format (HH:MM:SS)
    });
  });
});

