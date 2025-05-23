import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Clipboard,
} from 'react-native';
import * as Kilt from "@kiltprotocol/sdk-js";
import 'react-native-url-polyfill/auto'; 
import { verifyDid } from "../backend/addVerification2Did";
import { generateAccounts } from "../backend/generateAccount";
import { generateDid } from "../backend/generateDid";
import { issueCredential } from "../backend/issueCredential";
import { claimW3N } from "../backend/claimW3N";
import ImportWalletScreen from './ImportWalletScreen';

const W3NScreen = ({ navigation }) => {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [connected, setConnected] = useState(false);
  const [api, setApi] = useState(null);
  const [holderMnemonic, setHolderMnemonic] = useState('');
  const [issuerMnemonic, setIssuerMnemonic] = useState('');
  const [accountsGenerated, setAccountsGenerated] = useState(false);

  const log = (message) => {
    console.log(message);
    setLogs((prevLogs) => [...prevLogs, { time: new Date().toISOString(), message: String(message) }]);
  };

  useEffect(() => {
    connectToKilt();
    return () => {
      if (api) {
        api.disconnect().then(() => {
          log('Disconnected from KILT');
        });
      }
    };
  }, []);

  const connectToKilt = async () => {
    try {
      setLoading(true);
      const apiInstance = await Kilt.connect("wss://peregrine.kilt.io/");
      setApi(apiInstance);
      
      if (Kilt.version) {
        log(`KILT SDK Version: ${Kilt.version}`);
      }
      
      log(`Available KILT modules: ${Object.keys(Kilt).join(', ')}`);
      
      setConnected(true);
      log("Connected to KILT network");
      setLoading(false);
    } catch (error) {
      log(`Connection error: ${error.message}`);
      Alert.alert("Connection Error", "Failed to connect to KILT network");
      setLoading(false);
    }
  };

  const copyToClipboard = (text, type) => {
    Clipboard.setString(text);
    Alert.alert("Copied", `${type} copied to clipboard!`);
  };

  const runTest = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Please enter a W3N name");
      return;
    }

    if (!connected || !api) {
      Alert.alert("Error", "Not connected to KILT network");
      return;
    }

    setLogs([]);
    setLoading(true);
    setAccountsGenerated(false);
    setHolderMnemonic('');
    setIssuerMnemonic('');

    try {
      log("Starting W3N claim process...");
      
      const faucet = {
        publicKey: new Uint8Array([
          238, 93, 102, 137, 215, 142, 38, 187, 91, 53, 176, 68, 23, 64, 160, 101,
          199, 189, 142, 253, 209, 193, 84, 34, 7, 92, 63, 43, 32, 33, 181, 210,
        ]),
        secretKey: new Uint8Array([
          205, 253, 96, 36, 210, 176, 235, 162, 125, 84, 204, 146, 164, 76, 217,
          166, 39, 198, 155, 45, 189, 161, 94, 215, 229, 128, 133, 66, 81, 25, 174,
          3,
        ]),
      };

      const [submitter] = (await Kilt.getSignersForKeypair({
        keypair: faucet,
        type: "Ed25519",
      }));

      const balance = await api.query.system.account(submitter.id);
      
      log("Generating accounts with mnemonics...");
      let {
        holderAccount,
        issuerAccount,
        holderMnemonic,
        issuerMnemonic,
        holderWallet,
        issuerWallet,
      } = generateAccounts();
      

      // Store mnemonics
      setHolderMnemonic(holderMnemonic);
      setIssuerMnemonic(issuerMnemonic);
      setAccountsGenerated(true);
      
      log("keypair generation complete");
      log(`ISSUER_ACCOUNT_ADDRESS=${issuerWallet.address}`);
      log(`HOLDER_ACCOUNT_ADDRESS=${holderWallet.address}`);
      log("Mnemonics generated and stored securely");

      log("Generating holder DID...");
      let holderDid = await generateDid(submitter, holderAccount);
      log(`Holder DID: ${holderDid.didDocument.id}`);

      log(`Claiming W3N: ${name}`);
      try {
        await claimW3N(
          name,
          holderDid.didDocument,
          holderDid.signers,
          submitter
        );
        log(`W3N claimed successfully: ${name}`);
      } catch (w3nError) {
        log(`W3N claim failed: ${w3nError.message}`);
      }

      log("Generating issuer DID...");
      let issuerDid = await generateDid(submitter, issuerAccount);

      log("Verifying DID...");
      issuerDid = await verifyDid(
        submitter,
        issuerDid.didDocument,
        issuerDid.signers
      );

      log("Issuing credential...");
      try {
        const credential = await issueCredential(
          issuerDid.didDocument,
          holderDid.didDocument,
          issuerDid.signers,
          submitter
        );

        log("Process completed successfully!");
        log(`Credential ID: ${credential.id}`);
      } catch (credentialError) {
        log(`Credential issuance failed: ${credentialError.message}`);
        log("Process completed with errors in credential issuance.");
      }
      
    } catch (error) {
      log(`Error: ${error.message}`);
      Alert.alert("Error", `Operation failed: ${error.message}`);
    } finally {
      setLoading(false);
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

      <ScrollView style={styles.scrollContainer}>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Enter Web3 Name:</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Enter name (e.g., testw3nabc)"
            placeholderTextColor="#888"
            editable={!loading}
          />
          <TouchableOpacity
            style={[styles.button, loading && styles.disabledButton]}
            onPress={runTest}
            disabled={loading || !connected}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Claim W3N Name</Text>
            )}
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity
          style={styles.importWalletButton}
          onPress={() => navigation.navigate('ImportWallet')}
        >
          <Text style={styles.importWalletText}>Already have a wallet?</Text>
        </TouchableOpacity>
        
        {accountsGenerated && (
          <View style={styles.mnemonicContainer}>
            <Text style={styles.mnemonicTitle}>Generated Mnemonics:</Text>
            
            <View style={styles.mnemonicBox}>
              <Text style={styles.mnemonicLabel}>Holder Mnemonic:</Text>
              <Text style={styles.mnemonicText} numberOfLines={2} ellipsizeMode="tail">
                {holderMnemonic}
              </Text>
              <TouchableOpacity 
                style={styles.copyButton}
                onPress={() => copyToClipboard(holderMnemonic, "Holder Mnemonic")}
              >
                <Text style={styles.copyButtonText}>Copy</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.mnemonicBox}>
              <Text style={styles.mnemonicLabel}>Issuer Mnemonic:</Text>
              <Text style={styles.mnemonicText} numberOfLines={2} ellipsizeMode="tail">
                {issuerMnemonic}
              </Text>
              <TouchableOpacity 
                style={styles.copyButton}
                onPress={() => copyToClipboard(issuerMnemonic, "Issuer Mnemonic")}
              >
                <Text style={styles.copyButtonText}>Copy</Text>
              </TouchableOpacity>
            </View>
            
            <Text style={styles.warningText}>
              ⚠️ Important: Save these mnemonics securely. They provide access to your accounts.
            </Text>
          </View>
        )}
        
        <View style={styles.logContainer}>
          <Text style={styles.logTitle}>Logs:</Text>
          <View style={styles.logScroll}>
            {logs.map((log, index) => (
              <Text key={index} style={styles.logText}>
                {log.message}
              </Text>
            ))}
            {logs.length === 0 && !loading && (
              <Text style={styles.emptyLogText}>No logs yet. Run the test to see results.</Text>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flex: 1,
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
  inputContainer: {
    padding: 16,
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    borderRadius: 6,
    fontSize: 16,
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#5c6bc0',
    padding: 14,
    borderRadius: 6,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#9e9e9e',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  importWalletButton: {
    alignSelf: 'center',
    marginTop: 0,
    marginBottom: 16,
    padding: 8,
  },
  importWalletText: {
    color: '#5c6bc0',
    fontWeight: '600',
    fontSize: 15,
  },
  mnemonicContainer: {
    backgroundColor: 'white',
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  mnemonicTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  mnemonicBox: {
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  mnemonicLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    color: '#666',
  },
  mnemonicText: {
    fontFamily: 'monospace',
    fontSize: 13,
    color: '#333',
    marginBottom: 8,
  },
  copyButton: {
    backgroundColor: '#5c6bc0',
    padding: 8,
    borderRadius: 4,
    alignSelf: 'flex-end',
  },
  copyButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  warningText: {
    color: '#d32f2f',
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 8,
  },
  logContainer: {
    margin: 16,
    marginTop: 0,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
    minHeight: 200,
    maxHeight: 10000,
  },
  logTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  logScroll: {
    maxHeight: 250,
  },
  logText: {
    fontFamily: 'monospace',
    fontSize: 12,
    marginBottom: 4,
  },
  emptyLogText: {
    fontStyle: 'italic',
    color: '#888',
    textAlign: 'center',
    marginTop: 20,
  },
});

export default W3NScreen;