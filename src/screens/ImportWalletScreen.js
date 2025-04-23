import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

const ImportWalletScreen = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('EnterMnemonic')}
      >
        <Text style={styles.buttonText}>Import Mnemonic</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  button: {
    backgroundColor: '#5c6bc0',
    padding: 16,
    borderRadius: 6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ImportWalletScreen;
