import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import W3NScreen from './screens/W3NScreen';
import 'react-native-url-polyfill/auto';
const App = () => {
  return (
    <SafeAreaProvider>
      <W3NScreen />
    </SafeAreaProvider>
  );
};

export default App;
