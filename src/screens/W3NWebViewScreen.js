// src/screens/W3NWebViewScreen.js
import React, { useState, useRef } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import WebView from 'react-native-webview';

const W3NWebViewScreen = () => {
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const webViewRef = useRef(null);

  // Handle messages from WebView
  const onMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      switch (data.type) {
        case 'ready':
          console.log('WebView is ready');
          setLoading(false);
          break;
          
        case 'log':
          console.log('WebView log:', data.message);
          break;
          
        case 'connection':
          setConnected(data.connected);
          break;
          
        case 'success':
          Alert.alert(
            'Success',
            `Successfully claimed W3N: ${data.w3n}\nAssociated with DID: ${data.did}`,
            [{ text: 'OK' }]
          );
          break;
          
        case 'error':
          Alert.alert('Error', data.message, [{ text: 'OK' }]);
          break;
      }
    } catch (error) {
      console.error('Error parsing WebView message:', error);
    }
  };

  // Determine WebView source based on platform
  const getWebViewSource = () => {
    if (Platform.OS === 'android') {
      return { uri: 'file:///android_asset/web/kilt-sdk.html' };
    } else {
      // For iOS
      return { uri: 'Web/kilt-sdk.html' };
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>KILT Web3 Name Claim</Text>
        <Text style={styles.subtitle}>
          {connected ? '✅ Connected' : '❌ Not Connected'}
        </Text>
      </View>

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5c6bc0" />
          <Text style={styles.loadingText}>Loading KILT SDK...</Text>
        </View>
      )}

      <WebView
        ref={webViewRef}
        source={getWebViewSource()}
        style={styles.webview}
        originWhitelist={['*']}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        onMessage={onMessage}
        onError={(error) => console.error('WebView error:', error)}
        onHttpError={(error) => console.error('WebView HTTP error:', error)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 16,
    backgroundColor: '#3e4d6c',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
  },
  subtitle: {
    fontSize: 16,
    color: 'white',
    marginTop: 4,
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    zIndex: 1000,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#5c6bc0',
  },
});

export default W3NWebViewScreen;