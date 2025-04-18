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
} from 'react-native';

import * as Kilt from "@kiltprotocol/sdk-js";
import { verifyDid } from "../backend/addVerification2Did";
import { generateAccounts } from "../backend/generateAccount";
import { generateDid } from "../backend/generateDid";
import { issueCredential } from "../backend/issueCredential";
import { claimW3N } from "../backend/claimW3N";

const W3NScreen = () => {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [connected, setConnected] = useState(false);
  const [api, setApi] = useState(null);

  // Custom logging function to capture logs for display
  const log = (message) => {
    console.log(message);
    setLogs((prevLogs) => [...prevLogs, { time: new Date().toISOString(), message: String(message) }]);
  };

  // Initialize connection on component mount
  useEffect(() => {
    connectToKilt();
    return () => {
      // Disconnect on unmount
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
      setConnected(true);
      log("Connected to KILT network");
      setLoading(false);
    } catch (error) {
      log(`Connection error: ${error.message}`);
      Alert.alert("Connection Error", "Failed to connect to KILT network");
      setLoading(false);
    }
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

    try {
      log("Starting W3N claim process...");
      
      // Faucet details (copied from your original code)
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

      // Get signer from keypair
      const [submitter] = (await Kilt.getSignersForKeypair({
        keypair: faucet,
        type: "Ed25519",
      }));

      // Check balance
      const balance = await api.query.system.account(submitter.id);
      log(`Balance: ${JSON.stringify(balance.toHuman())}`);

      // Generate accounts
      log("Generating accounts...");
      let { holderAccount, issuerAccount } = generateAccounts();

      // Generate holder DID
      log("Generating holder DID...");
      let holderDid = await generateDid(submitter, holderAccount);
      log(`Holder DID: ${holderDid.didDocument.id}`);

      // Claim Web3 Name with user-provided name
      log(`Claiming W3N: ${name}`);
      await claimW3N(
        name,
        holderDid.didDocument,
        holderDid.signers,
        submitter
      );

      // Generate issuer DID
      log("Generating issuer DID...");
      let issuerDid = await generateDid(submitter, issuerAccount);

      // Verify DID
      log("Verifying DID...");
      issuerDid = await verifyDid(
        submitter,
        issuerDid.didDocument,
        issuerDid.signers
      );

      // Issue credential
      log("Issuing credential...");
      const credential = await issueCredential(
        issuerDid.didDocument,
        holderDid.didDocument,
        issuerDid.signers,
        submitter
      );

      log("Process completed successfully!");
      log(`Credential ID: ${credential.id}`);
      
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

      <View style={styles.logContainer}>
        <Text style={styles.logTitle}>Logs:</Text>
        <ScrollView style={styles.logScroll}>
          {logs.map((log, index) => (
            <Text key={index} style={styles.logText}>
              {log.message}
            </Text>
          ))}
          {logs.length === 0 && !loading && (
            <Text style={styles.emptyLogText}>No logs yet. Run the test to see results.</Text>
          )}
        </ScrollView>
      </View>
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
  logContainer: {
    flex: 1,
    margin: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  logTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  logScroll: {
    flex: 1,
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
// // src/screens/W3NScreen.js (simplified)
// import React, { useState } from 'react';
// import {
//   SafeAreaView,
//   StyleSheet,
//   View,
//   Text,
//   TextInput,
//   TouchableOpacity,
// } from 'react-native';

// const W3NScreen = () => {
//   const [name, setName] = useState('');

//   return (
//     <SafeAreaView style={styles.container}>
//       <View style={styles.header}>
//         <Text style={styles.title}>KILT Web3 Name Claim</Text>
//       </View>

//       <View style={styles.inputContainer}>
//         <Text style={styles.label}>Enter Web3 Name:</Text>
//         <TextInput
//           style={styles.input}
//           value={name}
//           onChangeText={setName}
//           placeholder="Enter name (e.g., testw3nabc)"
//           placeholderTextColor="#888"
//         />
//         <TouchableOpacity style={styles.button}>
//           <Text style={styles.buttonText}>Claim W3N Name</Text>
//         </TouchableOpacity>
//       </View>
//     </SafeAreaView>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#f5f5f5',
//   },
//   header: {
//     padding: 16,
//     backgroundColor: '#3e4d6c',
//     alignItems: 'center',
//   },
//   title: {
//     fontSize: 22,
//     fontWeight: 'bold',
//     color: 'white',
//   },
//   inputContainer: {
//     padding: 16,
//     backgroundColor: 'white',
//     margin: 16,
//     borderRadius: 8,
//   },
//   label: {
//     fontSize: 16,
//     fontWeight: '600',
//     marginBottom: 8,
//   },
//   input: {
//     borderWidth: 1,
//     borderColor: '#ddd',
//     padding: 12,
//     borderRadius: 6,
//     fontSize: 16,
//     marginBottom: 16,
//   },
//   button: {
//     backgroundColor: '#5c6bc0',
//     padding: 14,
//     borderRadius: 6,
//     alignItems: 'center',
//   },
//   buttonText: {
//     color: 'white',
//     fontSize: 16,
//     fontWeight: '600',
//   },
// });

// export default W3NScreen;