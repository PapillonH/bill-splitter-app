import { z } from "zod"
import type { Person, ReceiptItem, ReceiptMetadata } from "./types"

export const BILL_DRAFT_KEY = "vizzle.bill-draft.v1"
export const BILL_HISTORY_KEY = "vizzle.bill-history.v1"
export const MAX_BILL_HISTORY = 10

const personSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
})

const receiptItemSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  price: z.number().finite(),
  quantity: z.number().int().min(1),
  type: z.enum(["item", "discount", "service", "adjustment"]),
  assignedTo: z.array(z.string()),
  confidence: z.number().min(0).max(1).optional(),
  originalText: z.string().optional(),
})

const receiptMetadataSchema = z.object({
  merchant: z.string().nullable(),
  date: z.string().nullable(),
  currencyCode: z.string(),
  subtotal: z.number().finite().nullable(),
  tax: z.number().finite().nullable(),
  tip: z.number().finite().nullable(),
  total: z.number().finite().nullable(),
  processedAt: z.string(),
  originalFilename: z.string().optional(),
})

export const billSnapshotSchema = z.object({
  version: z.literal(1),
  activeTab: z.enum(["upload", "participants", "assign", "summary"]),
  receiptItems: z.array(receiptItemSchema),
  participants: z.array(personSchema),
  taxRate: z.number().finite().min(0),
  tipRate: z.number().finite().min(0),
  receiptUploaded: z.boolean(),
  receiptMetadata: receiptMetadataSchema.optional(),
  updatedAt: z.string(),
})

const savedBillSchema = billSnapshotSchema.extend({
  id: z.string().min(1),
  title: z.string().min(1),
})

const billHistorySchema = z.array(savedBillSchema)

export interface BillSnapshot {
  version: 1
  activeTab: "upload" | "participants" | "assign" | "summary"
  receiptItems: ReceiptItem[]
  participants: Person[]
  taxRate: number
  tipRate: number
  receiptUploaded: boolean
  receiptMetadata?: ReceiptMetadata
  updatedAt: string
}

export interface SavedBill extends BillSnapshot {
  id: string
  title: string
}

export function parseBillSnapshot(value: string | null): BillSnapshot | null {
  if (!value) return null
  try {
    const parsed = billSnapshotSchema.safeParse(JSON.parse(value))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

export function parseBillHistory(value: string | null): SavedBill[] {
  if (!value) return []
  try {
    const parsed = billHistorySchema.safeParse(JSON.parse(value))
    return parsed.success ? parsed.data.slice(0, MAX_BILL_HISTORY) : []
  } catch {
    return []
  }
}

export function addBillToHistory(history: SavedBill[], bill: SavedBill): SavedBill[] {
  return [bill, ...history.filter((entry) => entry.id !== bill.id)].slice(0, MAX_BILL_HISTORY)
}
