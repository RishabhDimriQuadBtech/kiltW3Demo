import * as Kilt from "@kiltprotocol/sdk-js";

import type {
  SignerInterface,
  DidDocument,
  KiltAddress,
} from "@kiltprotocol/types";

export async function claimW3N(
  name: string,
  holderDid: DidDocument,
  signers: SignerInterface[],
  submitter: SignerInterface<"Sr25519", KiltAddress>
): Promise<string[] | undefined> {
  const api = Kilt.ConfigService.get("api");

  const claimName = api.tx.web3Names.claim(name);

  const transaction = await Kilt.DidHelpers.transact({
    api,
    call: claimName,
    didDocument: holderDid,
    signers: [...signers, submitter],
    submitter: submitter,
  }).submit();

  if (!transaction.asConfirmed) {
    return undefined;
  }

  console.log(
    "Web3 Name Claim",
    transaction.asConfirmed.didDocument.alsoKnownAs
  );
  return transaction.asConfirmed.didDocument.alsoKnownAs;
}
