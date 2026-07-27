"use client"

import { useMemo, useState } from "react"
import { AlertCircle, ChevronDown, Plus, Trash2, Users, X } from "lucide-react"
import { v4 as uuidv4 } from "uuid"
import type { Person, ReceiptEntryType, ReceiptItem, ReceiptMetadata } from "./lib/types"
import { calculateBill, getLineTotal, validateBillItems } from "./lib/bill-calculations"
import { formatCurrency } from "./lib/currency"
import { checkReceiptTotals } from "./lib/receipt-validation"
import { Alert, AlertDescription, AlertTitle } from "./ui/alert"
import { Avatar, AvatarFallback } from "./ui/avatar"
import { Button } from "./ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Checkbox } from "./ui/checkbox"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Slider } from "./ui/slider"

interface ItemAssignmentProps {
  items: ReceiptItem[]
  participants: Person[]
  onAssign: (items: ReceiptItem[]) => void
  onItemsChange: (items: ReceiptItem[]) => void
  onTaxTipChange: (tax: number, tip: number) => void
  onBack: () => void
  taxRate: number
  tipRate: number
  receiptMetadata?: ReceiptMetadata
}

const entryLabels: Record<ReceiptEntryType, string> = {
  item: "Item",
  discount: "Discount",
  service: "Service charge",
  adjustment: "Adjustment",
}

const getInitials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .substring(0, 2)

