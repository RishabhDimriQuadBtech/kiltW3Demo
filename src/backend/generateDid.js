import * as Kilt from "@kiltprotocol/sdk-js"

export async function generateDid(submitter, authenticationKeyPair) {
  const api = Kilt.ConfigService.get("api")

  try {
    const transactionHandler = Kilt.DidHelpers.createDid({
      api,
      signers: [authenticationKeyPair],
      submitter: submitter,
      fromPublicKey: authenticationKeyPair.publicKeyMultibase
    })

    const didDocumentTransactionResult = await transactionHandler.submit()

    if (didDocumentTransactionResult.status !== "confirmed") {
      console.log(didDocumentTransactionResult.status)
      throw new Error("create DID failed")
    }

    const { didDocument, signers } = didDocumentTransactionResult.asConfirmed
    console.log(`ISSUER_DID_URI=${didDocument.id}`)
    return { didDocument, signers }
  } catch (error) {
    console.error("Error during DID generation:", error)
    throw error
  }
}
