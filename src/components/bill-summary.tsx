"use client"

import { useMemo, useState } from "react"
import { ChevronDown, ChevronUp, Download, Pencil, RotateCcw, Share2 } from "lucide-react"
import type { Person, ReceiptItem, ReceiptMetadata } from "./lib/types"
import { calculateBill } from "./lib/bill-calculations"
import { createBillShareText, downloadBillPdf } from "./lib/bill-export"
import { formatCurrency } from "./lib/currency"
import { Avatar, AvatarFallback } from "./ui/avatar"
import { Button } from "./ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible"
import { useToast } from "./ui/use-toast"

interface BillSummaryProps {
  items: ReceiptItem[]
  participants: Person[]
  taxRate: number
  tipRate: number
  onReset: () => void
  onEditItems: () => void
  onEditPeople: () => void
  receiptMetadata?: ReceiptMetadata
}

const getInitials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .substring(0, 2)

export default function BillSummary({
  items,
  participants,
  taxRate,
  tipRate,
  onReset,
  onEditItems,
  onEditPeople,
  receiptMetadata,
}: BillSummaryProps) {
  const [expandedPersons, setExpandedPersons] = useState<Record<string, boolean>>({})
  const [isExporting, setIsExporting] = useState(false)
  const [isSharing, setIsSharing] = useState(false)
  const { toast } = useToast()
  const exportData = { items, participants, taxRate, tipRate, receiptMetadata }
  const { totals, personShares } = useMemo(
    () => calculateBill(items, participants, taxRate, tipRate),
    [items, participants, taxRate, tipRate],
  )
  const money = (value: number) => formatCurrency(value, receiptMetadata?.currencyCode)

  const handleExport = async () => {
    setIsExporting(true)
    try {
      await downloadBillPdf(exportData)
      toast({ title: "PDF downloaded", description: "Your itemized split is ready." })
    } catch (error) {
      console.error("PDF export failed:", error)
      toast({ title: "Could not export PDF", description: "Please try again.", variant: "destructive" })
    } finally {
      setIsExporting(false)
    }
  }

  const handleShare = async () => {
    setIsSharing(true)
    const text = createBillShareText(exportData)
    try {
      if (navigator.share) {
        await navigator.share({ title: "Vizzle bill split", text })
        toast({ title: "Bill shared" })
      } else {
        await navigator.clipboard.writeText(text)
        toast({ title: "Summary copied", description: "Paste it into your group chat." })
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return
      try {
        await navigator.clipboard.writeText(text)
        toast({ title: "Summary copied", description: "Paste it into your group chat." })
      } catch {
        toast({ title: "Could not share", description: "Clipboard access was unavailable.", variant: "destructive" })
      }
    } finally {
      setIsSharing(false)
    }
  }

  if (participants.length === 0 || items.length === 0) {
    return (
      <div className="py-12 text-center space-y-4">
        <p className="font-medium">There is no completed bill to summarize.</p>
        <Button onClick={onEditItems}>Return to bill entries</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">Bill Summary</h2>
        <p className="text-muted-foreground">Every cent has been allocated across the group.</p>
      </div>

      {receiptMetadata?.merchant && (
        <div className="rounded-lg bg-muted p-4 text-sm">
          <span className="font-medium">{receiptMetadata.merchant}</span>
          {receiptMetadata.date && <span className="text-muted-foreground"> - {receiptMetadata.date}</span>}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {participants.map((person) => {
          const share = personShares[person.id]
          const isExpanded = Boolean(expandedPersons[person.id])
          return (
            <Card key={person.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback>{getInitials(person.name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <CardTitle className="text-lg truncate">{person.name}</CardTitle>
                      <CardDescription>{share.items.length} allocated entries</CardDescription>
                    </div>
                  </div>
                  <div className="text-xl font-bold whitespace-nowrap">{money(share.total)}</div>
                </div>
              </CardHeader>
              <Collapsible
                open={isExpanded}
                onOpenChange={() => setExpandedPersons((current) => ({
                  ...current,
                  [person.id]: !current[person.id],
                }))}
              >
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full">
                    {isExpanded ? <ChevronUp className="mr-1 h-4 w-4" /> : <ChevronDown className="mr-1 h-4 w-4" />}
                    {isExpanded ? "Hide details" : "Show details"}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-4">
                    <ul className="text-sm space-y-1">
                      {share.items.map((item, index) => (
                        <li key={`${item.id}-${index}`} className="flex justify-between gap-4">
                          <span>{item.quantity > 1 ? `${item.quantity}x ` : ""}{item.name}</span>
                          <span>{money(item.lineTotal)}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="border-t pt-3 text-sm space-y-1">
                      <div className="flex justify-between"><span>Entries</span><span>{money(share.subtotal)}</span></div>
                      <div className="flex justify-between"><span>Tax</span><span>{money(share.tax)}</span></div>
                      <div className="flex justify-between"><span>Tip</span><span>{money(share.tip)}</span></div>
                      <div className="flex justify-between font-semibold pt-1"><span>Total</span><span>{money(share.total)}</span></div>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          )
        })}
      </div>

      <div className="rounded-lg bg-muted p-4 text-sm space-y-2">
        <div className="flex justify-between"><span>Items</span><span>{money(totals.items)}</span></div>
        {totals.discounts !== 0 && <div className="flex justify-between text-green-700 dark:text-green-400"><span>Discounts</span><span>{money(totals.discounts)}</span></div>}
        {totals.serviceCharges !== 0 && <div className="flex justify-between"><span>Service charges</span><span>{money(totals.serviceCharges)}</span></div>}
        {totals.adjustments !== 0 && <div className="flex justify-between"><span>Adjustments</span><span>{money(totals.adjustments)}</span></div>}
        <div className="flex justify-between border-t pt-2"><span>Subtotal</span><span>{money(totals.subtotal)}</span></div>
        <div className="flex justify-between"><span>Tax ({taxRate}%)</span><span>{money(totals.tax)}</span></div>
        <div className="flex justify-between"><span>Tip ({tipRate}%)</span><span>{money(totals.tip)}</span></div>
        <div className="flex justify-between border-t pt-2 text-base font-semibold"><span>Total</span><span>{money(totals.total)}</span></div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Button variant="outline" onClick={onEditItems}><Pencil className="mr-2 h-4 w-4" />Edit bill</Button>
        <Button variant="outline" onClick={onEditPeople}><Pencil className="mr-2 h-4 w-4" />Edit people</Button>
        <Button variant="outline" onClick={handleExport} disabled={isExporting}>
          <Download className="mr-2 h-4 w-4" />{isExporting ? "Creating PDF..." : "Export PDF"}
        </Button>
        <Button onClick={handleShare} disabled={isSharing}>
          <Share2 className="mr-2 h-4 w-4" />{isSharing ? "Sharing..." : "Share with Friends"}
        </Button>
      </div>
      <Button variant="destructive" onClick={onReset} className="w-full sm:w-auto">
        <RotateCcw className="mr-2 h-4 w-4" />Start a new bill
      </Button>
    </div>
  )
}
