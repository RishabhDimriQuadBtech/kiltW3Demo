import * as Kilt from "@kiltprotocol/sdk-js"

export async function claimW3N(name, holderDid, signers, submitter) {
  const api = Kilt.ConfigService.get("api")

  try {
    // Ensure the api.query.web3Names.name function is available
    if (!api.query.web3Names) {
      throw new Error("Web3Names module not available on the chain")
    }

    const claimName = api.tx.web3Names.claim(name)

    const transaction = await Kilt.DidHelpers.transact({
      api,
      call: claimName,
      didDocument: holderDid,
      signers: [...signers, submitter],
      submitter: submitter
    }).submit()

    if (transaction.status !== "confirmed") {
      throw new Error(`W3N claim transaction failed with status: ${transaction.status}`)
    }

    console.log("Web3 Name Claim", transaction.asConfirmed.didDocument.alsoKnownAs)
    return transaction.asConfirmed.didDocument.alsoKnownAs
  } catch (error) {
    console.error("Error during W3N claim process:", error)
    throw error
  }
}
