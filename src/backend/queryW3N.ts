import { ConfigService } from '@kiltprotocol/sdk-js'

export async function queryW3N(): Promise<void> {
  const api = ConfigService.get('api')
  const alice = 'alice'
  const aliceDid = 'did:kilt:4qDtbjs88NbE7N2WUmqTVDY7kn82WiGRJc5KNcVhgdcZZco1'

  // Checks if a DID has a web3name registered
  // strip the DID prefix to check
  // returns the web3name if it is registered
  const checksDIDW3N = await api.query.web3Names.names(
    aliceDid.replace('did:kilt:', '')
  )
  console.log('The web3name claimed by DID', checksDIDW3N.toHuman())

  // Checks if the name is registered and returns the owner
  // the owner includes the DID and block which the owner claimed the web3name
  // returns also the deposit owner of the web3name can be different from the owner.
  const did = await api.query.web3Names.owner(alice)
  console.log(`DID Owner of given web3name: ${alice}`, did.toHuman())
}