import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { Keyring } from '@polkadot/keyring';
import { mnemonicValidate } from '@polkadot/util-crypto';
import { ApiPromise, WsProvider } from '@polkadot/api';

const EnterMnemonicScreen = ({ navigation }) => {
  const [mnemonic, setMnemonic] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const checkAddressFromMnemonic = async (mnemonic) => {
    try {
      const isValid = mnemonicValidate(mnemonic);
      if (!isValid) {
        console.log("invalid");
        throw new Error("Invalid mnemonic phrase");
      }
      await cryptoWaitReady();
      const keyring = new Keyring({ type: 'sr25519', ss58Format: 38 });
      const pair = keyring.addFromMnemonic(mnemonic);
      const address = pair.address;
      const provider = new WsProvider('wss://peregrine.kilt.io/');
      const api = await ApiPromise.create({ provider });
      const accountInfo = await api.query.system.account(address);
      if (accountInfo.data.free.toBigInt() === 0n && accountInfo.nonce.toNumber() === 0) {
        console.log("Address exists but has no activity");
      } else {
        console.log("Address exists with activity");
      }
      await api.disconnect();
      return address;
    } catch (error) {
        throw new Error("Invalid mnemonic or address not found");
    }
  };

  const handleSubmit = async () => {
    if (!mnemonic.trim()) {
      Alert.alert("Error", "Mnemonic cannot be empty");
      return;
    }
    setIsProcessing(true);
    try {
      const address = await checkAddressFromMnemonic(mnemonic);
      navigation.navigate('Address', { address });
    } catch (error) {
      Alert.alert("Error", error.message || "Failed to process mnemonic");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Write Mnemonic</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter your mnemonic here..."
        placeholderTextColor="#888"
        value={mnemonic}
        onChangeText={setMnemonic}
        multiline
        editable={!isProcessing}
      />
      <TouchableOpacity 
        style={[styles.button, isProcessing && styles.buttonDisabled]} 
        onPress={handleSubmit}
        disabled={isProcessing}
      >
        {isProcessing ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Submit</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 40,
  },
  input: {
    flex: 1,
    marginTop: 20,
    padding: 16,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: '#5c6bc0',
    padding: 16,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonDisabled: {
    backgroundColor: '#9fa8da',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default EnterMnemonicScreen;