import { describe, expect, it } from "vitest"
import { formatCurrency, normalizeCurrencyCode } from "./currency"
import { checkReceiptTotals } from "./receipt-validation"
import type { ReceiptItem, ReceiptMetadata } from "./types"

const item = (price: number, quantity = 1): ReceiptItem => ({
  id: crypto.randomUUID(),
  name: "Receipt item",
  price,
  quantity,
  type: price < 0 ? "discount" : "item",
  assignedTo: [],
})

const metadata = (overrides: Partial<ReceiptMetadata>): ReceiptMetadata => ({
  merchant: "Test Merchant",
  date: "2026-07-27",
  currencyCode: "USD",
  subtotal: 10,
  tax: 1,
  tip: 2,
  total: 13,
  processedAt: "2026-07-27T00:00:00.000Z",
  ...overrides,
})

describe("checkReceiptTotals", () => {
  it("accepts a matching US restaurant receipt", () => {
    expect(checkReceiptTotals([item(5, 2)], metadata({})).warnings).toEqual([])
  })

  it("warns when a European receipt's line items do not match its subtotal", () => {
    const result = checkReceiptTotals(
      [item(12.5), item(2.5)],
      metadata({ currencyCode: "EUR", subtotal: 16, tax: 1.6, tip: 0, total: 17.6 }),
    )
    expect(result.warnings).toContain("The extracted line items do not add up to the printed subtotal.")
  })

  it("warns when printed receipt totals are internally inconsistent", () => {
    const result = checkReceiptTotals(
      [item(1000)],
      metadata({ currencyCode: "JPY", subtotal: 1000, tax: 100, tip: 0, total: 1200 }),
    )
    expect(result.warnings).toContain("The printed subtotal, tax, and tip do not add up to the printed total.")
  })
})

describe("currency formatting", () => {
  it("supports different receipt currencies and falls back safely", () => {
    expect(formatCurrency(12.5, "EUR")).toContain("12.50")
    expect(formatCurrency(1200, "JPY")).toContain("1,200")
    expect(normalizeCurrencyCode("cny")).toBe("CNY")
    expect(normalizeCurrencyCode("not-a-currency")).toBe("USD")
  })
})
