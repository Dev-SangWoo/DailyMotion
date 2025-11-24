import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import MyPageScreen from './MyPageScreen';
import ProfileSettingsScreen from './ProfileSettingsScreen';
import PlaceSettingsScreen from './PlaceSettingsScreen';
import JourneySettingsScreen from './JourneySettingsScreen';
import ScheduleSettingsScreen from './ScheduleSettingsScreen';

export type MyPageStackParamList = {
  MyPageHome: undefined;
  ProfileSettings: undefined;
  PlaceSettings: undefined;
  JourneySettings: undefined;
  ScheduleSettings: undefined;
};

const Stack = createStackNavigator<MyPageStackParamList>();

export default function MyPageNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="MyPageHome"
      screenOptions={{
        headerShown: false,
        presentation: 'card',
      }}
    >
      <Stack.Screen name="MyPageHome" component={MyPageScreen} />
      <Stack.Screen name="ProfileSettings" component={ProfileSettingsScreen} />
      <Stack.Screen name="PlaceSettings" component={PlaceSettingsScreen} />
      <Stack.Screen name="JourneySettings" component={JourneySettingsScreen} />
      <Stack.Screen name="ScheduleSettings" component={ScheduleSettingsScreen} />
    </Stack.Navigator>
  );
}

