import React from 'react';
import Svg, { Path, Circle, Rect, G } from 'react-native-svg';

interface BusIconProps {
  width?: number;
  height?: number;
  color?: string;
  flipped?: boolean; // 좌우반전
}

export const BusIcon: React.FC<BusIconProps> = ({
  width = 120,
  height = 120,
  color = '#FFFFFF',
  flipped = false,
}) => {
  const scaleX = flipped ? -1 : 1;
  const translateX = flipped ? width : 0;

  return (
    <Svg width={width} height={height} viewBox="0 0 100 100">
      <G transform={`translate(${translateX}, 0) scale(${scaleX}, 1)`}>
        {/* Bus body */}
        <Rect x="15" y="25" width="70" height="45" rx="8" fill={color} />

        {/* Bus windows */}
        <Rect x="20" y="30" width="12" height="12" rx="2" fill="#0066FF" opacity="0.3" />
        <Rect x="35" y="30" width="12" height="12" rx="2" fill="#0066FF" opacity="0.3" />
        <Rect x="50" y="30" width="12" height="12" rx="2" fill="#0066FF" opacity="0.3" />
        <Rect x="65" y="30" width="12" height="12" rx="2" fill="#0066FF" opacity="0.3" />

        {/* Bus door */}
        <Rect x="45" y="45" width="12" height="20" rx="2" fill="#0066FF" opacity="0.2" />

        {/* Bus wheels */}
        <Circle cx="25" cy="72" r="6" fill={color} />
        <Circle cx="75" cy="72" r="6" fill={color} />

        {/* Wheel details */}
        <Circle cx="25" cy="72" r="3" fill="#0066FF" />
        <Circle cx="75" cy="72" r="3" fill="#0066FF" />
      </G>
    </Svg>
  );
};

export default BusIcon;
