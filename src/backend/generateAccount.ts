import * as Kilt from "@kiltprotocol/sdk-js";
import type { MultibaseKeyPair } from "@kiltprotocol/types";

interface GeneratedAccounts {
  issuerAccount: MultibaseKeyPair;
  holderAccount: MultibaseKeyPair;
  issuerMnemonic: string;
  holderMnemonic: string;
}

export function generateAccounts(): GeneratedAccounts {
  const { mnemonicGenerate } = require('@polkadot/util-crypto');
  const issuerMnemonic = mnemonicGenerate();
  const holderMnemonic = mnemonicGenerate();
  const issuerAccount = Kilt.generateKeypair({ 
    type: "sr25519", 
    mnemonic: issuerMnemonic 
  });
  const holderAccount = Kilt.generateKeypair({ 
    type: "sr25519", 
    mnemonic: holderMnemonic 
  });
  console.log(`Issuer mnemonics:=${issuerMnemonic}`)
  console.log(`Issuer mnemonics:=${holderMnemonic}`)
  console.log("keypair generation complete");
  console.log(`ISSUER_ACCOUNT_ADDRESS=${issuerAccount.publicKeyMultibase}`);
  console.log(`HOLDER_ACCOUNT_ADDRESS=${holderAccount.publicKeyMultibase}`);
  console.log("Mnemonics generated and stored");

  return { 
    issuerAccount, 
    holderAccount, 
    issuerMnemonic, 
    holderMnemonic 
  };
}