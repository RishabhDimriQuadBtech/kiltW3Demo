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
import { Keyring } from '@polkadot/keyring';
import { cryptoWaitReady } from '@polkadot/util-crypto';

const AddressScreen = ({ route, navigation }) => {
  const { address, mnemonic } = route.params;
  const [w3nName, setW3nName] = useState('');
  const [newW3nName, setNewW3nName] = useState('');
  const [loading, setLoading] = useState(true);
  const [checkingW3n, setCheckingW3n] = useState(true);
  const [processingW3n, setProcessingW3n] = useState(false);
  const [api, setApi] = useState(null);
  const [logs, setLogs] = useState([]);
  const [hasW3n, setHasW3n] = useState(false);

  const log = (message) => {
    console.log(message);
    setLogs((prevLogs) => [...prevLogs, { time: new Date().toISOString(), message: String(message) }]);
  };

  useEffect(() => {
    connectAndCheckW3n();
  }, []);

  const connectAndCheckW3n = async () => {
    try {
      setLoading(true);
      log("Connecting to KILT network...");
      const apiInstance = await Kilt.connect("wss://peregrine.kilt.io/");
      setApi(apiInstance);
      log("Connected to KILT network");

      
      await checkForW3N(apiInstance, address);
    } catch (error) {
      log(`Error: ${error.message}`);
      Alert.alert("Connection Error", `Failed to connect to KILT network: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const checkForW3N = async (apiInstance, address) => {
    try {
      setCheckingW3n(true);
      log("Checking if address has associated W3N...");
  
      // First, get the DID associated with this address
      await cryptoWaitReady();
      const keyring = new Keyring({ type: 'sr25519', ss58Format: 38 });
      const pair = keyring.addFromMnemonic(mnemonic);
      
      log("Looking up DIDs for address: " + address);
      
      try {
        // Try a more direct approach first - check for w3names directly
        // Inside your checkForW3N function, where you handle the direct lookup:
        const w3Names = await apiInstance.query.web3Names.names(address);
        if (w3Names && !w3Names.isEmpty) {
          // Original line
          // const foundW3n = w3Names.toString();
          
          // New approach - handle hex encoding
          let foundW3n = w3Names.toString();
          
          // Check if it's a hex string and decode it
          if (foundW3n.startsWith('0x')) {
            try {
              // Convert hex to string
              foundW3n = Buffer.from(foundW3n.slice(2), 'hex').toString('utf8');
              log(`Decoded W3N from hex: ${foundW3n}`);
            } catch (decodeError) {
              log(`Error decoding hex W3N: ${decodeError.message}`);
            }
          }
          
          setW3nName(foundW3n);
          setHasW3n(true);
          log(`Found W3N directly: ${foundW3n}`);
          setCheckingW3n(false);
          return;

        }
      } catch (directError) {
        log(`Direct W3N lookup failed, trying alternative method: ${directError.message}`);
      }
      
      // Alternative approach using DID lookup
      try {
        // Try to find DIDs associated with this account
        // Use a safer approach that doesn't rely on specific account formats
        const encodedAddress = keyring.encodeAddress(pair.publicKey, 38);
        log("Using encoded address format: " + encodedAddress);
        
        // Query by using the public key directly, which should be more reliable
        const didIdentifiers = await apiInstance.call.did.queryByAccount(encodedAddress);
        
        if (didIdentifiers && didIdentifiers.length > 0) {
          log(`Found ${didIdentifiers.length} DIDs associated with this account`);
          
          // For each DID, check if it has an associated W3N
          for (const didIdentifier of didIdentifiers) {
            // Get DID details
            const didDetails = await apiInstance.call.did.query(didIdentifier);
            
            if (didDetails && didDetails.document) {
              const didDocument = didDetails.document;
              
              // Check if this DID has any w3names (alsoKnownAs field)
              if (didDocument.alsoKnownAs && didDocument.alsoKnownAs.length > 0) {
                // Find W3N entries
                const w3nEntries = didDocument.alsoKnownAs.filter(aka => 
                  aka.startsWith('kilt:w3n:')
                );
                
                if (w3nEntries.length > 0) {
                  // Extract just the name part from "kilt:w3n:name"
                  const foundW3n = w3nEntries[0].split(':')[2];
                  setW3nName(foundW3n);
                  setHasW3n(true);
                  log(`Found W3N via DID: ${foundW3n}`);
                  break;
                }
              }
            }
          }
        } else {
          log("No DIDs found for this account");
        }
      } catch (didError) {
        log(`DID lookup failed: ${didError.message}`);
      }
      
      if (!hasW3n) {
        log("No W3N found for this address");
      }
      
    } catch (error) {
      log(`Error checking W3N: ${error.message}`);
      Alert.alert("Error", `Failed to check W3N: ${error.message}`);
    } finally {
      setCheckingW3n(false);
    }
  };

  const claimNewW3Name = async () => {
    if (!newW3nName.trim()) {
      Alert.alert("Error", "Please enter a W3N name");
      return;
    }

    setProcessingW3n(true);
    setLogs([]);
    
    try {
      log("Starting W3N claim process for existing address...");
      
      
      if (!api) {
        const apiInstance = await Kilt.connect("wss://peregrine.kilt.io/");
        setApi(apiInstance);
        log("Connected to KILT network");
      }

      
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

      
      await cryptoWaitReady();
      // Inside your claimNewW3Name function
      const keyring = new Keyring({ type: 'sr25519', ss58Format: 38 });
      const accountPair = keyring.addFromMnemonic(mnemonic);

      // Create a keypair for KILT SDK using the appropriate seed format
      const holderAccount = Kilt.generateKeypair({
        type: "sr25519",
        seed: accountPair.secretKey // Use secretKey instead of publicKey
      });
      
      log("Using existing account address: " + address);

      
      log("Generating holder DID...");
      let holderDid = await generateDid(submitter, holderAccount);
      log(`Holder DID: ${holderDid.didDocument.id}`);

      
      log(`Claiming W3N: ${newW3nName}`);
      try {
        await claimW3N(
          newW3nName,
          holderDid.didDocument,
          holderDid.signers,
          submitter
        );
        log(`W3N claimed successfully: ${newW3nName}`);
        setW3nName(newW3nName);
        setHasW3n(true);
      } catch (w3nError) {
        log(`W3N claim failed: ${w3nError.message}`);
        Alert.alert("Error", `W3N claim failed: ${w3nError.message}`);
        return;
      }

      
      log("Generating issuer DID...");
      const issuerAccount = Kilt.generateKeypair({
        type: "sr25519",
      });
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
        Alert.alert("Success", `W3N '${newW3nName}' claimed successfully and credential issued!`);
      } catch (credentialError) {
        log(`Credential issuance failed: ${credentialError.message}`);
        log("Process completed with errors in credential issuance.");
      }

    } catch (error) {
      log(`Error: ${error.message}`);
      Alert.alert("Error", `Operation failed: ${error.message}`);
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
      ) : checkingW3n ? (
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