/**
 * 장소 상세 정보 입력 모달
 *
 * - 카카오 맵 API를 통한 주소 검색
 * - 주소 선택 및 확인
 *
 * 헌법 준수:
 * - AGENTS.md [제2장]: Styled-components 사용
 * - CLAUDE.md: React Query 또는 직접 API 호출
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Modal, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, View } from 'react-native';
import styled from 'styled-components/native';
import { theme } from '../../../styles/theme';
import { OnboardingButton } from './OnboardingButton';
import { searchAddress, searchPlace, AddressSearchResult, PlaceSearchResult } from '../../../services/kakaoMapService';
import { getCurrentLocationWithAddress } from '../../../services/locationService';

/**
 * 통합 검색 결과 타입 (주소 또는 지명)
 */
type SearchResult = (AddressSearchResult & { type: 'address' }) | (PlaceSearchResult & { type: 'place' });

interface PlaceDetailModalProps {
  visible: boolean;
  placeName: string;
  placeIcon: string;
  onConfirm: (address: string, fullAddress?: string, x?: string, y?: string) => void;
  onCancel: () => void;
}

const ModalOverlay = styled.View`
  flex: 1;
  background-color: rgba(0, 0, 0, 0.5);
  justify-content: flex-end;
`;

const ModalContent = styled.View`
  background-color: white;
  border-radius: 20px 20px 0px 0px;
  padding: ${theme.spacing.lg}px;
  max-height: 80%;
`;

const ModalHeader = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${theme.spacing.lg}px;
`;

const ModalTitle = styled.Text`
  font-size: 20px;
  font-weight: 700;
  color: ${theme.colors.text};
`;

const CloseButton = styled.TouchableOpacity`
  padding: ${theme.spacing.xs}px;
`;

const CloseButtonText = styled.Text`
  font-size: 24px;
  color: ${theme.colors.text};
  font-weight: 300;
`;

const PlaceInfo = styled.View`
  flex-direction: row;
  align-items: center;
  gap: ${theme.spacing.sm}px;
  margin-bottom: ${theme.spacing.lg}px;
  padding: ${theme.spacing.md}px;
  background-color: #F5F5F5;
  border-radius: 8px;
`;

const PlaceIconText = styled.Text`
  font-size: 24px;
`;

const PlaceNameText = styled.Text`
  font-size: 16px;
  font-weight: 600;
  color: ${theme.colors.text};
`;

const AddressLabel = styled.Text`
  font-size: 14px;
  font-weight: 600;
  color: ${theme.colors.text};
  margin-bottom: ${theme.spacing.sm}px;
`;

const AddressInput = styled.TextInput`
  height: 56px;
  padding-horizontal: ${theme.spacing.md}px;
  background-color: #FFFFFF;
  border-radius: 8px;
  border-width: 1px;
  border-color: #E0E0E0;
  font-size: 16px;
  color: ${theme.colors.text};
  margin-bottom: ${theme.spacing.lg}px;
`;

const MapContainer = styled.View`
  height: 200px;
  background-color: #F0F0F0;
  border-radius: 8px;
  margin-bottom: ${theme.spacing.lg}px;
  justify-content: center;
  align-items: center;
  border-width: 1px;
  border-color: #E0E0E0;
`;

const MapPlaceholder = styled.Text`
  font-size: 14px;
  color: #999999;
`;

const ButtonContainer = styled.View`
  flex-direction: row;
  gap: ${theme.spacing.md}px;
`;

const CurrentLocationButtonContainer = styled.View`
  margin-bottom: ${theme.spacing.lg}px;
  flex-direction: row;
  gap: ${theme.spacing.sm}px;
`;

const CurrentLocationButton = styled.TouchableOpacity<{ isLoading?: boolean }>`
  flex: 1;
  flex-direction: row;
  padding: ${theme.spacing.md}px;
  background-color: ${theme.colors.primary};
  border-radius: 8px;
  justify-content: center;
  align-items: center;
  opacity: ${(props) => (props.isLoading ? 0.7 : 1)};
`;

const CurrentLocationButtonText = styled.Text`
  color: white;
  font-size: 14px;
  font-weight: 600;
  margin-left: ${theme.spacing.xs}px;
`;

const CurrentLocationIcon = styled.Text`
  font-size: 16px;
`;

const LocationLoadingSpinner = styled.ActivityIndicator`
  margin-right: ${theme.spacing.xs}px;
`;

/**
 * 검색 결과 리스트 관련 styled components
 */
const SearchResultsContainer = styled.View`
  max-height: 300px;
  background-color: #F9F9F9;
  border-radius: 8px;
  border-width: 1px;
  border-color: #E0E0E0;
  margin-bottom: ${theme.spacing.lg}px;
  overflow: hidden;
`;

const SearchResultItem = styled(TouchableOpacity)<{ isSelected: boolean }>`
  padding: ${theme.spacing.md}px;
  border-bottom-width: 1px;
  border-bottom-color: #E0E0E0;
  background-color: ${(props) => props.isSelected ? '#E3F2FD' : 'white'};
