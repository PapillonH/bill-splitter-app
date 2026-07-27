import { describe, expect, it } from "vitest"
import { calculateBill, validateBillItems } from "./bill-calculations"
import { createBillShareText } from "./bill-export"
import type { Person, ReceiptItem } from "./types"

const participants: Person[] = [
  { id: "alice", name: "Alice" },
  { id: "bob", name: "Bob" },
  { id: "cara", name: "Cara" },
]

const entry = (overrides: Partial<ReceiptItem>): ReceiptItem => ({
  id: "entry",
  name: "Entry",
  price: 10,
  quantity: 1,
  type: "item",
  assignedTo: ["alice"],
  ...overrides,
})

describe("calculateBill", () => {
  it("supports quantities, discounts, service charges, and adjustments", () => {
    const items = [
      entry({ id: "pizza", name: "Pizza", price: 12, quantity: 2, assignedTo: ["alice", "bob"] }),
      entry({ id: "discount", name: "Coupon", price: -3, type: "discount", assignedTo: ["alice", "bob"] }),
      entry({ id: "service", name: "Service", price: 2, type: "service", assignedTo: ["alice", "bob"] }),
      entry({ id: "rounding", name: "Rounding", price: -0.01, type: "adjustment", assignedTo: ["alice"] }),
    ]

    const result = calculateBill(items, participants.slice(0, 2), 10, 20)

    expect(result.totals).toEqual({
      items: 24,
      discounts: -3,
      serviceCharges: 2,
      adjustments: -0.01,
      subtotal: 22.99,
      tax: 2.3,
      tip: 4.6,
      total: 29.89,
    })
    expect(result.personShares.alice.total + result.personShares.bob.total).toBe(29.89)
  })

  it("allocates indivisible cents deterministically and exactly", () => {
    const result = calculateBill(
      [entry({ price: 10, assignedTo: ["alice", "bob", "cara"] })],
      participants,
      8.25,
      18,
    )

    const peopleTotal = Object.values(result.personShares).reduce((sum, share) => sum + share.total, 0)
    expect(Math.round(peopleTotal * 100)).toBe(Math.round(result.totals.total * 100))
    expect(result.totals.total).toBe(12.63)
  })

  it("ignores stale participant ids while preserving the full line amount", () => {
    const result = calculateBill(
      [entry({ price: 8, assignedTo: ["alice", "removed"] })],
      participants.slice(0, 2),
      0,
      0,
    )

    expect(result.personShares.alice.subtotal).toBe(8)
    expect(result.personShares.bob.subtotal).toBe(0)
  })

  it("handles a zero-value bill without producing NaN", () => {
    const result = calculateBill([], participants, 10, 15)
    expect(result.totals.total).toBe(0)
    expect(result.personShares.alice.total).toBe(0)
    expect(Number.isNaN(result.personShares.alice.total)).toBe(false)
  })
})

describe("validateBillItems", () => {
  it("reports invalid and unassigned entries", () => {
    expect(validateBillItems([entry({ name: "", quantity: 0, assignedTo: [] })])).toEqual([
      "Every entry needs a name.",
      "Quantities must be whole numbers of 1 or more.",
      "Assign every entry to at least one person.",
    ])
  })
})

describe("createBillShareText", () => {
  it("creates a compact per-person summary for native sharing or clipboard copy", () => {
    const text = createBillShareText({
      items: [entry({ price: 10, assignedTo: ["alice", "bob"] })],
      participants: participants.slice(0, 2),
      taxRate: 10,
      tipRate: 20,
    })

    expect(text).toContain("Total: $13.00")
    expect(text).toContain("Alice: $6.50")
    expect(text).toContain("Bob: $6.50")
  })
})
