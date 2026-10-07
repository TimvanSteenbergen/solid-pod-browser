import {
  getSolidDataset,
  getThing,
  setThing,
  getUrl,
  getContainedResourceUrlAll,
  createSolidDataset,
  deleteFile,
  createThing,
  buildThing,
  getStringNoLocale,
  getDecimal,
} from '@inrupt/solid-client'
import { RDF, SCHEMA } from './vocab'
import { overwriteSolidDataset } from './saveDataset'

function readAddress(dataset, placeThing) {
  const addressUrl = getUrl(placeThing, SCHEMA.address)
  const addressThing = addressUrl && getThing(dataset, addressUrl)
  if (!addressThing) return { streetAddress: '', postalCode: '', addressLocality: '', addressCountry: '' }
  return {
    streetAddress: getStringNoLocale(addressThing, SCHEMA.streetAddress) || '',
    postalCode: getStringNoLocale(addressThing, SCHEMA.postalCode) || '',
    addressLocality: getStringNoLocale(addressThing, SCHEMA.addressLocality) || '',
    addressCountry: getStringNoLocale(addressThing, SCHEMA.addressCountry) || '',
  }
}

function readGeo(dataset, placeThing) {
  const geoUrl = getUrl(placeThing, SCHEMA.geo)
  const geoThing = geoUrl && getThing(dataset, geoUrl)
  if (!geoThing) return { latitude: '', longitude: '' }
  const lat = getDecimal(geoThing, SCHEMA.latitude)
  const lng = getDecimal(geoThing, SCHEMA.longitude)
  return { latitude: lat === null ? '' : String(lat), longitude: lng === null ? '' : String(lng) }
}

function thingToPlace(dataset, thing, url) {
  return {
    url,
    name: getStringNoLocale(thing, SCHEMA.name) || '',
    description: getStringNoLocale(thing, SCHEMA.description) || '',
    ...readAddress(dataset, thing),
    ...readGeo(dataset, thing),
  }
}

const hasAddress = (data) =>
  [data.streetAddress, data.postalCode, data.addressLocality, data.addressCountry].some(
    (v) => (v || '').trim(),
  )
const hasGeo = (data) => (data.latitude || '').trim() || (data.longitude || '').trim()

// Builds the full dataset for one Place resource (place + nested address/geo
// sub-things as fragments of the same document), replacing it wholesale.
function buildPlaceDataset(resourceUrl, data) {
  let place = buildThing(createThing({ url: resourceUrl })).setUrl(RDF.type, SCHEMA.Place)

  if ((data.name || '').trim()) place = place.setStringNoLocale(SCHEMA.name, data.name.trim())
  if ((data.description || '').trim())
    place = place.setStringNoLocale(SCHEMA.description, data.description.trim())

  let dataset = createSolidDataset()

  if (hasAddress(data)) {
    let address = buildThing(createThing({ url: `${resourceUrl}#address` })).setUrl(
      RDF.type,
      SCHEMA.PostalAddress,
    )
    const fields = ['streetAddress', 'postalCode', 'addressLocality', 'addressCountry']
    for (const field of fields) {
      const value = (data[field] || '').trim()
      if (value) address = address.setStringNoLocale(SCHEMA[field], value)
    }
    const addressThing = address.build()
    dataset = setThing(dataset, addressThing)
    place = place.setUrl(SCHEMA.address, addressThing)
  }

  if (hasGeo(data)) {
    let geo = buildThing(createThing({ url: `${resourceUrl}#geo` })).setUrl(
      RDF.type,
      SCHEMA.GeoCoordinates,
    )
    if ((data.latitude || '').trim()) geo = geo.setDecimal(SCHEMA.latitude, parseFloat(data.latitude))
    if ((data.longitude || '').trim())
      geo = geo.setDecimal(SCHEMA.longitude, parseFloat(data.longitude))
    const geoThing = geo.build()
    dataset = setThing(dataset, geoThing)
    place = place.setUrl(SCHEMA.geo, geoThing)
  }

  dataset = setThing(dataset, place.build())
  return dataset
}

export async function listPlaces(containerUrl, fetchFn) {
  const containerDataset = await getSolidDataset(containerUrl, { fetch: fetchFn })
  const resourceUrls = getContainedResourceUrlAll(containerDataset)

  return Promise.all(
    resourceUrls.map(async (url) => {
      try {
        const dataset = await getSolidDataset(url, { fetch: fetchFn })
        const thing = getThing(dataset, url)
        if (!thing) return { url, name: '(leeg)', error: null }
        return thingToPlace(dataset, thing, url)
      } catch (e) {
        return { url, name: '(fout)', error: e.message || String(e) }
      }
    }),
  )
}

export async function getPlace(url, fetchFn) {
  const dataset = await getSolidDataset(url, { fetch: fetchFn })
  const thing = getThing(dataset, url)
  if (!thing) throw new Error('Place-resource niet gevonden.')
  return thingToPlace(dataset, thing, url)
}

export async function createPlace(containerUrl, data, fetchFn) {
  const slug = crypto.randomUUID()
  const resourceUrl = `${containerUrl}${slug}.ttl`
  await overwriteSolidDataset(resourceUrl, buildPlaceDataset(resourceUrl, data), fetchFn)
  return resourceUrl
}

export async function updatePlace(url, data, fetchFn) {
  await overwriteSolidDataset(url, buildPlaceDataset(url, data), fetchFn)
}

export async function deletePlace(url, fetchFn) {
  await deleteFile(url, { fetch: fetchFn })
}
