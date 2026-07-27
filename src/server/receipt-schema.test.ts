import { describe, expect, it } from "vitest"
import { normalizeExtractedReceipt } from "./receipt-schema"

const receipt = {
  merchant: "Café Europa",
  date: "2026-07-27",
  currencyCode: "eur",
  items: [
    { name: "Coffee", price: 3.5, quantity: 2, type: "item", confidence: 0.98 },
    { name: "Coupon", price: 1, quantity: 1, type: "discount", confidence: 0.9 },
  ],
  subtotal: 6,
  tax: 0.6,
  tip: null,
  total: 6.6,
}

describe("receipt response validation", () => {
  it("normalizes currencies and discount signs", () => {
    const parsed = normalizeExtractedReceipt(receipt)
    expect(parsed.currencyCode).toBe("EUR")
    expect(parsed.items[1].price).toBe(-1)
  })

  it("rejects malformed receipt data before it reaches the UI", () => {
    expect(() => normalizeExtractedReceipt({
      ...receipt,
      total: "6,60",
      items: [{ name: "", price: Number.NaN, quantity: 0, type: "unknown", confidence: 2 }],
    })).toThrow()
  })
})
