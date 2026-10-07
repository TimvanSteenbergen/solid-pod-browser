import { getSolidDataset, getThing, setThing, saveSolidDatasetAt, buildThing, getUrl } from '@inrupt/solid-client'
import { SCHEMA } from './vocab'

function documentUrl(webId) {
  return webId.split('#')[0]
}

export async function getProfileImageUrl(webId, fetchFn) {
  const dataset = await getSolidDataset(webId, { fetch: fetchFn })
  const thing = getThing(dataset, webId)
  if (!thing) return null
  return getUrl(thing, SCHEMA.image)
}

export async function setProfileImage(webId, imageObjectUrl, fetchFn) {
  const docUrl = documentUrl(webId)
  const dataset = await getSolidDataset(webId, { fetch: fetchFn })
  const existing = getThing(dataset, webId)
  if (!existing) throw new Error('Kon je profiel-Thing niet vinden.')

  let builder = buildThing(existing)
  builder = imageObjectUrl ? builder.setUrl(SCHEMA.image, imageObjectUrl) : builder.removeAll(SCHEMA.image)

  const updated = setThing(dataset, builder.build())
  await saveSolidDatasetAt(docUrl, updated, { fetch: fetchFn })
}
