import { solidDatasetAsTurtle, overwriteFile } from '@inrupt/solid-client'

// saveSolidDatasetAt sends "If-None-Match: *" whenever the dataset has no
// server resource info - which is always true for the "rebuild the whole
// resource from scratch" datasets our CRUD modules build (createSolidDataset()
// + setThing). That header tells the server "only create, fail if this
// already exists", so saving an *update* to an existing resource 412s even
// though we genuinely just want to overwrite it (see e.g. editing a Gallery).
// overwriteFile does a plain, unconditional PUT, so we serialize the
// dataset to Turtle ourselves and use that for every such wholesale-replace
// save, for both create and update.
export async function overwriteSolidDataset(url, dataset, fetchFn) {
  const turtle = await solidDatasetAsTurtle(dataset)
  const slug = url.slice(url.lastIndexOf('/') + 1) || 'resource.ttl'
  const file = new File([turtle], slug, { type: 'text/turtle' })
  await overwriteFile(url, file, { contentType: 'text/turtle', fetch: fetchFn })
}
