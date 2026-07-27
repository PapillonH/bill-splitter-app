"use client"

import { Clock3, RotateCcw, Trash2 } from "lucide-react"
import type { SavedBill } from "./lib/bill-storage"
import { formatCurrency } from "./lib/currency"
import { Button } from "./ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"

interface SavedBillsProps {
  history: SavedBill[]
  hasDraft: boolean
  onRestore: (bill: SavedBill) => void
  onDelete: (id: string) => void
  onClearSavedData: () => void
}

export default function SavedBills({
  history,
  hasDraft,
  onRestore,
  onDelete,
  onClearSavedData,
}: SavedBillsProps) {
  if (history.length === 0 && !hasDraft) return null

  return (
    <Card className="mt-6">
      <CardHeader className="flex-col items-start sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <CardTitle className="text-base">Saved in this browser</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Saved bills stay on this device only.</p>
        </div>
        <Button variant="ghost" size="sm" className="w-full sm:w-auto text-destructive" onClick={onClearSavedData}>
          <Trash2 className="mr-2 h-4 w-4" />
          Clear saved data
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">Your unfinished bill is being saved automatically.</p>
        ) : history.map((bill) => {
          const total = bill.receiptMetadata?.total
          return (
            <div key={bill.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border p-3">
              <div className="min-w-0">
                <p className="font-medium truncate">{bill.title}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <Clock3 className="h-3 w-3" />
                  {new Date(bill.updatedAt).toLocaleString()}
                  {total !== null && total !== undefined
                    ? ` · ${formatCurrency(total, bill.receiptMetadata?.currencyCode)}`
                    : ""}
                </p>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button className="flex-1 sm:flex-none" variant="outline" size="sm" onClick={() => onRestore(bill)}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Restore
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive"
                  aria-label={`Delete ${bill.title}`}
                  onClick={() => onDelete(bill.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
