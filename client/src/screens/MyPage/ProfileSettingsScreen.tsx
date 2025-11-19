import React, { useState, useEffect } from 'react';
import styled from 'styled-components/native';
import { ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../../styles/theme';
import { useOnboardingStore } from '../Onboarding/stores/useOnboardingStore';

const Container = styled.View`
  flex: 1;
  background-color: ${theme.colors.background};
`;

const Header = styled.View`
  padding: ${theme.spacing.lg}px;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
`;

const BackButton = styled(TouchableOpacity)`
  padding: ${theme.spacing.sm}px;
`;

const BackText = styled.Text`
  font-size: 16px;
  color: ${theme.colors.primary};
`;

const HeaderTitle = styled.Text`
  font-size: ${theme.fonts.sizes.xl}px;
  font-weight: ${theme.fonts.weights.bold};
  color: ${theme.colors.text};
`;

const Content = styled(ScrollView)`
  flex: 1;
  padding-horizontal: ${theme.spacing.lg}px;
`;

const Section = styled.View`
  margin-bottom: ${theme.spacing.lg}px;
`;

const Label = styled.Text`
  font-size: 14px;
  font-weight: 600;
  color: ${theme.colors.textSecondary};
  margin-bottom: ${theme.spacing.xs}px;
`;

const TextField = styled.TextInput`
  height: 52px;
  border-radius: 12px;
  border-width: 1px;
  border-color: #e0e0e0;
  padding-horizontal: ${theme.spacing.md}px;
  font-size: 16px;
  color: ${theme.colors.text};
  background-color: white;
`;

const EmojiGrid = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  gap: ${theme.spacing.sm}px;
  margin-top: ${theme.spacing.sm}px;
`;

const EmojiOption = styled(TouchableOpacity)<{ selected: boolean }>`
  width: 56px;
  height: 56px;
  border-radius: 28px;
  justify-content: center;
  align-items: center;
  border-width: 2px;
  border-color: ${(props) => (props.selected ? theme.colors.primary : 'transparent')};
  background-color: white;
`;

const EmojiText = styled.Text`
  font-size: 24px;
`;

const SaveButton = styled(TouchableOpacity)`
  margin-top: ${theme.spacing.lg}px;
  background-color: ${theme.colors.primary};
  padding-vertical: 14px;
  border-radius: 16px;
  align-items: center;
`;

const SaveButtonText = styled.Text`
  color: white;
  font-size: 16px;
  font-weight: 700;
`;

const EMOJIS = ['🙂', '😀', '😎', '🤗', '🧑‍💻', '🚶‍♂️', '🌿', '🚇', '🚲'];

export default function ProfileSettingsScreen() {
  const navigation = useNavigation();
  const profile = useOnboardingStore((state) => state.profile);
  const updateProfile = useOnboardingStore((state) => state.actions.updateProfile);

  const [displayName, setDisplayName] = useState(profile.displayName);
  const [avatarEmoji, setAvatarEmoji] = useState(profile.avatarEmoji);

  useEffect(() => {
    setDisplayName(profile.displayName);
    setAvatarEmoji(profile.avatarEmoji);
  }, [profile]);

  const handleSave = () => {
    updateProfile({
      displayName: displayName.trim() || '데일리모션',
      avatarEmoji,
    });
    navigation.goBack();
  };

  return (
    <Container>
      <Header>
        <BackButton onPress={() => navigation.goBack()}>
          <BackText>뒤로</BackText>
        </BackButton>
        <HeaderTitle>프로필 설정</HeaderTitle>
        <BackButton />
      </Header>

      <Content showsVerticalScrollIndicator={false}>
        <Section>
          <Label>표시 이름</Label>
          <TextField
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="나를 어떻게 부를까요?"
            returnKeyType="done"
          />
        </Section>

        <Section>
          <Label>프로필 이모지</Label>
          <EmojiGrid>
            {EMOJIS.map((emoji) => (
              <EmojiOption
                key={emoji}
                selected={avatarEmoji === emoji}
                onPress={() => setAvatarEmoji(emoji)}
              >
                <EmojiText>{emoji}</EmojiText>
              </EmojiOption>
            ))}
          </EmojiGrid>
        </Section>

        <SaveButton onPress={handleSave}>
          <SaveButtonText>저장하기</SaveButtonText>
        </SaveButton>
      </Content>
    </Container>
  );
}

