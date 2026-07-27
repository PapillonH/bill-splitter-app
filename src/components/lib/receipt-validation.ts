import type { ReceiptItem, ReceiptMetadata } from "./types"

const round = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100

export interface ReceiptCheck {
  lineItemsTotal: number
  expectedTotal: number | null
  warnings: string[]
}

export function checkReceiptTotals(items: ReceiptItem[], metadata?: ReceiptMetadata): ReceiptCheck {
  const lineItemsTotal = round(items.reduce((sum, item) => sum + item.price * item.quantity, 0))
  if (!metadata) return { lineItemsTotal, expectedTotal: null, warnings: [] }

  const warnings: string[] = []
  if (metadata.subtotal !== null && Math.abs(lineItemsTotal - metadata.subtotal) > 0.01) {
    warnings.push("The extracted line items do not add up to the printed subtotal.")
  }

  const parts = [metadata.subtotal, metadata.tax, metadata.tip]
  const expectedTotal = parts.every((part) => part !== null)
    ? round((metadata.subtotal ?? 0) + (metadata.tax ?? 0) + (metadata.tip ?? 0))
    : null
  if (expectedTotal !== null && metadata.total !== null && Math.abs(expectedTotal - metadata.total) > 0.01) {
    warnings.push("The printed subtotal, tax, and tip do not add up to the printed total.")
  }

  return { lineItemsTotal, expectedTotal, warnings }
}
