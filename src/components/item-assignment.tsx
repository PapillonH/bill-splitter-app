"use client"

import { useState } from "react"
import { Button } from "../components/ui/button"
import { Checkbox } from "../components/ui/checkbox"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { Slider } from "../components/ui/slider"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../components/ui/dropdown-menu"
import { ScrollArea } from "../components/ui/scroll-area"
import { Avatar, AvatarFallback } from "../components/ui/avatar"
import { ChevronDown, Plus, Trash2, Users, X, AlertCircle } from "lucide-react"
import type { Person, ReceiptItem, ReceiptMetadata } from "./lib/types"
import { v4 as uuidv4 } from "uuid"
import React from "react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip"
import { format } from "date-fns"
import { Badge } from "./ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"

interface ItemAssignmentProps {
  items: ReceiptItem[]
  participants: Person[]
  onAssign: (items: ReceiptItem[]) => void
  onRemoveItem: (id: string) => void
  onTaxTipChange: (tax: number, tip: number) => void
  taxRate: number
  tipRate: number
  receiptMetadata?: ReceiptMetadata
}

export default function ItemAssignment({
  items,
  participants,
  onAssign,
  onRemoveItem,
  onTaxTipChange,
  taxRate,
  tipRate,
  receiptMetadata,
}: ItemAssignmentProps) {
  const [localItems, setLocalItems] = useState<ReceiptItem[]>(items)
  const [localTaxRate, setLocalTaxRate] = useState(
    receiptMetadata?.tax && receiptMetadata.subtotal 
      ? Math.round((receiptMetadata.tax / receiptMetadata.subtotal) * 100)
      : taxRate
  )
  const [localTipRate, setLocalTipRate] = useState(
    receiptMetadata?.tip && receiptMetadata.subtotal 
      ? Math.round((receiptMetadata.tip / receiptMetadata.subtotal) * 100)
      : tipRate
  )
  const [newItemName, setNewItemName] = useState("")
  const [newItemPrice, setNewItemPrice] = useState("")

  const handleAssignToAll = (itemId: string) => {
    const updatedItems = localItems.map((item) => {
      if (item.id === itemId) {
        return {
          ...item,
          assignedTo: participants.map((p) => p.id),
        }
      }
      return item
    })
    setLocalItems(updatedItems)
  }

  const handleAssignToNone = (itemId: string) => {
    const updatedItems = localItems.map((item) => {
      if (item.id === itemId) {
        return {
          ...item,
          assignedTo: [],
        }
      }
      return item
    })
    setLocalItems(updatedItems)
  }

  const handleToggleAssignment = (itemId: string, personId: string) => {
    const updatedItems = localItems.map((item) => {
      if (item.id === itemId) {
        const isAssigned = item.assignedTo.includes(personId)
        const newAssignedTo = isAssigned
          ? item.assignedTo.filter((id) => id !== personId)
          : [...item.assignedTo, personId]

        return {
          ...item,
          assignedTo: newAssignedTo,
        }
      }
      return item
    })
    setLocalItems(updatedItems)
  }

  const handleAddItem = () => {
    if (newItemName.trim() && !isNaN(Number.parseFloat(newItemPrice))) {
      const newItem: ReceiptItem = {
        id: uuidv4(),
        name: newItemName.trim(),
        price: Number.parseFloat(Number.parseFloat(newItemPrice).toFixed(2)),
        assignedTo: [],
      }
      setLocalItems([...localItems, newItem])
      setNewItemName("")
      setNewItemPrice("")
    }
  }

  const handleUpdateItemName = (id: string, name: string) => {
    const updatedItems = localItems.map((item) => {
      if (item.id === id) {
        return { ...item, name }
      }
      return item
    })
    setLocalItems(updatedItems)
  }

  const handleUpdateItemPrice = (id: string, priceStr: string) => {
    const price = Number.parseFloat(priceStr)
    if (!isNaN(price)) {
      const updatedItems = localItems.map((item) => {
        if (item.id === id) {
          return { ...item, price }
        }
        return item
      })
      setLocalItems(updatedItems)
    }
  }

  const handleTaxChange = (value: number[]) => {
    setLocalTaxRate(value[0])
    onTaxTipChange(value[0], localTipRate)
  }

  const handleTipChange = (value: number[]) => {
    setLocalTipRate(value[0])
    onTaxTipChange(localTaxRate, value[0])
  }

  const handleContinue = () => {
    onAssign(localItems)
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }

  const subtotal = localItems.reduce((sum, item) => sum + item.price, 0)
  const taxAmount = subtotal * (localTaxRate / 100)
  const tipAmount = subtotal * (localTipRate / 100)
  const total = subtotal + taxAmount + tipAmount

  // Helper to render the confidence indicator
  const renderConfidenceIndicator = (confidence: number | undefined) => {
    if (confidence === undefined) return null
    
    let color: string
    let label: string
    
    if (confidence >= 0.9) {
      color = "bg-green-500"
      label = "High"
    } else if (confidence >= 0.7) {
      color = "bg-yellow-500" 
      label = "Medium"
    } else {
      color = "bg-red-500"
      label = "Low"
    }
    
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1">
              <div className={`h-2 w-2 rounded-full ${color}`} />
              {confidence < 0.7 && <AlertCircle className="h-3 w-3 text-red-500" />}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{label} confidence ({Math.round(confidence * 100)}%)</p>
            {confidence < 0.7 && <p className="text-xs text-red-500">Please verify this item</p>}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">Assign Items</h2>
        <p className="text-muted-foreground mb-4">Select who had what and add any missing items</p>
      </div>

      {receiptMetadata && (
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Receipt Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {receiptMetadata.merchant && (
                <div>
                  <span className="font-medium">Merchant:</span> {receiptMetadata.merchant}
                </div>
              )}
              {receiptMetadata.date && (
                <div>
                  <span className="font-medium">Date:</span> {format(new Date(receiptMetadata.date), 'PPP')}
                </div>
              )}
              {receiptMetadata.total !== null && (
                <div>
                  <span className="font-medium">Total:</span> ${receiptMetadata.total.toFixed(2)}
                </div>
              )}
              {receiptMetadata.processedAt && (
                <div>
                  <span className="font-medium">Scanned:</span> {format(new Date(receiptMetadata.processedAt), 'Pp')}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="border rounded-md">
        <ScrollArea className="h-[350px]">
          <Table>
            <TableHeader className="sticky top-0 bg-background">
              <TableRow>
                <TableHead className="w-[200px]">Item</TableHead>
                <TableHead className="w-[100px] text-right">Price</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead className="w-[80px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {localItems.map((item) => (
                <TableRow key={item.id} className={item.confidence && item.confidence < 0.7 ? "bg-red-50/30 dark:bg-red-900/10" : ""}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {renderConfidenceIndicator(item.confidence)}
                      <Input
                        value={item.name}
                        onChange={(e) => handleUpdateItemName(item.id, e.target.value)}
                        className="h-8"
                      />
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Input
                      value={item.price.toString()}
                      onChange={(e) => handleUpdateItemPrice(item.id, e.target.value)}
                      type="number"
                      step="0.01"
                      min="0"
                      className="h-8 text-right"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {item.assignedTo.length > 0 ? (
                        item.assignedTo.map((personId) => {
                          const person = participants.find((p) => p.id === personId)
                          return person ? (
                            <div
                              key={personId}
                              className="inline-flex items-center gap-1 bg-primary/10 text-primary rounded-full px-2 py-1 text-xs"
                            >
                              <Avatar className="h-4 w-4">
                                <AvatarFallback className="text-[10px]">{getInitials(person.name)}</AvatarFallback>
                              </Avatar>
                              {person.name}
                            </div>
                          ) : null
                        })
                      ) : (
                        <span className="text-muted-foreground text-sm">Unassigned</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleAssignToAll(item.id)}>
                            <Users className="mr-2 h-4 w-4" />
                            Assign to everyone
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleAssignToNone(item.id)}>
                            <X className="mr-2 h-4 w-4" />
                            Unassign all
                          </DropdownMenuItem>
                          {participants.map((person) => (
                            <DropdownMenuItem
                              key={person.id}
                              onClick={(e) => {
                                e.preventDefault()
                                handleToggleAssignment(item.id, person.id)
                              }}
                            >
                              <Checkbox checked={item.assignedTo.includes(person.id)} className="mr-2 h-4 w-4" />
                              {person.name}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          onRemoveItem(item.id)
                          setLocalItems(localItems.filter(i => i.id !== item.id))
                        }}
                        className="h-8 w-8 text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>

      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Label htmlFor="item-name">Item Name</Label>
          <Input
            id="item-name"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            placeholder="Enter item name"
          />
        </div>
        <div className="w-[120px]">
          <Label htmlFor="item-price">Price</Label>
          <Input
            id="item-price"
            value={newItemPrice}
            onChange={(e) => setNewItemPrice(e.target.value)}
            placeholder="0.00"
            type="number"
            step="0.01"
            min="0"
          />
        </div>
        <Button
          onClick={handleAddItem}
          disabled={!newItemName.trim() || !newItemPrice || isNaN(Number.parseFloat(newItemPrice))}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <div className="space-y-4">
          <div>
            <div className="flex justify-between mb-2">
              <Label htmlFor="tax-slider">Tax ({localTaxRate}%)</Label>
              <span className="text-sm font-medium">${taxAmount.toFixed(2)}</span>
            </div>
            <Slider id="tax-slider" defaultValue={[localTaxRate]} max={30} step={0.5} onValueChange={handleTaxChange} />
          </div>
          <div>
            <div className="flex justify-between mb-2">
              <Label htmlFor="tip-slider">Tip ({localTipRate}%)</Label>
              <span className="text-sm font-medium">${tipAmount.toFixed(2)}</span>
            </div>
            <Slider id="tip-slider" defaultValue={[localTipRate]} max={30} step={0.5} onValueChange={handleTipChange} />
          </div>
        </div>

        <div className="bg-muted p-4 rounded-lg">
          <h3 className="font-medium mb-2">Bill Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax ({localTaxRate}%):</span>
              <span>${taxAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Tip ({localTipRate}%):</span>
              <span>${tipAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-medium pt-2 border-t">
              <span>Total:</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleContinue} disabled={localItems.length === 0} size="lg">
          Continue to Summary
        </Button>
      </div>
    </div>
  )
}

