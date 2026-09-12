import { availableSlotsMock } from '../data/schedule.mock'

export async function getAvailableSlots() {
  return structuredClone(availableSlotsMock)
}
