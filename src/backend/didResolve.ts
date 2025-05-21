import { DidResolver } from '@kiltprotocol/sdk-js'
import { Did, DidDocument } from '@kiltprotocol/types'

export async function didResolve(did: Did): Promise<DidDocument | null> {
  const { didResolutionMetadata, didDocument, didDocumentMetadata } =
    await DidResolver.resolve(did)
  if (didDocumentMetadata.deactivated) {
    throw new Error(`DID Document is deactivated for ${did}`)
  }
  
  if (didResolutionMetadata.error) {
    throw new Error(
      `DID Resolution error: ${didResolutionMetadata.error} for ${did}`
    )
  }

  if (didDocumentMetadata) {
    console.log('DID Document Metadata:', didDocumentMetadata)
  }

  if (!didDocument) {
    throw new Error(
      `DID Document missing when resolving ${did} in violation of the DID Resolver API`
    )
  }

  console.log('DID Document:', didDocument)
  return didDocument
}