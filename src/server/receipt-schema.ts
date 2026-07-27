import { z } from "zod"

export const receiptResponseJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["merchant", "date", "currencyCode", "items", "subtotal", "tax", "tip", "total"],
  properties: {
    merchant: { type: ["string", "null"] },
    date: { type: ["string", "null"], description: "Receipt date as YYYY-MM-DD when readable" },
    currencyCode: {
      type: ["string", "null"],
      description: "ISO 4217 currency code inferred from the receipt",
    },
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "price", "quantity", "type", "confidence"],
        properties: {
          name: { type: "string" },
          price: { type: "number" },
          quantity: { type: "integer" },
          type: { type: "string", enum: ["item", "discount", "service", "adjustment"] },
          confidence: { type: "number" },
        },
      },
    },
    subtotal: { type: ["number", "null"] },
    tax: { type: ["number", "null"] },
    tip: { type: ["number", "null"] },
    total: { type: ["number", "null"] },
  },
} as const

const nullableAmount = z.number().finite().nullable()

export const extractedReceiptSchema = z.object({
  merchant: z.string().trim().min(1).max(200).nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  currencyCode: z.string().regex(/^[A-Za-z]{3}$/).nullable(),
  items: z.array(z.object({
    name: z.string().trim().min(1).max(200),
    price: z.number().finite(),
    quantity: z.number().int().min(1).max(999),
    type: z.enum(["item", "discount", "service", "adjustment"]),
    confidence: z.number().min(0).max(1),
  }).strict()).min(1).max(300),
  subtotal: nullableAmount,
  tax: nullableAmount,
  tip: nullableAmount,
  total: nullableAmount,
}).strict()

export type ExtractedReceipt = z.infer<typeof extractedReceiptSchema>

export function normalizeExtractedReceipt(value: unknown): ExtractedReceipt {
  const receipt = extractedReceiptSchema.parse(value)
  return {
    ...receipt,
    currencyCode: receipt.currencyCode?.toUpperCase() ?? "USD",
    items: receipt.items.map((item) => ({
      ...item,
      price: item.type === "discount" ? -Math.abs(item.price) : item.price,
    })),
  }
}
