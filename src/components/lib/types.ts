export interface Person {
  id: string
  name: string
}

export type ReceiptEntryType = "item" | "discount" | "service" | "adjustment"

export interface ReceiptItem {
  id: string
  name: string
  price: number // Unit amount; discounts are stored as negative values.
  quantity: number
  type: ReceiptEntryType
  assignedTo: string[] // Array of person IDs
  confidence?: number // Confidence score from OCR (0-1)
  originalText?: string // Raw text as extracted from OCR
}

export interface ReceiptMetadata {
  merchant: string | null
  date: string | null // ISO format date
  currencyCode: string // ISO 4217 code, such as USD, EUR, or JPY
  subtotal: number | null
  tax: number | null
  tip: number | null
  total: number | null
  processedAt: string // ISO timestamp when processed
  originalFilename?: string
}
