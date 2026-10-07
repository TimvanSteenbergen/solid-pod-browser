// A File handed to us via drag-and-drop (as opposed to the file picker
// dialog) can apparently go stale if its bytes aren't read until later -
// e.g. after the user has typed a caption and only then clicks "Opslaan".
// Symptom: the resulting upload fetch just hangs forever, not even
// erroring, because the browser is waiting on a drag-data handle that's
// no longer valid. Reading the file into a plain in-memory copy
// immediately on selection (while the handle is still definitely fresh)
// sidesteps that entirely: everything downstream only ever touches the
// frozen copy, never the original File.
export async function freezeFile(file) {
  if (!file) return file
  try {
    const buffer = await file.arrayBuffer()
    return new File([buffer], file.name, { type: file.type, lastModified: file.lastModified })
  } catch {
    // If reading eagerly somehow fails, fall back to the original file
    // rather than losing the user's selection entirely.
    return file
  }
}
