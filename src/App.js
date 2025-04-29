import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import W3NScreen from './screens/W3NScreen';
import ImportWalletScreen from './screens/ImportWalletScreen';
import EnterMnemonicScreen from './screens/EnterMnemonicScreen';
import AddressScreen from './screens/AddressScreen';
import CheckCreateW3N from './screens/Check&CreateW3N';

const Stack = createNativeStackNavigator();

const App = () => {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="W3NScreen">
          <Stack.Screen name="W3NScreen" component={W3NScreen} />
          <Stack.Screen name="ImportWallet" component={ImportWalletScreen} />
          <Stack.Screen name="EnterMnemonic" component={EnterMnemonicScreen} />
          <Stack.Screen name="Address" component={CheckCreateW3N} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
};

export default App;