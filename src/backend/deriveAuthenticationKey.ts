import { Crypto } from "@kiltprotocol/utils";
export function deriveAuthenticationKey(seed: Uint8Array) {
    const baseKey = Crypto.makeKeypairFromSeed(seed, 'sr25519');
    return baseKey.derive('//did//0') as typeof baseKey;
  }
