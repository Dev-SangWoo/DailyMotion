/**
 * 카카오 MAP API를 사용한 주소 검색 입력 컴포넌트
 *
 * 사용 예시:
 * ```tsx
 * <AddressSearchInput
 *   onSelectAddress={(address) => {
 *     console.log('선택된 주소:', address);
 *   }}
 * />
 * ```
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import styled from 'styled-components/native';
import { useDebounce } from '../../hooks/useDebounce';
import {
  searchAddress,
  searchPlace,
  type AddressSearchResult,
  type PlaceSearchResult,
} from '../../services/kakaoMapService';
import { theme } from '../../styles/theme';

interface AddressSearchInputProps {
  placeholder?: string;
  onSelectAddress: (address: {
    name: string;
    fullAddress: string;
    x: string;
    y: string;
  }) => void;
  searchType?: 'address' | 'place' | 'both'; // 검색 타입
  style?: any;
}

const Container = styled.View`
  position: relative;
  z-index: 1000;
`;

const SearchInput = styled.TextInput`
  height: 48px;
  padding-horizontal: ${theme.spacing.md}px;
  background-color: white;
  border-radius: 8px;
  border-width: 1px;
  border-color: #E0E0E0;
  font-size: 16px;
  color: ${theme.colors.text};
`;

const ResultsContainer = styled.View`
  position: absolute;
  top: 52px;
  left: 0;
  right: 0;
  background-color: white;
  border-radius: 8px;
  border-width: 1px;
  border-color: #E0E0E0;
  max-height: 300px;
  shadow-color: #000;
  shadow-opacity: 0.1;
  shadow-radius: 4px;
  elevation: 4;
  z-index: 1001;
`;

const ResultItem = styled.TouchableOpacity`
  padding: ${theme.spacing.md}px;
  border-bottom-width: 1px;
  border-bottom-color: #F0F0F0;
`;

const ResultName = styled.Text`
  font-size: 16px;
  font-weight: 600;
  color: ${theme.colors.text};
  margin-bottom: 4px;
`;

const ResultAddress = styled.Text`
  font-size: 14px;
  color: ${theme.colors.textSecondary};
`;

const LoadingContainer = styled.View`
  padding: ${theme.spacing.md}px;
  align-items: center;
`;

const EmptyContainer = styled.View`
  padding: ${theme.spacing.md}px;
  align-items: center;
`;

const EmptyText = styled.Text`
  font-size: 14px;
  color: ${theme.colors.textSecondary};
`;

export const AddressSearchInput: React.FC<AddressSearchInputProps> = ({
  placeholder = '주소 또는 장소를 검색하세요',
  onSelectAddress,
  searchType = 'both',
  style,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<
    (AddressSearchResult | PlaceSearchResult)[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // 디바운싱: 500ms 후에 검색 실행
  const debouncedQuery = useDebounce(query, 500);

  // 검색 실행
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      setShowResults(false);
      return;
    }

    const performSearch = async () => {
      setIsLoading(true);
      setShowResults(true);

      try {
        const searchPromises: Promise<any>[] = [];

        // 주소 검색
        if (searchType === 'address' || searchType === 'both') {
          searchPromises.push(
            searchAddress({ query: debouncedQuery, size: 5 })
          );
        }

        // 장소 검색
        if (searchType === 'place' || searchType === 'both') {
          searchPromises.push(
            searchPlace({ query: debouncedQuery, size: 5 })
          );
        }

        const [addressResults = [], placeResults = []] = await Promise.all(
          searchPromises
        );

        // 결과 합치기 (장소 검색 결과를 우선 표시)
        const combinedResults = [
          ...placeResults,
          ...addressResults,
        ].slice(0, 10);

        setResults(combinedResults);
      } catch (error) {
        console.error('[AddressSearchInput] 검색 실패:', error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    performSearch();
  }, [debouncedQuery, searchType]);

  // 주소 선택 핸들러
  const handleSelectResult = useCallback(
    (result: AddressSearchResult | PlaceSearchResult) => {
      let addressData: {
        name: string;
        fullAddress: string;
        x: string;
        y: string;
      };

      if ('place_name' in result) {
        // 장소 검색 결과
        addressData = {
          name: result.place_name,
          fullAddress: result.road_address_name || result.address_name,
          x: result.x,
          y: result.y,
        };
      } else {
        // 주소 검색 결과
        addressData = {
          name: result.address_name,
          fullAddress:
            result.road_address?.address_name || result.address.address_name,
          x: result.x,
          y: result.y,
        };
      }

      onSelectAddress(addressData);
      setQuery(addressData.name);
      setShowResults(false);
    },
    [onSelectAddress]
  );

  // 결과 렌더링
  const renderResultItem = ({
    item,
  }: {
    item: AddressSearchResult | PlaceSearchResult;
  }) => {
    const isPlace = 'place_name' in item;
    const name = isPlace ? item.place_name : item.address_name;
    const address = isPlace
      ? item.road_address_name || item.address_name
      : (item as AddressSearchResult).road_address?.address_name ||
        (item as AddressSearchResult).address.address_name;

    return (
      <ResultItem onPress={() => handleSelectResult(item)}>
        <ResultName>{name}</ResultName>
        <ResultAddress>{address}</ResultAddress>
      </ResultItem>
    );
  };

  return (
    <Container style={style}>
      <SearchInput
        placeholder={placeholder}
        value={query}
        onChangeText={setQuery}
        onFocus={() => {
          if (results.length > 0) {
            setShowResults(true);
          }
        }}
        onBlur={() => {
          // 약간의 지연을 두어 onPress가 실행되도록
          setTimeout(() => setShowResults(false), 200);
        }}
      />

      {showResults && (
        <ResultsContainer>
          {isLoading ? (
            <LoadingContainer>
              <ActivityIndicator size="small" color={theme.colors.primary} />
            </LoadingContainer>
          ) : results.length > 0 ? (
            <FlatList
              data={results}
              renderItem={renderResultItem}
              keyExtractor={(item, index) =>
                'id' in item ? item.id : `address-${index}`
              }
              keyboardShouldPersistTaps="handled"
            />
          ) : (
            <EmptyContainer>
              <EmptyText>검색 결과가 없습니다</EmptyText>
            </EmptyContainer>
          )}
        </ResultsContainer>
      )}
    </Container>
  );
};

