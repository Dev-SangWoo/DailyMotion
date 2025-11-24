/**
 * 슬라이더 입력 컴포넌트
 *
 * 스크린 6 (GoalTime)에서 사용
 * - First Mile 시간 선택 (1-15분)
 * - 최소: 1분, 최대: 15분
 *
 * 주의: React Native에는 기본 Slider가 없음
 * @react-native-community/slider 또는 react-native-gesture-handler 필요
 */

import React, { useState } from 'react';
import { View } from 'react-native';
import styled from 'styled-components/native';
import { theme } from '../../../styles/theme';

interface SliderInputProps {
  value: number; // 1-15
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  testID?: string;
}

/**
 * SliderContainer - 슬라이더 컨테이너
 */
const SliderContainer = styled.View`
  gap: ${theme.spacing.md}px;
`;

/**
 * LabelContainer - 레이블 및 값 표시
 */
const LabelContainer = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
`;

/**
 * LabelText - 레이블 텍스트
 */
const LabelText = styled.Text`
  font-size: ${theme.fonts.sizes.md}px;
  font-weight: 600;
  color: ${theme.colors.text};
`;

/**
 * ValueBadge - 현재 값 표시 배지
 */
const ValueBadge = styled.View`
  background-color: ${theme.colors.primary};
  padding-horizontal: ${theme.spacing.md}px;
  padding-vertical: ${theme.spacing.sm}px;
  border-radius: ${theme.borderRadius.md}px;
`;

/**
 * ValueText - 값 텍스트
 */
const ValueText = styled.Text`
  font-size: ${theme.fonts.sizes.sm}px;
  font-weight: 600;
  color: white;
`;

/**
 * SliderTrackContainer - 슬라이더 트랙 컨테이너
 */
const SliderTrackContainer = styled.View`
  height: 40px;
  justify-content: center;
`;

/**
 * SliderTrack - 슬라이더 백그라운드 트랙
 */
const SliderTrack = styled.View`
  height: 4px;
  background-color: #e0e0e0;
  border-radius: 2px;
`;

/**
 * SliderProgress - 진행 표시기
 */
const SliderProgress = styled.View<{ progress: number }>`
  height: 4px;
  background-color: ${theme.colors.primary};
  border-radius: 2px;
  width: ${(props) => `${props.progress}%`};
  position: absolute;
`;

/**
 * SliderThumb - 슬라이더 썸
 */
const SliderThumb = styled.View<{ position: number }>`
  width: 28px;
  height: 28px;
  border-radius: 14px;
  background-color: ${theme.colors.primary};
  position: absolute;
  left: ${(props) => `${props.position}%`};
  margin-left: -14px;
  shadow-color: ${theme.colors.primary};
  shadow-offset: 0px 4px;
  shadow-opacity: 0.3;
  shadow-radius: 8px;
  elevation: 4;
`;

/**
 * MinMaxLabels - 최소/최대 레이블
 */
const MinMaxLabels = styled.View`
  flex-direction: row;
  justify-content: space-between;
  padding-horizontal: ${theme.spacing.sm}px;
  margin-top: ${theme.spacing.sm}px;
`;

/**
 * MinMaxLabel - 최소/최대 텍스트
 */
const MinMaxLabel = styled.Text`
  font-size: ${theme.fonts.sizes.xs}px;
  color: ${theme.colors.textSecondary};
`;

/**
 * SliderInput - 슬라이더 컴포넌트
 *
 * 주의: 완전한 드래그 기능을 위해 react-native-gesture-handler 필요
 * 현재는 탭 기반 선택 인터페이스로 구현
 *
 * 사용 예:
 * ```tsx
 * const [minutes, setMinutes] = useState(5);
 *
 * <SliderInput
 *   value={minutes}
 *   onChange={setMinutes}
 *   min={1}
 *   max={15}
 * />
 * ```
 */
export const SliderInput: React.FC<SliderInputProps> = ({
  value,
  onChange,
  min = 1,
  max = 15,
  step = 1,
  testID,
}) => {
  const clampedValue = Math.max(min, Math.min(max, value));
  const progress = ((clampedValue - min) / (max - min)) * 100;

  /**
   * 트랙에서 탭한 위치로 값 계산
   * (react-native-gesture-handler 없이 탭 기반)
   */
  const handleTrackPress = (event: any) => {
    const { nativeEvent } = event;
    const { locationX } = nativeEvent;
    const trackWidth = 300; // 대략적인 너비 (실제로는 측정 필요)

    const percentage = locationX / trackWidth;
    const newValue = Math.round(min + percentage * (max - min));
    const steppedValue = Math.round(newValue / step) * step;

    onChange(Math.max(min, Math.min(max, steppedValue)));
  };

  /**
   * 증감 버튼 (간단한 선택을 위해)
   */
  const increment = () => {
    const newValue = clampedValue + step;
    if (newValue <= max) {
      onChange(newValue);
    }
  };

  const decrement = () => {
    const newValue = clampedValue - step;
    if (newValue >= min) {
      onChange(newValue);
    }
  };

  return (
    <SliderContainer testID={testID}>
      {/* 레이블 및 값 */}
      <LabelContainer>
        <LabelText>도보 시간</LabelText>
        <ValueBadge>
          <ValueText>{clampedValue}분</ValueText>
        </ValueBadge>
      </LabelContainer>

      {/* 슬라이더 트랙 */}
      <SliderTrackContainer onTouchEnd={handleTrackPress}>
        <SliderTrack>
          <SliderProgress progress={progress} />
        </SliderTrack>
        <SliderThumb position={progress} />
      </SliderTrackContainer>

      {/* 최소/최대 레이블 */}
      <MinMaxLabels>
        <MinMaxLabel>{min}분</MinMaxLabel>
        <MinMaxLabel>{max}분</MinMaxLabel>
      </MinMaxLabels>
    </SliderContainer>
  );
};

export default SliderInput;