export default function ItemAssignment({
  items,
  participants,
  onAssign,
  onItemsChange,
  onTaxTipChange,
  onBack,
  taxRate,
  tipRate,
  receiptMetadata,
}: ItemAssignmentProps) {
  const [localItems, setLocalItems] = useState<ReceiptItem[]>(items)
  const [localTaxRate, setLocalTaxRate] = useState(taxRate)
  const [localTipRate, setLocalTipRate] = useState(tipRate)
  const [newItemName, setNewItemName] = useState("")
  const [newItemPrice, setNewItemPrice] = useState("")
  const [newItemQuantity, setNewItemQuantity] = useState("1")
  const [newItemType, setNewItemType] = useState<ReceiptEntryType>("item")
  const [attemptedContinue, setAttemptedContinue] = useState(false)

  const updateItems = (updatedItems: ReceiptItem[]) => {
    setLocalItems(updatedItems)
    onItemsChange(updatedItems)
  }

  const updateItem = (id: string, changes: Partial<ReceiptItem>) => {
    updateItems(localItems.map((item) => (item.id === id ? { ...item, ...changes } : item)))
  }

  const handleTypeChange = (id: string, type: ReceiptEntryType) => {
    const item = localItems.find((entry) => entry.id === id)
    if (!item) return
    const absolutePrice = Math.abs(item.price)
    updateItem(id, { type, price: type === "discount" ? -absolutePrice : absolutePrice })
  }

  const handleAddItem = () => {
    const price = Number.parseFloat(newItemPrice)
    const quantity = Number.parseInt(newItemQuantity, 10)
    if (!newItemName.trim() || !Number.isFinite(price) || price < 0 || quantity < 1) return

    const newItem: ReceiptItem = {
      id: uuidv4(),
      name: newItemName.trim(),
      price: newItemType === "discount" ? -price : price,
      quantity,
      type: newItemType,
      assignedTo: [],
    }
    updateItems([...localItems, newItem])
    setNewItemName("")
    setNewItemPrice("")
    setNewItemQuantity("1")
    setNewItemType("item")
  }

  const handleTaxChange = (value: number[]) => {
    setLocalTaxRate(value[0])
    onTaxTipChange(value[0], localTipRate)
  }

  const handleTipChange = (value: number[]) => {
    setLocalTipRate(value[0])
    onTaxTipChange(localTaxRate, value[0])
  }

  const validationErrors = validateBillItems(localItems)
  const unassignedCount = localItems.filter((item) => item.assignedTo.length === 0).length
  const { totals } = useMemo(
    () => calculateBill(localItems, participants, localTaxRate, localTipRate),
    [localItems, participants, localTaxRate, localTipRate],
  )
  const currencyCode = receiptMetadata?.currencyCode ?? "USD"
  const receiptCheck = useMemo(
    () => checkReceiptTotals(localItems, receiptMetadata),
    [localItems, receiptMetadata],
  )
  const money = (value: number) => formatCurrency(value, currencyCode)

  const handleContinue = () => {
    setAttemptedContinue(true)
    if (validationErrors.length === 0) onAssign(localItems)
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">Assign and Adjust</h2>
        <p className="text-muted-foreground">Review every entry and assign it before continuing.</p>
      </div>

      {receiptMetadata?.merchant && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{receiptMetadata.merchant}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Receipt entries can be corrected below before the split is finalized.
          </CardContent>
        </Card>
      )}

      {receiptCheck.warnings.length > 0 && (
        <Alert className="border-amber-500/70 text-amber-900 dark:text-amber-200">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Check the scanned totals</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-5 mt-1">
              {receiptCheck.warnings.map((warning) => <li key={warning}>{warning}</li>)}
            </ul>
            {receiptMetadata && receiptMetadata.total !== null && (
              <p className="mt-2">
                Extracted entries: {money(receiptCheck.lineItemsTotal)} · Printed total: {money(receiptMetadata.total)}
              </p>
            )}
          </AlertDescription>
        </Alert>
      )}

      {localItems.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="font-medium">No bill entries yet</p>
          <p className="text-sm text-muted-foreground mt-1">Add an item, discount, charge, or adjustment below.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {localItems.map((item) => (
            <Card key={item.id} className={item.assignedTo.length === 0 ? "border-amber-500/70" : ""}>
              <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_110px_100px_44px] gap-3 items-end">
                  <div>
                    <Label htmlFor={`name-${item.id}`}>Description</Label>
                    <Input
                      id={`name-${item.id}`}
                      value={item.name}
                      onChange={(event) => updateItem(item.id, { name: event.target.value })}
                      aria-invalid={!item.name.trim()}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`quantity-${item.id}`}>Quantity</Label>
                    <Input
                      id={`quantity-${item.id}`}
                      type="number"
                      min="1"
                      step="1"
                      value={item.quantity}
                      onChange={(event) => updateItem(item.id, {
                        quantity: Math.max(0, Number.parseInt(event.target.value || "0", 10)),
                      })}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`amount-${item.id}`}>Unit amount</Label>
                    <Input
                      id={`amount-${item.id}`}
                      type="number"
                      min="0"
                      step="0.01"
                      value={Math.abs(item.price)}
                      onChange={(event) => {
                        const amount = Number.parseFloat(event.target.value || "0")
                        updateItem(item.id, { price: item.type === "discount" ? -amount : amount })
                      }}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    aria-label={`Delete ${item.name || "entry"}`}
                    onClick={() => updateItems(localItems.filter((entry) => entry.id !== item.id))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-2 items-center">
                    <select
                      value={item.type}
                      onChange={(event) => handleTypeChange(item.id, event.target.value as ReceiptEntryType)}
                      className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                      aria-label={`Entry type for ${item.name}`}
                    >
                      {Object.entries(entryLabels).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                    <span className="text-sm font-medium">Line total: {money(getLineTotal(item))}</span>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant={item.assignedTo.length === 0 ? "destructive" : "outline"} size="sm">
                        <Users className="mr-2 h-4 w-4" />
                        {item.assignedTo.length === 0 ? "Assign entry" : `${item.assignedTo.length} assigned`}
                        <ChevronDown className="ml-2 h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => updateItem(item.id, {
                        assignedTo: participants.map((person) => person.id),
                      })}>
                        <Users className="mr-2 h-4 w-4" />
                        Everyone
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateItem(item.id, { assignedTo: [] })}>
                        <X className="mr-2 h-4 w-4" />
                        Unassign all
                      </DropdownMenuItem>
                      {participants.map((person) => (
                        <DropdownMenuItem
                          key={person.id}
                          onSelect={(event) => event.preventDefault()}
                          onClick={() => {
                            const assigned = item.assignedTo.includes(person.id)
                            updateItem(item.id, {
                              assignedTo: assigned
                                ? item.assignedTo.filter((id) => id !== person.id)
                                : [...item.assignedTo, person.id],
                            })
                          }}
                        >
                          <Checkbox checked={item.assignedTo.includes(person.id)} className="mr-2" />
                          {person.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {item.assignedTo.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {item.assignedTo.map((personId) => {
                      const person = participants.find((candidate) => candidate.id === personId)
                      return person ? (
                        <span key={personId} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">
                          <Avatar className="h-4 w-4">
                            <AvatarFallback className="text-[9px]">{getInitials(person.name)}</AvatarFallback>
                          </Avatar>
                          {person.name}
                        </span>
                      ) : null
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add bill entry</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-[140px_1fr_90px_110px_auto] gap-3 items-end">
          <div>
            <Label htmlFor="new-entry-type">Type</Label>
            <select
              id="new-entry-type"
              value={newItemType}
              onChange={(event) => setNewItemType(event.target.value as ReceiptEntryType)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {Object.entries(entryLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="new-entry-name">Description</Label>
            <Input id="new-entry-name" value={newItemName} onChange={(event) => setNewItemName(event.target.value)} />
          </div>
          <div>
            <Label htmlFor="new-entry-quantity">Qty</Label>
            <Input id="new-entry-quantity" type="number" min="1" value={newItemQuantity} onChange={(event) => setNewItemQuantity(event.target.value)} />
          </div>
          <div>
            <Label htmlFor="new-entry-price">Unit amount</Label>
            <Input id="new-entry-price" type="number" min="0" step="0.01" value={newItemPrice} onChange={(event) => setNewItemPrice(event.target.value)} />
          </div>
          <Button onClick={handleAddItem} disabled={!newItemName.trim() || !newItemPrice}>
            <Plus className="mr-2 h-4 w-4" /> Add
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-5">
          <div>
            <div className="flex justify-between mb-2">
              <Label>Tax ({localTaxRate}%)</Label>
              <span className="text-sm">{money(totals.tax)}</span>
            </div>
            <Slider value={[localTaxRate]} max={30} step={0.25} onValueChange={handleTaxChange} />
          </div>
          <div>
            <div className="flex justify-between mb-2">
              <Label>Tip ({localTipRate}%)</Label>
              <span className="text-sm">{money(totals.tip)}</span>
            </div>
            <Slider value={[localTipRate]} max={40} step={0.5} onValueChange={handleTipChange} />
          </div>
        </div>

        <div className="rounded-lg bg-muted p-4 text-sm space-y-2">
          <div className="flex justify-between"><span>Items</span><span>{money(totals.items)}</span></div>
          {totals.discounts !== 0 && <div className="flex justify-between text-green-700 dark:text-green-400"><span>Discounts</span><span>{money(totals.discounts)}</span></div>}
          {totals.serviceCharges !== 0 && <div className="flex justify-between"><span>Service charges</span><span>{money(totals.serviceCharges)}</span></div>}
          {totals.adjustments !== 0 && <div className="flex justify-between"><span>Adjustments</span><span>{money(totals.adjustments)}</span></div>}
          <div className="flex justify-between border-t pt-2"><span>Subtotal</span><span>{money(totals.subtotal)}</span></div>
          <div className="flex justify-between"><span>Tax</span><span>{money(totals.tax)}</span></div>
          <div className="flex justify-between"><span>Tip</span><span>{money(totals.tip)}</span></div>
          <div className="flex justify-between border-t pt-2 font-semibold"><span>Total</span><span>{money(totals.total)}</span></div>
        </div>
      </div>

      {(attemptedContinue || unassignedCount > 0) && validationErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Complete the bill before continuing</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-5 mt-1">
              {validationErrors.map((error) => <li key={error}>{error}</li>)}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col-reverse sm:flex-row justify-between gap-3">
        <Button variant="outline" onClick={onBack}>Back to People</Button>
        <Button onClick={handleContinue} disabled={validationErrors.length > 0} size="lg">
          Continue to Summary
        </Button>
      </div>
    </div>
  )
}
