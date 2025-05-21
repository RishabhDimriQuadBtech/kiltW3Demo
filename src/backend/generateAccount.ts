import * as Kilt from "@kiltprotocol/sdk-js";
import type { MultibaseKeyPair } from "@kiltprotocol/types";
import { mnemonicGenerate, mnemonicToMiniSecret } from "@polkadot/util-crypto";
import { u8aToHex } from "@polkadot/util";
import { Keyring } from "@polkadot/keyring/cjs/keyring";
import type { KeyringPair } from "@polkadot/keyring/types";
import {multibaseKeyToDidKey} from '@kiltprotocol/did';
import {encodeAddress} from '@polkadot/util-crypto';

interface GeneratedAccounts {
  issuerAccount: MultibaseKeyPair;
  holderAccount: MultibaseKeyPair;
  issuerMnemonic: string;
  holderMnemonic: string;
  issuerWallet: KeyringPair;
  holderWallet: KeyringPair;
}

export function generateAccounts(): GeneratedAccounts {
  const keyring = new Keyring({ type: 'sr25519', ss58Format: 38 }); // KILT chain

  const issuerMnemonic = mnemonicGenerate();
  const holderMnemonic = mnemonicGenerate();
  
  const issuerSeed = u8aToHex(mnemonicToMiniSecret(issuerMnemonic));
  const holderSeed = u8aToHex(mnemonicToMiniSecret(holderMnemonic));

  const issuerAccount = Kilt.generateKeypair({ 
    type: "sr25519", 
    seed: issuerSeed, 
  });
  
  //new 
  const createHolderDidMnemonic = holderMnemonic + '//did//1'
  console.log("new holder mnemonic",createHolderDidMnemonic);



  const holderAccount = Kilt.generateKeypair({ 
    type: "sr25519", 
    seed: holderSeed, 
  });

  const issuerWallet = keyring.addFromMnemonic(issuerMnemonic);
  const holderWallet = keyring.addFromMnemonic(holderMnemonic);


  console.log("=== ISSUER ===");
  console.log("Mnemonic:", issuerMnemonic);
  console.log("DID publicKey:", issuerAccount.publicKeyMultibase);
  console.log("Wallet Address:", issuerWallet.address);

  console.log("=== HOLDER ===");
  console.log("Mnemonic:", holderMnemonic);
  console.log("DID publicKey:", holderAccount.publicKeyMultibase);
  console.log("Wallet Address:", holderWallet.address);


  console.log("Issuer:-")
  console.log("Public Key: "+issuerAccount.publicKeyMultibase);
  console.log("Secret Key: "+issuerAccount.secretKeyMultibase);
  
  const issuerMultibaseKeyToDidKey = multibaseKeyToDidKey(
    issuerAccount.publicKeyMultibase,
  );
  console.log('issuer publicKey:', issuerMultibaseKeyToDidKey.publicKey);
  console.log('issuer publicKey type:', issuerMultibaseKeyToDidKey.keyType);

  const hexIssuer = u8aToHex(issuerMultibaseKeyToDidKey.publicKey);
  console.log('issuer publicKey hex:', hexIssuer);
  const issuerEncodedAddhress = encodeAddress(hexIssuer, 38);
  console.log('issuer publicKey address:', issuerEncodedAddhress);

  return { 
    holderAccount,
    issuerAccount,
    holderMnemonic,
    issuerMnemonic,
    holderWallet,
    issuerWallet,
  };
}