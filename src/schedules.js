import {
  getSolidDataset,
  getThing,
  setThing,
  getContainedResourceUrlAll,
  createSolidDataset,
  deleteFile,
  createThing,
  buildThing,
  getStringNoLocale,
  getDate,
  getTime,
  getUrlAll,
} from '@inrupt/solid-client'
import { RDF, SCHEMA, DAY_OF_WEEK } from './vocab'
import { toDateInputValue, fromDateInputValue, toTimeInputValue, fromTimeInputValue } from './dateUtils'
import { overwriteSolidDataset } from './saveDataset'

const DAY_NAMES = Object.keys(DAY_OF_WEEK)

function thingToSchedule(thing, url) {
  const byDayUrls = getUrlAll(thing, SCHEMA.byDay)
  return {
    url,
    startDate: toDateInputValue(getDate(thing, SCHEMA.startDate)),
    endDate: toDateInputValue(getDate(thing, SCHEMA.endDate)),
    startTime: toTimeInputValue(getTime(thing, SCHEMA.startTime)),
    endTime: toTimeInputValue(getTime(thing, SCHEMA.endTime)),
    repeatFrequency: getStringNoLocale(thing, SCHEMA.repeatFrequency) || '',
    scheduleTimezone: getStringNoLocale(thing, SCHEMA.scheduleTimezone) || '',
    byDay: DAY_NAMES.filter((day) => byDayUrls.includes(DAY_OF_WEEK[day])),
  }
}

// Replaces the whole Schedule resource on every save (simpler and avoids
// leftover triples, since a Schedule has no nested sub-things to preserve).
function buildScheduleThing(url, data) {
  let thing = buildThing(createThing({ url })).setUrl(RDF.type, SCHEMA.Schedule)

  if (data.startDate) thing = thing.setDate(SCHEMA.startDate, fromDateInputValue(data.startDate))
  if (data.endDate) thing = thing.setDate(SCHEMA.endDate, fromDateInputValue(data.endDate))
  if (data.startTime) thing = thing.setTime(SCHEMA.startTime, fromTimeInputValue(data.startTime))
  if (data.endTime) thing = thing.setTime(SCHEMA.endTime, fromTimeInputValue(data.endTime))
  if ((data.repeatFrequency || '').trim())
    thing = thing.setStringNoLocale(SCHEMA.repeatFrequency, data.repeatFrequency.trim())
  if ((data.scheduleTimezone || '').trim())
    thing = thing.setStringNoLocale(SCHEMA.scheduleTimezone, data.scheduleTimezone.trim())
  for (const day of data.byDay || []) {
    thing = thing.addUrl(SCHEMA.byDay, DAY_OF_WEEK[day])
  }
  return thing.build()
}

export async function listSchedules(containerUrl, fetchFn) {
  const containerDataset = await getSolidDataset(containerUrl, { fetch: fetchFn })
  const urls = getContainedResourceUrlAll(containerDataset)

  return Promise.all(
    urls.map(async (url) => {
      try {
        const dataset = await getSolidDataset(url, { fetch: fetchFn })
        const thing = getThing(dataset, url)
        if (!thing) return { url, error: null }
        return thingToSchedule(thing, url)
      } catch (e) {
        return { url, error: e.message || String(e) }
      }
    }),
  )
}

export async function getSchedule(url, fetchFn) {
  const dataset = await getSolidDataset(url, { fetch: fetchFn })
  const thing = getThing(dataset, url)
  if (!thing) throw new Error('Schedule-resource niet gevonden.')
  return thingToSchedule(thing, url)
}

export async function createSchedule(containerUrl, data, fetchFn) {
  const slug = crypto.randomUUID()
  const url = `${containerUrl}${slug}.ttl`
  const dataset = setThing(createSolidDataset(), buildScheduleThing(url, data))
  await overwriteSolidDataset(url, dataset, fetchFn)
  return url
}

export async function updateSchedule(url, data, fetchFn) {
  const dataset = setThing(createSolidDataset(), buildScheduleThing(url, data))
  await overwriteSolidDataset(url, dataset, fetchFn)
}

export async function deleteSchedule(url, fetchFn) {
  await deleteFile(url, { fetch: fetchFn })
}
