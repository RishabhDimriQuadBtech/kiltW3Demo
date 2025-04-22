import * as Kilt from "@kiltprotocol/sdk-js"
import { verifyDid } from "./addVerification2Did.js"
import { generateAccounts } from "./generateAccount.js"
import { generateDid } from "./generateDid.js"
import { issueCredential } from "./issueCredential.js"
import { claimW3N } from "./claimW3N.js"

async function runAll() {
  let api = await Kilt.connect("wss://peregrine.kilt.io/")

  console.log("connected")

  const faucet = {
    publicKey: new Uint8Array([
      238,
      93,
      102,
      137,
      215,
      142,
      38,
      187,
      91,
      53,
      176,
      68,
      23,
      64,
      160,
      101,
      199,
      189,
      142,
      253,
      209,
      193,
      84,
      34,
      7,
      92,
      63,
      43,
      32,
      33,
      181,
      210
    ]),
    secretKey: new Uint8Array([
      205,
      253,
      96,
      36,
      210,
      176,
      235,
      162,
      125,
      84,
      204,
      146,
      164,
      76,
      217,
      166,
      39,
      198,
      155,
      45,
      189,
      161,
      94,
      215,
      229,
      128,
      133,
      66,
      81,
      25,
      174,
      3
    ])
  }

  const [submitter] = await Kilt.getSignersForKeypair({
    keypair: faucet,
    type: "Ed25519"
  })

  const balance = await api.query.system.account(submitter.id)
  console.log("balance", balance.toHuman())
  let { holderAccount, issuerAccount } = generateAccounts()
  console.log("Successfully transferred tokens")

  let holderDid = await generateDid(submitter, holderAccount)

  await claimW3N(
    "testw3nabc",
    holderDid.didDocument,
    holderDid.signers,
    submitter
  )

  let issuerDid = await generateDid(submitter, issuerAccount)

  issuerDid = await verifyDid(
    submitter,
    issuerDid.didDocument,
    issuerDid.signers
  )

  const credential = await issueCredential(
    issuerDid.didDocument,
    holderDid.didDocument,
    issuerDid.signers,
    submitter
  )

  console.log("Credential", credential)

  await api.disconnect()
  console.log("disconnected")
}

runAll()
  .then(() => {
    console.log("All done")
  })
  .catch(error => {
    console.error("Error:", error)
  })
  .finally(() => {
    console.log("Finally")
    process.exit()
  })
