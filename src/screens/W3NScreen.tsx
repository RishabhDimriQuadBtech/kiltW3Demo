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
import { ConfigService, KiltKeyring } from '@kiltprotocol/sdk-js';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { verifyDid } from "../backend/addVerification2Did";
import { generateAccounts, GeneratedAccounts } from "../backend/generateAccount";
import { generateDid, GenerateDidResponse } from "../backend/generateDid";
import { issueCredential } from "../backend/issueCredential";
import { claimW3N } from "../backend/claimW3N";

import { Crypto } from "@kiltprotocol/utils";
import { Keyring } from "@polkadot/keyring/cjs/keyring";
// Navigation types
type RootStackParamList = {
  W3N: undefined;
  ImportWallet: undefined;
};

type W3NScreenNavigationProp = NavigationProp<RootStackParamList, 'W3N'>;

// Type for log entries
interface LogEntry {
  time: string;
  message: string;
}

const W3NScreen = () => {
  const did_1 = require("@kiltprotocol/did");
  const navigation = useNavigation<W3NScreenNavigationProp>();
  const [name, setName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [connected, setConnected] = useState<boolean>(false);
  const [api, setApi] = useState<Kilt.KiltApi | null>(null);
  const [holderMnemonic, setHolderMnemonic] = useState<string>('');
  const [issuerMnemonic, setIssuerMnemonic] = useState<string>('');
  const [accountsGenerated, setAccountsGenerated] = useState<boolean>(false);

  const log = (message: unknown) => {
    const messageString = String(message);
    console.log(messageString);
    setLogs((prevLogs) => [
      ...prevLogs,
      { time: new Date().toISOString(), message: messageString }
    ]);
  };

  useEffect(() => {
    connectToKilt();
    return () => {
      if (api) {
        api.disconnect().then(() => log('Disconnected from KILT'));
      }
    };
  }, []);

  const connectToKilt = async () => {
    try {
      setLoading(true);
      const apiInstance = await Kilt.connect("wss://peregrine.kilt.io/");
      setApi(apiInstance);
      
      log(`KILT SDK Version: ${Kilt.version || 'unknown'}`);
      log(`Available KILT modules: ${Object.keys(Kilt).join(', ')}`);
      
      setConnected(true);
      log("Connected to KILT network");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log(`Connection error: ${errorMessage}`);
      Alert.alert("Connection Error", "Failed to connect to KILT network");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, type: string) => {
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

      // Define faucet keypair with proper TypeScript typing
      // const faucet: Kilt.KiltKeyringPair = {
      //   publicKey: new Uint8Array([
      //     139,72,10,142,229,30,183,152,208,32,140,19,161,186,183,143,
      //     217,215,189,94,12,95,196,202,234,110,54,187,37,166,2,158
      //   ]),
      //   secretKey: new Uint8Array([
      //     109,119,167,31,116,23,124,39,116,62,96,69,109,42,12,90,
      //     165,217,175,245,138,37,23,114,246,95,239,221,59,237,162,66
      //   ]),
      //   type: 'Sr25519',
      // } as const;

      // const [submitter] = await Kilt.getSignersForKeypair({
      //   keypair: faucet,
      //   type: "Sr25519",
      // });
      const faucetMnemonic =
  'bag will genuine gloom sustain repair finger better session recycle able play'

  const keyring = new Keyring({ type: 'sr25519', ss58Format: 38 });
// Set the correct SS58 prefix for KILT// KILT SS58 prefix

  const faucet = keyring.addFromMnemonic(faucetMnemonic);
// const faucet = Kilt.generateKeypair({ seed: faucetMnemonic })

const [submitter] = await Kilt.getSignersForKeypair({
  keypair: faucet,
  type: 'Sr25519',
})

log(`Submitter address: ${submitter.id}`) ;

      // const balance = await api.query.system.account(submitter.id);
      // log(`Faucet balance: ${balance.toHuman()}`);
      
      log(`submitter Id:- ${submitter.id}`);
      const { data: balanceData } = await api.query.system.account(submitter.id);
      const freeBalance = balanceData.free.toBigInt()
      log(`Wallet balance (Planck):, ${freeBalance.toString()}`)
  const kiltBalance = Number(freeBalance) / 10 ** 15
  log(`Wallet balance (KILT):, ${kiltBalance}`)

      log("Generating accounts with mnemonics...");
      const {
        holderAccount,
        issuerAccount,
        holderMnemonic: generatedHolderMnemonic,
        issuerMnemonic: generatedIssuerMnemonic,
        holderWallet,
        issuerWallet,
      }: GeneratedAccounts = generateAccounts();

      setHolderMnemonic(generatedHolderMnemonic);
      setIssuerMnemonic(generatedIssuerMnemonic);
      setAccountsGenerated(true);

      log(`ISSUER_ACCOUNT_ADDRESS: ${issuerWallet.address}`);
      log(`HOLDER_ACCOUNT_ADDRESS: ${holderWallet.address}`);

      log("Generating holder DID...");
      const holderDid = await generateDid(submitter, holderAccount);
      log(`Holder DID: ${holderDid.didDocument.id}`);

      const authKeypair = Crypto.makeKeypairFromUri(`${holderMnemonic}//did//0`, 'sr25519');
      const didUri = `did:kilt:${authKeypair.address}`;
      log(`didUri this one: ${didUri}`);

      // try {
      //   log(`Claiming W3N: ${name}`);
      //   await claimW3N(
      //     name,
      //     holderDid.didDocument,
      //     holderDid.signers,
      //     submitter
      //   );
      //   log(`Successfully claimed W3N: ${name}`);
      // } catch (w3nError) {
      //   const errorMessage = w3nError instanceof Error ? w3nError.message : 'Unknown error';
      //   log(`W3N claim failed: ${errorMessage}`);
      // }

      // log("Generating issuer DID...");
      // const issuerDid = await generateDid(submitter, issuerAccount);

      // log("Verifying DID...");
      // const verifiedIssuerDid = await verifyDid(
      //   submitter,
      //   issuerDid.didDocument,
      //   issuerDid.signers
      // );

      // log("Issuing credential...");
      // try {
      //   const credential = await issueCredential(
      //     verifiedIssuerDid.didDocument,
      //     holderDid.didDocument,
      //     verifiedIssuerDid.signers,
      //     submitter
      //   );
      //   log(`Credential issued with ID: ${credential.id}`);
      //   log("Process completed successfully!");
      // } catch (credentialError) {
      //   const errorMessage = credentialError instanceof Error ? credentialError.message : 'Unknown error';
      //   log(`Credential issuance failed: ${errorMessage}`);
      // }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log(`Process failed: ${errorMessage}`);
      Alert.alert("Error", `Operation failed: ${errorMessage}`);
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