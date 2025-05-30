import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import * as Kilt from "@kiltprotocol/sdk-js";
import { verifyDid } from "../backend/addVerification2Did";
import { generateDid } from "../backend/generateDid";
import { issueCredential } from "../backend/issueCredential";
import { claimW3N } from "../backend/claimW3N";
import { Keyring} from '@polkadot/keyring';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { typesBundle } from '@kiltprotocol/type-definitions';

import { Crypto } from "@kiltprotocol/utils";
import { getFullDid } from '@kiltprotocol/did';
import { mnemonicToMiniSecret } from "@polkadot/util-crypto";
import { u8aToHex } from "@polkadot/util";
import { didResolve } from '../backend/didResolve';
import { queryW3N } from '../backend/queryW3N';

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { DidDocument } from '@kiltprotocol/types';

type RootStackParamList = {
  AddressScreen: { address: string; mnemonic: string };
};

type AddressScreenRouteProp = RouteProp<RootStackParamList, 'AddressScreen'>;

type Props = NativeStackScreenProps<RootStackParamList, 'AddressScreen'>;

type KiltApi = ApiPromise; 
interface GenerateDidResult {
  didDocument: DidDocument;
  signers: Kilt.SigningKeypair[];
}

const AddressScreen: React.FC<Props> = ({ route, navigation }) => {
  const did_1 = require("@kiltprotocol/did");
  const { address, mnemonic } = route.params;
  
  const [w3nName, setW3nName] = useState<string>('');
  const [holderDid, setHolderDid] = useState<string>('');
  const [newW3nName, setNewW3nName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [checkingW3n, setCheckingW3n] = useState<boolean>(false);
  const [loadingDid, setLoadingDid] = useState<boolean>(false);
  const [processingW3n, setProcessingW3n] = useState<boolean>(false);
  const [api, setApi] = useState<KiltApi | null>(null);
  const [logs, setLogs] = useState<{ time: string; message: string }[]>([]);
  const [hasW3n, setHasW3n] = useState<boolean>(false);

  const log = (message: string) => {
    console.log(message);
    setLogs(prev => [...prev, { time: new Date().toISOString(), message }]);
  };

  useEffect(() => {
    initializeConnection();
  }, []);

  const initializeConnection = async (): Promise<void> => {
    try {
      setLoading(true);
      log("Connecting to KILT network...");

      const provider = new WsProvider("wss://peregrine.kilt.io/");
      const apiInstance = await ApiPromise.create({ provider, typesBundle });
      setApi(apiInstance as KiltApi);
      log("Connected to KILT network");

      const did = await retrieveHolderDid(apiInstance as KiltApi);
      if (did) {
        await checkForW3N(apiInstance as KiltApi, did);
      } else {
        log("DID not found, skipping W3N check");
      }
    } catch (error: any) {
      log(`Error: ${error.message}`);
      Alert.alert("Connection Error", `Failed to connect to KILT: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const retrieveHolderDid = async (apiInstance: KiltApi): Promise<string | null> => {
    try {
      setLoadingDid(true);
      log("Retrieving holder DID...");

      await cryptoWaitReady();
      const keyring = new Keyring({ type: 'sr25519', ss58Format: 38 });
      const pair = keyring.addFromMnemonic(mnemonic);
      // const seed = u8aToHex(mnemonicToMiniSecret(mnemonic));
      
      // const seed = mnemonicToMiniSecret(mnemonic);
      // const issuerAccount = Kilt.generateKeypair({ 
      //     type: "ed25519", 
      //     seed: seed, 
      //   });

//         const seed = mnemonicToMiniSecret(mnemonic);

// const keypairSec = Crypto.makeEncryptionKeypairFromSeed(seed);
// const keypairPub=Crypto.makeKeypairFromSeed(seed);

// log(`Public Key: ${ Array.from(keypairPub.publicKey)}`);
// log(`Secret Key:',${ Array.from(keypairSec.secretKey)}`);
//       // log(issuerAccount.publicKeyMultibase)
//       const { data: balanceData } = await apiInstance.query.system.account(pair.address)
//   const freeBalance = balanceData.free.toBigInt()

//   console.log('Wallet balance (Planck):', freeBalance.toString())
//   const kiltBalance = Number(freeBalance) / 10 ** 15
//   console.log('Wallet balance (KILT):', kiltBalance)
      
      const authKeypair = Crypto.makeKeypairFromUri(`${mnemonic}//did//0`, 'sr25519');
      const didUri = `did:kilt:${authKeypair.address}`;
      log(`didUri: ${didUri}`);

      const { didDocument }: { didDocument: DidDocument } = await did_1.resolver.resolve(didUri);
      if (didDocument) {
        log(`DID document found: ${didDocument.id}`);
        setHolderDid(didDocument.id);
        return didDocument.id;
      } else {
        log("DID not found");
        return null;
      }
    } catch (error: any) {
      log(`Error retrieving DID: ${error.message}`);
      Alert.alert("Error", `Failed to retrieve DID: ${error.message}`);
      setHolderDid("");
      return null;
    } finally {
      setLoadingDid(false);
    }
  };

  const checkForW3N = async (apiInstance: KiltApi, did: string): Promise<void> => {
    try {
      setCheckingW3n(true);
      log("Checking for Web3 Name...");

      await cryptoWaitReady();
      const key = did.replace('did:kilt:', '');
      const names = await apiInstance.query.web3Names.names(key);
      const found = names.toHuman() as string | null;

      if (found) {
        log(`Found W3N: ${found}`);
        setW3nName(found);
        setHasW3n(true);
      } else {
        log("No W3N found");
        setHasW3n(false);
      }
    } catch (error: any) {
      log(`Error checking W3N: ${error.message}`);
      Alert.alert("Error", `W3N check failed: ${error.message}`);
      setHasW3n(false);
    } finally {
      setCheckingW3n(false);
    }
  };

  const claimNewW3Name = async (): Promise<void> => {
    if (!newW3nName.trim()) {
      Alert.alert("Error", "Please enter a W3N");
      return;
    }
    if (!api) {
      Alert.alert("Error", "Not connected to KILT");
      return;
    }

    setProcessingW3n(true);
    setLogs([]);
    try {
      log("Starting W3N claim...");

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
      const [submitter] = await Kilt.getSignersForKeypair({ keypair: faucet, type: 'Ed25519' });
      await cryptoWaitReady();
      const keyring = new Keyring({ type: 'sr25519', ss58Format: 38 });
      const holderPair = keyring.addFromMnemonic(mnemonic);
      const holderSeed = u8aToHex(mnemonicToMiniSecret(mnemonic));
      const holderAccount = Kilt.generateKeypair({ type: 'ed25519', seed: holderSeed });

      log(`Generating holder DID...`);
      const holderDidObj = (await generateDid(submitter, holderAccount)) as GenerateDidResult;
      const formattedDid= holderDidObj.didDocument.id;
      setHolderDid(formattedDid);

      log(`Claiming W3N: ${newW3nName}`);
      await claimW3N(newW3nName, holderDidObj.didDocument, holderDidObj.signers, submitter);
      log(`W3N claimed: ${newW3nName}`);
      setW3nName(newW3nName);
      setHasW3n(true);

      log("Generating issuer DID...");
      const issuerAccount = Kilt.generateKeypair({ type: 'sr25519' });
      let issuerDid = (await generateDid(submitter, issuerAccount)) as GenerateDidResult;

      log("Verifying DID...");
      issuerDid = (await verifyDid(submitter, issuerDid.didDocument, issuerDid.signers)) as GenerateDidResult;

      log("Issuing credential...");
      const credential = await issueCredential(
        issuerDid.didDocument,
        holderDidObj.didDocument,
        issuerDid.signers,
        submitter
      );
      log(`Credential issued: ${credential.id}`);
      Alert.alert("Success", `W3N '${newW3nName}' claimed and credential issued.`);
    } catch (error: any) {
      log(`Error: ${error.message}`);
      Alert.alert("Error", error.message);
    } finally {
      setProcessingW3n(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.title}>Address Details</Text>
        <Text style={styles.address}>{address}</Text>
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5c6bc0" />
          <Text style={styles.loadingText}>Connecting to KILT network...</Text>
        </View>
      ) : (
        <>
          {/* DID section */}
          <View style={styles.didSectionContainer}>
            {loadingDid ? (
              <View style={styles.didLoadingContainer}>
                <ActivityIndicator size="small" color="#5c6bc0" />
                <Text style={styles.loadingText}>Loading DID...</Text>
              </View>
            ) : (
              <View style={styles.didContainer}>
                <Text style={styles.didTitle}>Holder DID:</Text>
                {holderDid ? (
                  <>
                    <Text style={styles.didValue}>{holderDid}</Text>
                    <Text style={styles.didStatus}>✓ DID exists on KILT network</Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.didValue}>None</Text>
                    <Text style={styles.didStatusNegative}>✗ No DID found for this address</Text>
                  </>
                )}
              </View>
            )}
          </View>
          
          {/* W3N section */}
          {checkingW3n ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#5c6bc0" />
              <Text style={styles.loadingText}>Checking for associated W3N...</Text>
            </View>
          ) : hasW3n ? (
            <View style={styles.w3nContainer}>
              <Text style={styles.w3nTitle}>Web3 Name Found:</Text>
              <Text style={styles.w3nValue}>{w3nName}</Text>
            </View>
          ) : (
            <View style={styles.claimContainer}>
              <Text style={styles.claimTitle}>No Web3 Name Found</Text>
              <Text style={styles.claimDescription}>
                You can claim a new Web3 Name for this address:
              </Text>
              <TextInput
                style={styles.input}
                value={newW3nName}
                onChangeText={setNewW3nName}
                placeholder="Enter new W3N name (e.g., myname)"
                placeholderTextColor="#888"
                editable={!processingW3n}
              />
              <TouchableOpacity
                style={[styles.button, processingW3n && styles.disabledButton]}
                onPress={claimNewW3Name}
                disabled={processingW3n}
              >
                {processingW3n ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Claim W3N Name</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </>
      )}

      <View style={styles.logContainer}>
        <Text style={styles.logTitle}>Logs:</Text>
        <View style={styles.logScroll}>
          {logs.map((log, index) => (
            <Text key={index} style={styles.logText}>
              {log.message}
            </Text>
          ))}
          {logs.length === 0 && !loading && !checkingW3n && !processingW3n && (
            <Text style={styles.emptyLogText}>No logs yet.</Text>
          )}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  headerContainer: {
    padding: 16,
    backgroundColor: '#3e4d6c',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
  },
  address: {
    fontSize: 14,
    color: 'white',
    marginTop: 8,
    fontFamily: 'monospace',
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  didSectionContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
    alignItems: 'center',
  },
  w3nContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
    alignItems: 'center',
  },
  w3nTitle: {
    fontSize: 16,
    color: '#666',
  },
  w3nValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3e4d6c',
    marginTop: 8,
    marginBottom: 16,
  },
  didLoadingContainer: {
    marginTop: 8,
    alignItems: 'center',
  },
  didContainer: {
    alignItems: 'center',
    width: '100%',
  },
  didTitle: {
    fontSize: 16,
    color: '#666',
  },
  didValue: {
    fontSize: 14,
    color: '#3e4d6c',
    marginTop: 8,
    fontFamily: 'monospace',
    textAlign: 'center',
  },
  didStatus: {
    color: '#4caf50',
    fontSize: 14,
    marginTop: 4,
    fontWeight: '500',
  },
  didStatusNegative: {
    color: '#f44336',
    fontSize: 14,
    marginTop: 4,
    fontWeight: '500',
  },
  claimContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  claimTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3e4d6c',
  },
  claimDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    marginBottom: 16,
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
  logContainer: {
    margin: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
    minHeight: 200,
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

export default AddressScreen;