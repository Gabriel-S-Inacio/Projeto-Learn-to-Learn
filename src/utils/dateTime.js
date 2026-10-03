const timeZone = 'America/Sao_Paulo'

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  timeZone,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})

const shortDateFormatter = new Intl.DateTimeFormat('pt-BR', {
  timeZone,
  day: '2-digit',
  month: 'long',
  year: 'numeric',
})

const timeFormatter = new Intl.DateTimeFormat('pt-BR', {
  timeZone,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

export function formatScheduleDate(value) {
  const label = dateFormatter.format(new Date(value))
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export function formatShortDate(value) {
  return shortDateFormatter.format(new Date(value))
}

export function formatTime(value) {
  return timeFormatter.format(new Date(value))
}

export function scheduleDayKey(value) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(value))
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

export function toSaoPauloIso(localDateTime) {
  return `${localDateTime}:00-03:00`
}

export function canChangeBooking(value) {
  return new Date(value).getTime() >= Date.now() + 24 * 60 * 60 * 1000
}

