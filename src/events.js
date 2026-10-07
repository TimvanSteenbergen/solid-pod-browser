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
  getDatetime,
} from '@inrupt/solid-client'
import { RDF, SCHEMA } from './vocab'
import { toDatetimeInputValue, fromDatetimeInputValue } from './dateUtils'
import { overwriteSolidDataset } from './saveDataset'

function thingToEvent(thing, url) {
  return {
    url,
    name: getStringNoLocale(thing, SCHEMA.name) || '',
    description: getStringNoLocale(thing, SCHEMA.description) || '',
    startDate: toDatetimeInputValue(getDatetime(thing, SCHEMA.startDate)),
    endDate: toDatetimeInputValue(getDatetime(thing, SCHEMA.endDate)),
    locationUrl: getUrl(thing, SCHEMA.location) || '',
    eventScheduleUrl: getUrl(thing, SCHEMA.eventSchedule) || '',
  }
}

// Replaces the whole Event resource on every save. schema:location and
// schema:eventSchedule are plain links to existing Place/Schedule resources
// elsewhere in the pod, not nested sub-things.
function buildEventThing(url, data) {
  let thing = buildThing(createThing({ url })).setUrl(RDF.type, SCHEMA.Event)

  if ((data.name || '').trim()) thing = thing.setStringNoLocale(SCHEMA.name, data.name.trim())
  if ((data.description || '').trim())
    thing = thing.setStringNoLocale(SCHEMA.description, data.description.trim())
  if (data.startDate) thing = thing.setDatetime(SCHEMA.startDate, fromDatetimeInputValue(data.startDate))
  if (data.endDate) thing = thing.setDatetime(SCHEMA.endDate, fromDatetimeInputValue(data.endDate))
  if (data.locationUrl) thing = thing.setUrl(SCHEMA.location, data.locationUrl)
  if (data.eventScheduleUrl) thing = thing.setUrl(SCHEMA.eventSchedule, data.eventScheduleUrl)

  return thing.build()
}

export async function listEvents(containerUrl, fetchFn) {
  const containerDataset = await getSolidDataset(containerUrl, { fetch: fetchFn })
  const urls = getContainedResourceUrlAll(containerDataset)

  return Promise.all(
    urls.map(async (url) => {
      try {
        const dataset = await getSolidDataset(url, { fetch: fetchFn })
        const thing = getThing(dataset, url)
        if (!thing) return { url, name: '(leeg)', error: null }
        return thingToEvent(thing, url)
      } catch (e) {
        return { url, name: '(fout)', error: e.message || String(e) }
      }
    }),
  )
}

export async function getEvent(url, fetchFn) {
  const dataset = await getSolidDataset(url, { fetch: fetchFn })
  const thing = getThing(dataset, url)
  if (!thing) throw new Error('Event-resource niet gevonden.')
  return thingToEvent(thing, url)
}

export async function createEvent(containerUrl, data, fetchFn) {
  const slug = crypto.randomUUID()
  const url = `${containerUrl}${slug}.ttl`
  const dataset = setThing(createSolidDataset(), buildEventThing(url, data))
  await overwriteSolidDataset(url, dataset, fetchFn)
  return url
}

export async function updateEvent(url, data, fetchFn) {
  const dataset = setThing(createSolidDataset(), buildEventThing(url, data))
  await overwriteSolidDataset(url, dataset, fetchFn)
}

export async function deleteEvent(url, fetchFn) {
  await deleteFile(url, { fetch: fetchFn })
}
