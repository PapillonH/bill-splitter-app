import { mkdirSync, writeFileSync } from "node:fs"
import { buildBillPdf } from "../src/components/lib/bill-export"

async function main() {
  const outputDirectory = "tmp/pdfs"
  mkdirSync(outputDirectory, { recursive: true })

  const document = await buildBillPdf({
    participants: [
      { id: "alice", name: "Alice Chen" },
      { id: "bob", name: "Bob Rivera" },
      { id: "cara", name: "Cara Singh" },
    ],
    items: [
      { id: "pizza", name: "Margherita Pizza", price: 14.5, quantity: 2, type: "item", assignedTo: ["alice", "bob", "cara"] },
      { id: "salad", name: "Garden Salad", price: 9.75, quantity: 1, type: "item", assignedTo: ["alice"] },
      { id: "drinks", name: "Sparkling Water", price: 3.25, quantity: 3, type: "item", assignedTo: ["alice", "bob", "cara"] },
      { id: "coupon", name: "Welcome Coupon", price: -5, quantity: 1, type: "discount", assignedTo: ["alice", "bob", "cara"] },
      { id: "service", name: "Service Charge", price: 4.5, quantity: 1, type: "service", assignedTo: ["alice", "bob", "cara"] },
    ],
    taxRate: 8.25,
    tipRate: 18,
    receiptMetadata: {
      merchant: "Vizzle Test Kitchen",
      date: "2026-07-27",
      currencyCode: "USD",
      subtotal: null,
      tax: null,
      tip: null,
      total: null,
      processedAt: "2026-07-27T12:00:00.000Z",
    },
  })

  writeFileSync(`${outputDirectory}/vizzle-sample.pdf`, Buffer.from(document.output("arraybuffer")))
}

void main()
