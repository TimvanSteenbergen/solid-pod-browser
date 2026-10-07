import {
  getSolidDataset,
  getThing,
  getThingAll,
  getUrl,
  getUrlAll,
  setThing,
  saveSolidDatasetAt,
  createThing,
  buildThing,
  createContainerAt,
} from '@inrupt/solid-client'
import { RDF, SOLID, SCHEMA } from './vocab'

function findRegistration(typeIndexDataset, forClass) {
  return getThingAll(typeIndexDataset).find((thing) => {
    const types = getUrlAll(thing, RDF.type)
    const classes = getUrlAll(thing, SOLID.forClass)
    return types.includes(SOLID.TypeRegistration) && classes.includes(forClass)
  })
}

// Finds (or creates) the Solid type index registration that declares where
// instances of `forClass` live in this pod, per the Solid type-index spec.
export async function ensureTypeRegistration(webId, podRootUrl, forClass, containerName, fetchFn) {
  const profileDataset = await getSolidDataset(webId, { fetch: fetchFn })
  const profileThing = getThing(profileDataset, webId)
  if (!profileThing) {
    throw new Error('Kon je WebID-profiel niet lezen.')
  }

  const privateIndex = getUrl(profileThing, SOLID.privateTypeIndex)
  const publicIndex = getUrl(profileThing, SOLID.publicTypeIndex)
  const typeIndexUrl = privateIndex || publicIndex
  if (!typeIndexUrl) {
    throw new Error(
      'Je profiel verwijst naar geen solid:privateTypeIndex of solid:publicTypeIndex. ' +
        `Kan ${forClass} niet registreren zonder type index.`,
    )
  }

  const typeIndexDataset = await getSolidDataset(typeIndexUrl, { fetch: fetchFn })
  const existing = findRegistration(typeIndexDataset, forClass)
  if (existing) {
    const container = getUrl(existing, SOLID.instanceContainer)
    const instance = getUrl(existing, SOLID.instance)
    if (container) return { containerUrl: container, created: false, typeIndexUrl }
    if (instance) return { containerUrl: instance, created: false, typeIndexUrl }
    throw new Error(`Bestaande registratie voor ${forClass} heeft geen locatie.`)
  }

  const containerUrl = new URL(containerName, podRootUrl).toString()
  try {
    await createContainerAt(containerUrl, { fetch: fetchFn })
  } catch (e) {
    // 409/412: container already exists - fine, reuse it.
    if (!/409|412/.test(String(e.statusCode || e.message))) throw e
  }

  const registration = buildThing(createThing({ name: `registration-${Date.now()}` }))
    .addUrl(RDF.type, SOLID.TypeRegistration)
    .addUrl(SOLID.forClass, forClass)
    .addUrl(SOLID.instanceContainer, containerUrl)
    .build()

  const updatedTypeIndex = setThing(typeIndexDataset, registration)
  await saveSolidDatasetAt(typeIndexUrl, updatedTypeIndex, { fetch: fetchFn })

  return { containerUrl, created: true, typeIndexUrl }
}

export function ensurePersonRegistration(webId, podRootUrl, fetchFn) {
  return ensureTypeRegistration(webId, podRootUrl, SCHEMA.Person, 'people/', fetchFn)
}

export function ensurePlaceRegistration(webId, podRootUrl, fetchFn) {
  return ensureTypeRegistration(webId, podRootUrl, SCHEMA.Place, 'locations/', fetchFn)
}

export function ensureEventRegistration(webId, podRootUrl, fetchFn) {
  return ensureTypeRegistration(webId, podRootUrl, SCHEMA.Event, 'events/', fetchFn)
}

export function ensureScheduleRegistration(webId, podRootUrl, fetchFn) {
  return ensureTypeRegistration(webId, podRootUrl, SCHEMA.Schedule, 'schedules/', fetchFn)
}

export function ensureImageGalleryRegistration(webId, podRootUrl, fetchFn) {
  return ensureTypeRegistration(webId, podRootUrl, SCHEMA.ImageGallery, 'galleries/', fetchFn)
}

export function ensureImageObjectRegistration(webId, podRootUrl, fetchFn) {
  return ensureTypeRegistration(webId, podRootUrl, SCHEMA.ImageObject, 'images/', fetchFn)
}

export function ensureImageObjectSnapshotRegistration(webId, podRootUrl, fetchFn) {
  return ensureTypeRegistration(
    webId,
    podRootUrl,
    SCHEMA.ImageObjectSnapshot,
    'image-snapshots/',
    fetchFn,
  )
}

export function ensureOrganizationRegistration(webId, podRootUrl, fetchFn) {
  return ensureTypeRegistration(webId, podRootUrl, SCHEMA.Organization, 'organizations/', fetchFn)
}

export function ensureOrganizationRoleRegistration(webId, podRootUrl, fetchFn) {
  return ensureTypeRegistration(
    webId,
    podRootUrl,
    SCHEMA.OrganizationRole,
    'organization-roles/',
    fetchFn,
  )
}

export function ensureEmployeeRoleRegistration(webId, podRootUrl, fetchFn) {
  return ensureTypeRegistration(webId, podRootUrl, SCHEMA.EmployeeRole, 'employee-roles/', fetchFn)
}

export function ensureSchoolRegistration(webId, podRootUrl, fetchFn) {
  return ensureTypeRegistration(webId, podRootUrl, SCHEMA.School, 'schools/', fetchFn)
}

export function ensureCertificationRegistration(webId, podRootUrl, fetchFn) {
  return ensureTypeRegistration(webId, podRootUrl, SCHEMA.Certification, 'certifications/', fetchFn)
}
