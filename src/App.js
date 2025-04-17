// import React from 'react';
// import { SafeAreaProvider } from 'react-native-safe-area-context';
// import W3NScreen from './screens/W3NScreen';

// const App = () => {
//   return (
//     <SafeAreaProvider>
//       <W3NScreen />
//     </SafeAreaProvider>
//   );
// };

// export default App;

// App.js
import React from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import W3NWebViewScreen from './screens/W3NWebViewScreen';

const App = () => {
  return (
    <SafeAreaView style={styles.container}>
      <W3NWebViewScreen />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;