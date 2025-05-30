import * as Kilt from "@kiltprotocol/sdk-js";
import type {
  SignerInterface,
  DidDocument,
  MultibaseKeyPair,
  KiltAddress,
} from "@kiltprotocol/types";

export async function generateDid(
  submitter: SignerInterface<"Sr25519", KiltAddress>,
  authenticationKeyPair: MultibaseKeyPair
): Promise<{ didDocument: DidDocument; signers: SignerInterface[] }> {
  const api = Kilt.ConfigService.get("api");
  const transactionHandler = Kilt.DidHelpers.createDid({
    api,
    signers: [authenticationKeyPair],
    submitter: submitter,
    fromPublicKey: authenticationKeyPair.publicKeyMultibase,
  });

  const didDocumentTransactionResult = await transactionHandler.submit();

  if (didDocumentTransactionResult.status !== "confirmed") {
    console.log(didDocumentTransactionResult.status);
    throw new Error("create DID failed");
  }

  let { didDocument, signers } = didDocumentTransactionResult.asConfirmed;
  console.log(`DID_URI=${didDocument.id}`);
  return { didDocument, signers };
}
