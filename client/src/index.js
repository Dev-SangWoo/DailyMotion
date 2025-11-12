/**
 * React Native 앱 진입점
 */
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from '../package.json';

AppRegistry.registerComponent(appName, () => App);

