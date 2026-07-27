import { describe, expect, it } from "vitest"
import {
  addBillToHistory,
  MAX_BILL_HISTORY,
  parseBillHistory,
  parseBillSnapshot,
  type SavedBill,
} from "./bill-storage"

const savedBill = (id: string): SavedBill => ({
  version: 1,
  id,
  title: `Bill ${id}`,
  activeTab: "summary",
  receiptItems: [{
    id: "item",
    name: "Lunch",
    price: 12.5,
    quantity: 1,
    type: "item",
    assignedTo: ["person"],
  }],
  participants: [{ id: "person", name: "Alex" }],
  taxRate: 8,
  tipRate: 15,
  receiptUploaded: true,
  updatedAt: "2026-07-27T12:00:00.000Z",
})

describe("bill browser storage", () => {
  it("restores a valid unfinished bill", () => {
    const draft = { ...savedBill("draft"), activeTab: "assign" as const }
    const snapshot = JSON.parse(JSON.stringify(draft))
    delete snapshot.id
    delete snapshot.title
    expect(parseBillSnapshot(JSON.stringify(snapshot))?.receiptItems[0].name).toBe("Lunch")
  })

  it("ignores corrupt or incompatible saved data", () => {
    expect(parseBillSnapshot("{bad json")).toBeNull()
    expect(parseBillSnapshot(JSON.stringify({ version: 99 }))).toBeNull()
    expect(parseBillHistory(JSON.stringify([{ broken: true }]))).toEqual([])
  })

  it("keeps newest bills first, replaces matching ids, and caps history", () => {
    let history: SavedBill[] = []
    for (let index = 0; index < MAX_BILL_HISTORY + 3; index += 1) {
      history = addBillToHistory(history, savedBill(String(index)))
    }
    expect(history).toHaveLength(MAX_BILL_HISTORY)
    expect(history[0].id).toBe(String(MAX_BILL_HISTORY + 2))

    history = addBillToHistory(history, { ...history[5], title: "Updated bill" })
    expect(history[0].title).toBe("Updated bill")
    expect(new Set(history.map((bill) => bill.id)).size).toBe(history.length)
  })
})
