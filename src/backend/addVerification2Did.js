import * as Kilt from "@kiltprotocol/sdk-js"

export async function verifyDid(submitter, didDocument, signers) {
  const api = Kilt.ConfigService.get("api")

  try {
    const assertionKeyPair = Kilt.generateKeypair({
      type: "sr25519"
    })

    const vmTransactionResult = await Kilt.DidHelpers.setVerificationMethod({
      api,
      didDocument,
      signers: [...signers, assertionKeyPair],
      submitter: submitter,
      publicKey: assertionKeyPair.publicKeyMultibase,
      relationship: "assertionMethod"
    }).submit()

    if (vmTransactionResult.status !== "confirmed") {
      throw new Error(`add verification method failed: ${vmTransactionResult.status}`)
    }

    ;({ didDocument, signers } = vmTransactionResult.asConfirmed)
    console.log("assertion method added")
    return { didDocument, signers }
  } catch (error) {
    console.error("Error during DID verification:", error)
    throw error
  }
}
