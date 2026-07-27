import type { Person, ReceiptItem, ReceiptMetadata } from "./types"
import { calculateBill } from "./bill-calculations"
import { formatCurrency } from "./currency"
import type { jsPDF as JsPdf } from "jspdf"

export interface BillExportData {
  items: ReceiptItem[]
  participants: Person[]
  taxRate: number
  tipRate: number
  receiptMetadata?: ReceiptMetadata
}

export function createBillShareText(data: BillExportData): string {
  const money = (value: number) => formatCurrency(value, data.receiptMetadata?.currencyCode)
  const { totals, personShares } = calculateBill(
    data.items,
    data.participants,
    data.taxRate,
    data.tipRate,
  )
  const lines = [
    data.receiptMetadata?.merchant ? `Vizzle split - ${data.receiptMetadata.merchant}` : "Vizzle bill split",
    `Total: ${money(totals.total)} (subtotal ${money(totals.subtotal)}, tax ${money(totals.tax)}, tip ${money(totals.tip)})`,
    "",
    ...data.participants.map((person) => {
      const share = personShares[person.id]
      return `${person.name}: ${money(share.total)}`
    }),
  ]
  return lines.join("\n")
}

export async function buildBillPdf(data: BillExportData): Promise<JsPdf> {
  const money = (value: number) => formatCurrency(value, data.receiptMetadata?.currencyCode)
  const { jsPDF } = await import("jspdf")
  const { totals, personShares } = calculateBill(
    data.items,
    data.participants,
    data.taxRate,
    data.tipRate,
  )
  const doc = new jsPDF({ unit: "pt", format: "a4" })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 48
  let y = 54

  const ensureSpace = (height: number) => {
    if (y + height <= pageHeight - margin) return
    doc.addPage()
    y = 54
  }
  const row = (label: string, value: string, bold = false) => {
    ensureSpace(22)
    doc.setFont("helvetica", bold ? "bold" : "normal")
    doc.setFontSize(10)
    doc.text(label, margin, y)
    doc.text(value, pageWidth - margin, y, { align: "right" })
    y += 18
  }

  doc.setTextColor(17, 24, 39)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(24)
  doc.text("Vizzle Bill Split", margin, y)
  y += 28
  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.setTextColor(75, 85, 99)
  if (data.receiptMetadata?.merchant) {
    doc.text(data.receiptMetadata.merchant, margin, y)
    y += 16
  }
  doc.text(`Generated ${new Date().toLocaleString()}`, margin, y)
  y += 28

  doc.setTextColor(17, 24, 39)
  row("Items", money(totals.items))
  if (totals.discounts !== 0) row("Discounts", money(totals.discounts))
  if (totals.serviceCharges !== 0) row("Service charges", money(totals.serviceCharges))
  if (totals.adjustments !== 0) row("Adjustments", money(totals.adjustments))
  row("Subtotal", money(totals.subtotal), true)
  row(`Tax (${data.taxRate}%)`, money(totals.tax))
  row(`Tip (${data.tipRate}%)`, money(totals.tip))
  row("Total", money(totals.total), true)
  y += 18

  data.participants.forEach((person) => {
    const share = personShares[person.id]
    ensureSpace(80)
    doc.setFillColor(243, 244, 246)
    doc.roundedRect(margin, y - 15, pageWidth - margin * 2, 34, 5, 5, "F")
    doc.setFont("helvetica", "bold")
    doc.setFontSize(13)
    doc.text(person.name, margin + 10, y + 6)
    doc.text(money(share.total), pageWidth - margin - 10, y + 6, { align: "right" })
    y += 34

    share.items.forEach((item) => {
      const quantity = item.quantity > 1 ? `${item.quantity}x ` : ""
      row(`${quantity}${item.name}`, money(item.lineTotal))
    })
    row("Items and adjustments", money(share.subtotal))
    row("Tax", money(share.tax))
    row("Tip", money(share.tip))
    row(`${person.name}'s total`, money(share.total), true)
    y += 16
  })

  const pageCount = doc.getNumberOfPages()
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(8)
    doc.setTextColor(107, 114, 128)
    doc.text(`Vizzle - Page ${page} of ${pageCount}`, pageWidth / 2, pageHeight - 24, { align: "center" })
  }

  const baseName = data.receiptMetadata?.merchant || "bill-split"
  doc.setProperties({ title: `${baseName} - Vizzle bill split`, creator: "Vizzle" })
  return doc
}

export async function downloadBillPdf(data: BillExportData): Promise<void> {
  const doc = await buildBillPdf(data)
  const baseName = data.receiptMetadata?.merchant || "bill-split"
  const safeName = baseName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
  doc.save(`${safeName || "bill-split"}-vizzle.pdf`)
}