`;

const SearchResultName = styled.Text<{ isSelected: boolean }>`
  font-size: 14px;
  font-weight: 600;
  color: ${(props) => props.isSelected ? theme.colors.primary : theme.colors.text};
  margin-bottom: 4px;
`;

const SearchResultAddress = styled.Text`
  font-size: 12px;
  color: ${theme.colors.textSecondary};
`;

const LoadingContainer = styled.View`
  padding: ${theme.spacing.md}px;
  justify-content: center;
  align-items: center;
  height: 100px;
`;

const ErrorMessage = styled.Text`
  font-size: 13px;
  color: #d32f2f;
  text-align: center;
  padding: ${theme.spacing.md}px;
`;

const SelectedAddressBox = styled.View`
  background-color: #E8F5E9;
  border-radius: 8px;
  padding: ${theme.spacing.md}px;
  margin-bottom: ${theme.spacing.lg}px;
  border-width: 1px;
  border-color: #4CAF50;
`;

const SelectedAddressLabel = styled.Text`
  font-size: 12px;
  font-weight: 600;
  color: #2E7D32;
  margin-bottom: 4px;
`;

const SelectedAddressText = styled.Text`
  font-size: 14px;
  color: #1B5E20;
  font-weight: 500;
`;

export const PlaceDetailModal: React.FC<PlaceDetailModalProps> = ({
  visible,
  placeName,
  placeIcon,
  onConfirm,
  onCancel,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLocationLoading, setIsLocationLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 주소 + 지명 통합 검색 핸들러
   * - 주소 API와 지명 API를 동시에 호출
   * - 결과를 합쳐서 표시
   */
  const handleSearchAddress = useCallback(
    async (query: string) => {
      setSearchQuery(query);
      setSelectedResult(null);
      setError(null);

      if (!query.trim()) {
        setSearchResults([]);
        return;
      }

      try {
        setIsLoading(true);
        const trimmedQuery = query.trim();

        // 주소 검색과 지명 검색을 동시에 수행
        const [addressResults, placeResults] = await Promise.all([
          searchAddress({
            query: trimmedQuery,
            size: 5,
          }).catch(() => []), // 오류 무시
          searchPlace({
            query: trimmedQuery,
            size: 5,
          }).catch(() => []), // 오류 무시
        ]);

        // 결과 합치기
        const combinedResults: SearchResult[] = [
          ...addressResults.map((addr) => ({ ...addr, type: 'address' as const })),
          ...placeResults.map((place) => ({ ...place, type: 'place' as const })),
        ];

        if (combinedResults.length === 0) {
          setError('검색 결과가 없습니다.');
        } else {
          setSearchResults(combinedResults);
        }
      } catch (err: any) {
        setError(err.message || '검색 중 오류가 발생했습니다.');
        setSearchResults([]);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * 검색 결과 선택 핸들러
   */
  const handleSelectResult = useCallback((result: SearchResult) => {
    setSelectedResult(result);
    setSearchQuery('');
    setSearchResults([]);
    setError(null);
  }, []);

  /**
   * 확인 버튼 클릭
   */
  const handleConfirm = useCallback(() => {
    if (selectedResult) {
      let fullAddress: string;
      let x: string;
      let y: string;

      // 타입에 따라 주소와 좌표 추출
      if (selectedResult.type === 'address') {
        const addr = selectedResult as AddressSearchResult & { type: 'address' };
        fullAddress = addr.road_address?.address_name || addr.address_name;
        x = addr.x;
        y = addr.y;
      } else {
        // 지명 결과
        const place = selectedResult as PlaceSearchResult & { type: 'place' };
        fullAddress = place.road_address_name || place.address_name;
        x = place.x;
        y = place.y;
      }

      onConfirm(placeName, fullAddress, x, y);
      // 초기화
      setSearchQuery('');
      setSearchResults([]);
      setSelectedResult(null);
      setError(null);
    }
  }, [selectedResult, placeName, onConfirm]);

  /**
   * 취소 버튼 클릭
   */
  const handleCancel = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    setSelectedResult(null);
    setError(null);
    onCancel();
  }, [onCancel]);

  /**
   * 현재 위치 사용 버튼 클릭
   */
  const handleUseCurrentLocation = useCallback(async () => {
    try {
      setIsLocationLoading(true);
      setError(null);

      console.log('[PlaceDetailModal] 현재 위치 조회 시작...');
      const locationData = await getCurrentLocationWithAddress();

      console.log('[PlaceDetailModal] 위치 조회 성공:', locationData);

      // 위치 정보를 검색 결과로 변환
      const locationResult: SearchResult = {
        type: 'address' as const,
        address_name: locationData.address,
        x: locationData.longitude.toString(),
        y: locationData.latitude.toString(),
      };

      setSelectedResult(locationResult);
      setSearchQuery('');
      setSearchResults([]);
    } catch (err: any) {
      console.error('[PlaceDetailModal] 위치 조회 실패:', err);
      setError(err.message || '현재 위치를 가져올 수 없습니다.');
    } finally {
      setIsLocationLoading(false);
    }
  }, []);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <ModalOverlay>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, justifyContent: 'flex-end' }}
        >
          <ModalContent>
            <ModalHeader>
              <ModalTitle>상세 주소 입력</ModalTitle>
              <CloseButton onPress={handleCancel}>
                <CloseButtonText>×</CloseButtonText>
              </CloseButton>
            </ModalHeader>

            <PlaceInfo>
              <PlaceIconText>{placeIcon}</PlaceIconText>
              <PlaceNameText>{placeName}</PlaceNameText>
            </PlaceInfo>

            {/* 선택된 주소 표시 */}
            {selectedResult && (
              <SelectedAddressBox>
                <SelectedAddressLabel>✓ 선택된 주소</SelectedAddressLabel>
                <SelectedAddressText>
                  {selectedResult.road_address?.address_name || selectedResult.address_name}
                </SelectedAddressText>
              </SelectedAddressBox>
            )}

            {/* 현재 위치 사용 버튼 */}
            <CurrentLocationButtonContainer>
              <CurrentLocationButton
                onPress={handleUseCurrentLocation}
                disabled={isLocationLoading}
                isLoading={isLocationLoading}
              >
                {isLocationLoading ? (
                  <>
                    <ActivityIndicator size="small" color="white" />
                    <CurrentLocationButtonText>위치 조회 중...</CurrentLocationButtonText>
                  </>
                ) : (
                  <>
                    <CurrentLocationIcon>📍</CurrentLocationIcon>
                    <CurrentLocationButtonText>내 위치 사용</CurrentLocationButtonText>
                  </>
                )}
              </CurrentLocationButton>
            </CurrentLocationButtonContainer>

            {/* 주소/지명 검색 입력 */}
            <AddressLabel>주소 또는 지명 검색</AddressLabel>
            <AddressInput
              placeholder="주소나 지명을 검색하세요 (예: 강남역, 서울시청, 강남구)"
              value={searchQuery}
              onChangeText={handleSearchAddress}
              multiline={false}
              editable={!selectedResult}
            />

            {/* 에러 메시지 */}
            {error && <ErrorMessage>{error}</ErrorMessage>}

            {/* 로딩 상태 */}
            {isLoading && (
              <LoadingContainer>
                <ActivityIndicator size="large" color={theme.colors.primary} />
              </LoadingContainer>
            )}

            {/* 검색 결과 리스트 */}
            {searchResults.length > 0 && (
              <SearchResultsContainer>
                <ScrollView scrollEnabled>
                  {searchResults.map((result, index) => {
                    // 각 결과의 고유 키 생성
                    const resultKey = `${result.type}-${index}`;

                    // 검색 결과가 주소인지 지명인지 확인
                    const isAddress = result.type === 'address';
                    const isSelected =
                      selectedResult?.type === result.type &&
                      selectedResult?.x === result.x &&
                      selectedResult?.y === result.y;

                    let displayName: string;
                    let displayAddress: string | undefined;
                    let resultType: string;

                    if (isAddress) {
                      const addr = result as AddressSearchResult & { type: 'address' };
                      displayName = addr.road_address?.address_name || addr.address_name;
                      displayAddress = addr.road_address ? addr.address_name : undefined;
                      resultType = '🏠 주소';
                    } else {
                      const place = result as PlaceSearchResult & { type: 'place' };
                      displayName = place.place_name;
                      displayAddress = place.road_address_name || place.address_name;
                      resultType = '📍 지명';
                    }

                    return (
                      <SearchResultItem
                        key={resultKey}
                        isSelected={isSelected}
                        onPress={() => handleSelectResult(result)}
                      >
                        <SearchResultName isSelected={isSelected}>
                          {displayName}
                          <SearchResultAddress style={{ fontSize: 11, marginLeft: 4 }}>
                            {resultType}
                          </SearchResultAddress>
                        </SearchResultName>
                        {displayAddress && (
                          <SearchResultAddress>
                            {displayAddress}
                          </SearchResultAddress>
                        )}
                      </SearchResultItem>
                    );
                  })}
                </ScrollView>
              </SearchResultsContainer>
            )}

            {/* 검색 결과 없음 안내 */}
            {searchQuery && searchResults.length === 0 && !isLoading && !error && (
              <ErrorMessage>검색 결과가 없습니다.</ErrorMessage>
            )}

            <ButtonContainer>
              <OnboardingButton
                label="취소"
                onPress={handleCancel}
                variant="secondary"
                style={{ flex: 1 }}
              />
              <OnboardingButton
                label="확인"
                onPress={handleConfirm}
                variant="primary"
                disabled={!selectedResult}
                style={{ flex: 1 }}
              />
            </ButtonContainer>
          </ModalContent>
        </KeyboardAvoidingView>
      </ModalOverlay>
    </Modal>
  );
};

export default PlaceDetailModal;

