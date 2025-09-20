"use client"

import { useState, useMemo } from "react"
import { Button } from "./ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { ScrollArea } from "./ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Avatar, AvatarFallback } from "./ui/avatar"
import { Download, Share2, ChevronDown, ChevronUp } from "lucide-react"
import type { Person, ReceiptItem, ReceiptMetadata } from "./lib/types"
import { format } from "date-fns"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible"

interface BillSummaryProps {
  items: ReceiptItem[]
  participants: Person[]
  taxRate: number
  tipRate: number
  onReset: () => void
  receiptMetadata?: ReceiptMetadata
}

export default function BillSummary({
  items,
  participants,
  taxRate,
  tipRate,
  onReset,
  receiptMetadata,
}: BillSummaryProps) {
  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.price, 0), [items])
  const taxAmount = subtotal * (taxRate / 100)
  const tipAmount = subtotal * (tipRate / 100)
  const total = subtotal + taxAmount + tipAmount

  const personShares = useMemo(() => {
    const shares: Record<string, { subtotal: number; tax: number; tip: number; total: number; items: ReceiptItem[] }> = {}

    // Initialize shares for all participants
    participants.forEach((person) => {
      shares[person.id] = { subtotal: 0, tax: 0, tip: 0, total: 0, items: [] }
    })

    // Calculate each person's share of items
    items.forEach((item) => {
      if (item.assignedTo.length > 0) {
        const sharePerPerson = item.price / item.assignedTo.length
        item.assignedTo.forEach((personId) => {
          if (shares[personId]) {
            shares[personId].subtotal += sharePerPerson
            shares[personId].items.push({...item, price: sharePerPerson})
          }
        })
      }
    })

    // Calculate tax and tip proportionally
    Object.keys(shares).forEach((personId) => {
      const personSubtotal = shares[personId].subtotal
      const proportion = personSubtotal / subtotal || 0
      shares[personId].tax = taxAmount * proportion
      shares[personId].tip = tipAmount * proportion
      shares[personId].total = personSubtotal + shares[personId].tax + shares[personId].tip
    })

    return shares
  }, [items, participants, taxAmount, tipAmount, subtotal])

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }

  // Track expanded state for each person
  const [expandedPersons, setExpandedPersons] = useState<Record<string, boolean>>({})

  // Toggle expand/collapse for a specific person
  const togglePersonExpanded = (personId: string) => {
    setExpandedPersons(prev => ({
      ...prev,
      [personId]: !prev[personId]
    }))
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">Bill Summary</h2>
        <p className="text-muted-foreground mb-4">Here's how much everyone owes</p>
      </div>

      {receiptMetadata?.merchant && (
        <div className="bg-muted p-4 rounded-lg mb-6">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div>
              <span className="font-medium">Merchant:</span> {receiptMetadata.merchant}
            </div>
            {receiptMetadata.date && (
              <div>
                <span className="font-medium">Date:</span> {format(new Date(receiptMetadata.date), 'PPP')}
              </div>
            )}
            {receiptMetadata.total !== null && (
              <div>
                <span className="font-medium">Receipt Total:</span> ${receiptMetadata.total.toFixed(2)}
              </div>
            )}
            <div>
              <span className="font-medium">Calculated Total:</span> ${total.toFixed(2)}
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {participants.map((person) => {
          const share = personShares[person.id]
          const isExpanded = !!expandedPersons[person.id]
          
          return (
            <Card key={person.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>{getInitials(person.name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">{person.name}</CardTitle>
                      <CardDescription>
                        {share.items.length} item{share.items.length !== 1 ? "s" : ""}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="text-xl font-bold">${share.total.toFixed(2)}</div>
                </div>
              </CardHeader>
              
              <Collapsible open={isExpanded} onOpenChange={() => togglePersonExpanded(person.id)}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full flex justify-center items-center py-1">
                    {isExpanded ? (
                      <>
                        <ChevronUp className="h-4 w-4 mr-1" />
                        <span className="text-xs">Hide details</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4 mr-1" />
                        <span className="text-xs">Show details</span>
                      </>
                    )}
                  </Button>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <CardContent>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Items:</span>
                        <span>${share.subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tax ({taxRate}%):</span>
                        <span>${share.tax.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tip ({tipRate}%):</span>
                        <span>${share.tip.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t font-medium">
                        <span>Total:</span>
                        <span>${share.total.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="mt-4">
                      <p className="text-xs font-medium mb-1">Items:</p>
                      <ul className="text-xs space-y-1">
                        {share.items.map((item, index) => (
                          <li key={`${item.id}-${index}`} className="flex justify-between">
                            <span>{item.name}</span>
                            <span>${item.price.toFixed(2)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          )
        })}
      </div>

      <div className="p-4 bg-muted rounded-lg">
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Tax ({taxRate}%):</span>
            <span>${taxAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Tip ({tipRate}%):</span>
            <span>${tipAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between pt-2 border-t font-medium">
            <span>Total:</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="flex justify-center gap-4 mt-6">
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export PDF
        </Button>
        <Button>
          <Share2 className="mr-2 h-4 w-4" />
          Share with Friends
        </Button>
        <Button variant="destructive" onClick={onReset}>
          Reset
        </Button>
      </div>
    </div>
  )
}

