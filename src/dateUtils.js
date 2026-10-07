export function toDateInputValue(date) {
  if (!date) return ''
  return date.toISOString().slice(0, 10)
}

export function fromDateInputValue(value) {
  return value ? new Date(`${value}T00:00:00Z`) : null
}

export function toDatetimeInputValue(date) {
  if (!date) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function fromDatetimeInputValue(value) {
  return value ? new Date(value) : null
}

export function toTimeInputValue(time) {
  if (!time) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(time.hour)}:${pad(time.minute)}`
}

export function fromTimeInputValue(value) {
  if (!value) return null
  const [hour, minute] = value.split(':').map(Number)
  return { hour, minute, second: 0 }
}
