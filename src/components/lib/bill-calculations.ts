import type { Person, ReceiptEntryType, ReceiptItem } from "./types"

export interface PersonShareItem {
  id: string
  name: string
  type: ReceiptEntryType
  quantity: number
  lineTotal: number
}

export interface PersonShare {
  subtotal: number
  tax: number
  tip: number
  total: number
  items: PersonShareItem[]
}

export interface BillTotals {
  items: number
  discounts: number
  serviceCharges: number
  adjustments: number
  subtotal: number
  tax: number
  tip: number
  total: number
}

export interface BillCalculation {
  totals: BillTotals
  personShares: Record<string, PersonShare>
}

const toCents = (value: number) => Math.round((value + Number.EPSILON) * 100)
const fromCents = (value: number) => value / 100

function splitCents(total: number, recipientIds: string[]): Record<string, number> {
  const result: Record<string, number> = {}
  if (recipientIds.length === 0) return result

  const sign = total < 0 ? -1 : 1
  const absoluteTotal = Math.abs(total)
  const base = Math.floor(absoluteTotal / recipientIds.length)
  let remainder = absoluteTotal % recipientIds.length

  recipientIds.forEach((id) => {
    result[id] = sign * (base + (remainder > 0 ? 1 : 0))
    remainder = Math.max(0, remainder - 1)
  })

  return result
}

function allocateProportionally(
  totalCents: number,
  weights: Record<string, number>,
  participantIds: string[],
): Record<string, number> {
  const allocations = Object.fromEntries(participantIds.map((id) => [id, 0]))
  if (totalCents === 0 || participantIds.length === 0) return allocations

  const positiveWeights = participantIds.map((id) => Math.max(0, weights[id] ?? 0))
  const weightTotal = positiveWeights.reduce((sum, weight) => sum + weight, 0)
  if (weightTotal === 0) return allocations

  const raw = participantIds.map((id, index) => ({
    id,
    exact: (Math.abs(totalCents) * positiveWeights[index]) / weightTotal,
  }))
  let remaining = Math.abs(totalCents)

  raw.forEach(({ id, exact }) => {
    allocations[id] = Math.floor(exact)
    remaining -= allocations[id]
  })

  raw
    .map((entry, index) => ({ ...entry, index, fraction: entry.exact - Math.floor(entry.exact) }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index)
    .slice(0, remaining)
    .forEach(({ id }) => {
      allocations[id] += 1
    })

  if (totalCents < 0) {
    participantIds.forEach((id) => {
      allocations[id] *= -1
    })
  }

  return allocations
}

export function getLineTotal(item: ReceiptItem): number {
  return fromCents(toCents(item.price * item.quantity))
}

export function validateBillItems(items: ReceiptItem[]): string[] {
  const errors: string[] = []
  if (items.length === 0) errors.push("Add at least one bill entry.")
  if (items.some((item) => !item.name.trim())) errors.push("Every entry needs a name.")
  if (items.some((item) => !Number.isFinite(item.price))) errors.push("Every entry needs a valid amount.")
  if (items.some((item) => !Number.isInteger(item.quantity) || item.quantity < 1)) {
    errors.push("Quantities must be whole numbers of 1 or more.")
  }
  if (items.some((item) => item.assignedTo.length === 0)) {
    errors.push("Assign every entry to at least one person.")
  }
  return errors
}

export function calculateBill(
  items: ReceiptItem[],
  participants: Person[],
  taxRate: number,
  tipRate: number,
): BillCalculation {
  const participantIds = participants.map((person) => person.id)
  const personSubtotalCents = Object.fromEntries(participantIds.map((id) => [id, 0]))
  const personItemShares: Record<string, PersonShareItem[]> = Object.fromEntries(
    participantIds.map((id) => [id, []]),
  )

  const categoryCents: Record<ReceiptEntryType, number> = {
    item: 0,
    discount: 0,
    service: 0,
    adjustment: 0,
  }

  items.forEach((item) => {
    const lineCents = toCents(item.price * item.quantity)
    categoryCents[item.type] += lineCents
    const validAssignees = item.assignedTo.filter((id) => id in personSubtotalCents)
    const allocations = splitCents(lineCents, validAssignees)

    validAssignees.forEach((personId) => {
      const allocation = allocations[personId]
      personSubtotalCents[personId] += allocation
      personItemShares[personId].push({
        id: item.id,
        name: item.name,
        type: item.type,
        quantity: item.quantity,
        lineTotal: fromCents(allocation),
      })
    })
  })

  const subtotalCents = Object.values(categoryCents).reduce((sum, amount) => sum + amount, 0)
  const taxCents = Math.round(subtotalCents * (taxRate / 100))
  const tipCents = Math.round(subtotalCents * (tipRate / 100))
  const taxAllocations = allocateProportionally(taxCents, personSubtotalCents, participantIds)
  const tipAllocations = allocateProportionally(tipCents, personSubtotalCents, participantIds)

  const personShares: Record<string, PersonShare> = {}
  participantIds.forEach((id) => {
    const totalCents = personSubtotalCents[id] + taxAllocations[id] + tipAllocations[id]
    personShares[id] = {
      subtotal: fromCents(personSubtotalCents[id]),
      tax: fromCents(taxAllocations[id]),
      tip: fromCents(tipAllocations[id]),
      total: fromCents(totalCents),
      items: personItemShares[id],
    }
  })

  return {
    totals: {
      items: fromCents(categoryCents.item),
      discounts: fromCents(categoryCents.discount),
      serviceCharges: fromCents(categoryCents.service),
      adjustments: fromCents(categoryCents.adjustment),
      subtotal: fromCents(subtotalCents),
      tax: fromCents(taxCents),
      tip: fromCents(tipCents),
      total: fromCents(subtotalCents + taxCents + tipCents),
    },
    personShares,
  }
}
