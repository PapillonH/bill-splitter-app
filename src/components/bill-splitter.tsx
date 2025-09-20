"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import ReceiptUploader from "./receipt-uploader"
import ParticipantManager from "./participant-manager"
import ItemAssignment from "./item-assignment"
import BillSummary from "./bill-summary"
import type { Person, ReceiptItem, ReceiptMetadata } from "./lib/types"
import React from "react"
import { Toaster } from "./ui/toaster"

export default function BillSplitter() {
  const [activeTab, setActiveTab] = useState("upload")
  const [receiptItems, setReceiptItems] = useState<ReceiptItem[]>([])
  const [participants, setParticipants] = useState<Person[]>([])
  const [taxRate, setTaxRate] = useState(10)
  const [tipRate, setTipRate] = useState(15)
  const [receiptUploaded, setReceiptUploaded] = useState(false)
  const [receiptMetadata, setReceiptMetadata] = useState<ReceiptMetadata | undefined>(undefined)

  const handleReceiptUpload = (items: ReceiptItem[], metadata?: ReceiptMetadata) => {
    setReceiptItems(items)
    setReceiptUploaded(true)
    
    if (metadata) {
      setReceiptMetadata(metadata)
      
      // Set tax and tip rates if available in metadata
      if (metadata.tax !== null && metadata.subtotal !== null && metadata.subtotal > 0) {
        const calculatedTaxRate = Math.round((metadata.tax / metadata.subtotal) * 100)
        setTaxRate(calculatedTaxRate)
      }
      
      if (metadata.tip !== null && metadata.subtotal !== null && metadata.subtotal > 0) {
        const calculatedTipRate = Math.round((metadata.tip / metadata.subtotal) * 100)
        setTipRate(calculatedTipRate)
      }
    }
    
    setActiveTab("participants")
  }

  const handleParticipantsConfirmed = (people: Person[]) => {
    setParticipants(people)
    setActiveTab("assign")
  }

  const handleItemAssignment = (updatedItems: ReceiptItem[]) => {
    setReceiptItems(updatedItems)
    setActiveTab("summary")
  }

  const handleTaxTipChange = (tax: number, tip: number) => {
    setTaxRate(tax)
    setTipRate(tip)
  }

  const handleRemoveParticipant = (id: string) => {
    // Remove participant and reassign their items to unassigned
    const updatedParticipants = participants.filter((p) => p.id !== id)
    setParticipants(updatedParticipants)

    const updatedItems = receiptItems.map((item) => {
      return {
        ...item,
        assignedTo: item.assignedTo.filter((personId) => personId !== id),
      }
    })
    setReceiptItems(updatedItems)
  }

  const handleRemoveItem = (id: string) => {
    setReceiptItems(receiptItems.filter((item) => item.id !== id))
  }

  const handleReset = () => {
    setReceiptItems([])
    setParticipants([])
    setTaxRate(10)
    setTipRate(15)
    setReceiptUploaded(false)
    setReceiptMetadata(undefined)
    setActiveTab("upload")
  }

  return (
    <div className="max-w-3xl mx-auto bg-card rounded-lg shadow-lg border">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex grid-cols-4 w-full">
          <TabsTrigger value="upload">Upload</TabsTrigger>
          <TabsTrigger value="participants" disabled={!receiptUploaded}>
            People
          </TabsTrigger>
          <TabsTrigger value="assign" disabled={participants.length === 0}>
            Assign
          </TabsTrigger>
          <TabsTrigger value="summary" disabled={participants.length === 0}>
            Summary
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="p-6">
          <ReceiptUploader onUpload={handleReceiptUpload} />
        </TabsContent>

        <TabsContent value="participants" className="p-6">
          <ParticipantManager
            participants={participants}
            onConfirm={handleParticipantsConfirmed}
            onRemoveParticipant={handleRemoveParticipant}
          />
        </TabsContent>

        <TabsContent value="assign" className="p-6">
          <ItemAssignment
            items={receiptItems}
            participants={participants}
            onAssign={handleItemAssignment}
            onRemoveItem={handleRemoveItem}
            onTaxTipChange={handleTaxTipChange}
            taxRate={taxRate}
            tipRate={tipRate}
            receiptMetadata={receiptMetadata}
          />
        </TabsContent>

        <TabsContent value="summary" className="p-6">
          <BillSummary
            items={receiptItems}
            participants={participants}
            taxRate={taxRate}
            tipRate={tipRate}
            onReset={handleReset}
            receiptMetadata={receiptMetadata}
          />
        </TabsContent>
      </Tabs>
      <Toaster />
    </div>
  )
}

