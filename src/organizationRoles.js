import {
  getSolidDataset,
  getThing,
  setThing,
  getUrl,
  getInteger,
  getContainedResourceUrlAll,
  createSolidDataset,
  deleteFile,
  createThing,
  buildThing,
  getStringNoLocale,
  getDate,
} from '@inrupt/solid-client'
import { RDF, SCHEMA } from './vocab'
import { toDateInputValue, fromDateInputValue } from './dateUtils'
import { overwriteSolidDataset } from './saveDataset'

// schema:OrganizationRole is the n-ary "role" pattern: instead of
// Organization.member pointing straight at a Person, it points at one of
// these, which in turn points at the Person (schema:member) and the
// Organization (schema:memberOf) plus roleName/period/position.

function thingToOrganizationRole(thing, url) {
  return {
    url,
    roleName: getStringNoLocale(thing, SCHEMA.roleName) || '',
    startDate: toDateInputValue(getDate(thing, SCHEMA.startDate)),
    endDate: toDateInputValue(getDate(thing, SCHEMA.endDate)),
    numberedPosition: getInteger(thing, SCHEMA.numberedPosition) ?? '',
    memberUrl: getUrl(thing, SCHEMA.member) || '',
    memberOfUrl: getUrl(thing, SCHEMA.memberOf) || '',
  }
}

function buildOrganizationRoleThing(url, data) {
  let thing = buildThing(createThing({ url })).setUrl(RDF.type, SCHEMA.OrganizationRole)

  if ((data.roleName || '').trim()) thing = thing.setStringNoLocale(SCHEMA.roleName, data.roleName.trim())
  if (data.startDate) thing = thing.setDate(SCHEMA.startDate, fromDateInputValue(data.startDate))
  if (data.endDate) thing = thing.setDate(SCHEMA.endDate, fromDateInputValue(data.endDate))
  if (data.numberedPosition !== '' && data.numberedPosition != null)
    thing = thing.setInteger(SCHEMA.numberedPosition, Number(data.numberedPosition))
  if (data.memberUrl) thing = thing.setUrl(SCHEMA.member, data.memberUrl)
  if (data.memberOfUrl) thing = thing.setUrl(SCHEMA.memberOf, data.memberOfUrl)

  return thing.build()
}

export async function listOrganizationRoles(containerUrl, fetchFn) {
  const containerDataset = await getSolidDataset(containerUrl, { fetch: fetchFn })
  const urls = getContainedResourceUrlAll(containerDataset)

  return Promise.all(
    urls.map(async (url) => {
      try {
        const dataset = await getSolidDataset(url, { fetch: fetchFn })
        const thing = getThing(dataset, url)
        if (!thing) return { url, roleName: '(leeg)', error: null }
        return thingToOrganizationRole(thing, url)
      } catch (e) {
        return { url, roleName: '(fout)', error: e.message || String(e) }
      }
    }),
  )
}

export async function getOrganizationRole(url, fetchFn) {
  const dataset = await getSolidDataset(url, { fetch: fetchFn })
  const thing = getThing(dataset, url)
  if (!thing) throw new Error('OrganizationRole-resource niet gevonden.')
  return thingToOrganizationRole(thing, url)
}

export async function createOrganizationRole(containerUrl, data, fetchFn) {
  const slug = crypto.randomUUID()
  const url = `${containerUrl}${slug}.ttl`
  const dataset = setThing(createSolidDataset(), buildOrganizationRoleThing(url, data))
  await overwriteSolidDataset(url, dataset, fetchFn)
  return url
}

export async function updateOrganizationRole(url, data, fetchFn) {
  const dataset = setThing(createSolidDataset(), buildOrganizationRoleThing(url, data))
  await overwriteSolidDataset(url, dataset, fetchFn)
}

export async function deleteOrganizationRole(url, fetchFn) {
  await deleteFile(url, { fetch: fetchFn })
}
