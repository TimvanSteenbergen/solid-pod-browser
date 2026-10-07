import {
  getSolidDataset,
  getThing,
  setThing,
  getUrl,
  getInteger,
  getDecimal,
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

// schema:EmployeeRole is the employment-specific subtype of
// OrganizationRole. Per schema.org's own examples it reuses "employee"
// (not "member") to point at the Person, and "worksFor" (not "memberOf")
// to point at the Organization, plus salary fields.

function thingToEmployeeRole(thing, url) {
  return {
    url,
    roleName: getStringNoLocale(thing, SCHEMA.roleName) || '',
    startDate: toDateInputValue(getDate(thing, SCHEMA.startDate)),
    endDate: toDateInputValue(getDate(thing, SCHEMA.endDate)),
    numberedPosition: getInteger(thing, SCHEMA.numberedPosition) ?? '',
    employeeUrl: getUrl(thing, SCHEMA.employee) || '',
    worksForUrl: getUrl(thing, SCHEMA.worksFor) || '',
    baseSalary: getDecimal(thing, SCHEMA.baseSalary) ?? '',
    salaryCurrency: getStringNoLocale(thing, SCHEMA.salaryCurrency) || '',
  }
}

function buildEmployeeRoleThing(url, data) {
  let thing = buildThing(createThing({ url })).setUrl(RDF.type, SCHEMA.EmployeeRole)

  if ((data.roleName || '').trim()) thing = thing.setStringNoLocale(SCHEMA.roleName, data.roleName.trim())
  if (data.startDate) thing = thing.setDate(SCHEMA.startDate, fromDateInputValue(data.startDate))
  if (data.endDate) thing = thing.setDate(SCHEMA.endDate, fromDateInputValue(data.endDate))
  if (data.numberedPosition !== '' && data.numberedPosition != null)
    thing = thing.setInteger(SCHEMA.numberedPosition, Number(data.numberedPosition))
  if (data.employeeUrl) thing = thing.setUrl(SCHEMA.employee, data.employeeUrl)
  if (data.worksForUrl) thing = thing.setUrl(SCHEMA.worksFor, data.worksForUrl)
  if (data.baseSalary !== '' && data.baseSalary != null)
    thing = thing.setDecimal(SCHEMA.baseSalary, Number(data.baseSalary))
  if ((data.salaryCurrency || '').trim())
    thing = thing.setStringNoLocale(SCHEMA.salaryCurrency, data.salaryCurrency.trim())

  return thing.build()
}

export async function listEmployeeRoles(containerUrl, fetchFn) {
  const containerDataset = await getSolidDataset(containerUrl, { fetch: fetchFn })
  const urls = getContainedResourceUrlAll(containerDataset)

  return Promise.all(
    urls.map(async (url) => {
      try {
        const dataset = await getSolidDataset(url, { fetch: fetchFn })
        const thing = getThing(dataset, url)
        if (!thing) return { url, roleName: '(leeg)', error: null }
        return thingToEmployeeRole(thing, url)
      } catch (e) {
        return { url, roleName: '(fout)', error: e.message || String(e) }
      }
    }),
  )
}

export async function getEmployeeRole(url, fetchFn) {
  const dataset = await getSolidDataset(url, { fetch: fetchFn })
  const thing = getThing(dataset, url)
  if (!thing) throw new Error('EmployeeRole-resource niet gevonden.')
  return thingToEmployeeRole(thing, url)
}

export async function createEmployeeRole(containerUrl, data, fetchFn) {
  const slug = crypto.randomUUID()
  const url = `${containerUrl}${slug}.ttl`
  const dataset = setThing(createSolidDataset(), buildEmployeeRoleThing(url, data))
  await overwriteSolidDataset(url, dataset, fetchFn)
  return url
}

export async function updateEmployeeRole(url, data, fetchFn) {
  const dataset = setThing(createSolidDataset(), buildEmployeeRoleThing(url, data))
  await overwriteSolidDataset(url, dataset, fetchFn)
}

export async function deleteEmployeeRole(url, fetchFn) {
  await deleteFile(url, { fetch: fetchFn })
}
