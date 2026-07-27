"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import ReceiptUploader from "./receipt-uploader"
import ParticipantManager from "./participant-manager"
import ItemAssignment from "./item-assignment"
import BillSummary from "./bill-summary"
import type { Person, ReceiptItem, ReceiptMetadata } from "./lib/types"
import { validateBillItems } from "./lib/bill-calculations"
import React from "react"
import { Toaster } from "./ui/toaster"
import SavedBills from "./saved-bills"
import {
  addBillToHistory,
  BILL_DRAFT_KEY,
  BILL_HISTORY_KEY,
  parseBillHistory,
  parseBillSnapshot,
  type BillSnapshot,
  type SavedBill,
} from "./lib/bill-storage"

export default function BillSplitter() {
  const [activeTab, setActiveTab] = useState<BillSnapshot["activeTab"]>("upload")
  const [receiptItems, setReceiptItems] = useState<ReceiptItem[]>([])
  const [participants, setParticipants] = useState<Person[]>([])
  const [taxRate, setTaxRate] = useState(10)
  const [tipRate, setTipRate] = useState(15)
  const [receiptUploaded, setReceiptUploaded] = useState(false)
  const [receiptMetadata, setReceiptMetadata] = useState<ReceiptMetadata | undefined>(undefined)
  const [history, setHistory] = useState<SavedBill[]>([])
  const [hasDraft, setHasDraft] = useState(false)
  const [currentHistoryId, setCurrentHistoryId] = useState<string | undefined>()
  const hasHydrated = useRef(false)

  const createSnapshot = useCallback((): BillSnapshot => ({
    version: 1,
    activeTab,
    receiptItems,
    participants,
    taxRate,
    tipRate,
    receiptUploaded,
    receiptMetadata,
    updatedAt: new Date().toISOString(),
  }), [activeTab, receiptItems, participants, taxRate, tipRate, receiptUploaded, receiptMetadata])

  useEffect(() => {
    const savedHistory = parseBillHistory(window.localStorage.getItem(BILL_HISTORY_KEY))
    const draft = parseBillSnapshot(window.localStorage.getItem(BILL_DRAFT_KEY))
    setHistory(savedHistory)
    setHasDraft(Boolean(draft))
    if (draft) restoreSnapshot(draft)
    hasHydrated.current = true
  }, [])

  useEffect(() => {
    if (!hasHydrated.current) return
    const timer = window.setTimeout(() => {
      if (!receiptUploaded && receiptItems.length === 0 && participants.length === 0) {
        window.localStorage.removeItem(BILL_DRAFT_KEY)
        setHasDraft(false)
        return
      }
      const snapshot = createSnapshot()
      window.localStorage.setItem(BILL_DRAFT_KEY, JSON.stringify(snapshot))
      setHasDraft(true)
    }, 250)
    return () => window.clearTimeout(timer)
  }, [createSnapshot, participants.length, receiptItems.length, receiptUploaded])

  const restoreSnapshot = (snapshot: BillSnapshot) => {
    setReceiptItems(snapshot.receiptItems)
    setParticipants(snapshot.participants)
    setTaxRate(snapshot.taxRate)
    setTipRate(snapshot.tipRate)
    setReceiptUploaded(snapshot.receiptUploaded)
    setReceiptMetadata(snapshot.receiptMetadata)
    setActiveTab(snapshot.activeTab)
  }

  const saveHistory = (updatedItems: ReceiptItem[]) => {
    const id = currentHistoryId ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
    const bill: SavedBill = {
      ...createSnapshot(),
      id,
      title: receiptMetadata?.merchant?.trim() || `Bill with ${participants.length} ${participants.length === 1 ? "person" : "people"}`,
      receiptItems: updatedItems,
      activeTab: "summary",
      updatedAt: new Date().toISOString(),
    }
    const updatedHistory = addBillToHistory(history, bill)
    setCurrentHistoryId(id)
    setHistory(updatedHistory)
    window.localStorage.setItem(BILL_HISTORY_KEY, JSON.stringify(updatedHistory))
  }

  const handleReceiptUpload = (items: ReceiptItem[], metadata?: ReceiptMetadata) => {
    setCurrentHistoryId(undefined)
    setReceiptItems(items)
    setReceiptUploaded(true)
    
    if (metadata) {
      setReceiptMetadata(metadata)
      
      // Set tax and tip rates if available in metadata
      if (metadata.tax !== null && metadata.subtotal !== null && metadata.subtotal > 0) {
        const calculatedTaxRate = Math.round((metadata.tax / metadata.subtotal) * 10000) / 100
        setTaxRate(calculatedTaxRate)
      }
      
      if (metadata.tip !== null && metadata.subtotal !== null && metadata.subtotal > 0) {
        const calculatedTipRate = Math.round((metadata.tip / metadata.subtotal) * 10000) / 100
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
    saveHistory(updatedItems)
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

  const handleReset = () => {
    setReceiptItems([])
    setParticipants([])
    setTaxRate(10)
    setTipRate(15)
    setReceiptUploaded(false)
    setReceiptMetadata(undefined)
    setCurrentHistoryId(undefined)
    setActiveTab("upload")
    window.localStorage.removeItem(BILL_DRAFT_KEY)
    setHasDraft(false)
  }

  const handleRestoreSavedBill = (bill: SavedBill) => {
    restoreSnapshot(bill)
    setCurrentHistoryId(bill.id)
  }

  const handleDeleteSavedBill = (id: string) => {
    const updatedHistory = history.filter((bill) => bill.id !== id)
    setHistory(updatedHistory)
    window.localStorage.setItem(BILL_HISTORY_KEY, JSON.stringify(updatedHistory))
    if (currentHistoryId === id) setCurrentHistoryId(undefined)
  }

  const handleClearSavedData = () => {
    window.localStorage.removeItem(BILL_DRAFT_KEY)
    window.localStorage.removeItem(BILL_HISTORY_KEY)
    setHistory([])
    handleReset()
  }

  return (
    <div className="max-w-3xl mx-auto bg-card rounded-lg shadow-lg border">
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as BillSnapshot["activeTab"])}
        className="w-full"
      >
        <TabsList className="grid h-auto min-h-12 grid-cols-4 w-full">
          <TabsTrigger className="min-h-10 px-1 text-xs sm:text-sm" value="upload">Upload</TabsTrigger>
          <TabsTrigger className="min-h-10 px-1 text-xs sm:text-sm" value="participants" disabled={!receiptUploaded}>
            People
          </TabsTrigger>
          <TabsTrigger className="min-h-10 px-1 text-xs sm:text-sm" value="assign" disabled={participants.length === 0}>
            Assign
          </TabsTrigger>
          <TabsTrigger
            className="min-h-10 px-1 text-xs sm:text-sm"
            value="summary"
            disabled={participants.length === 0 || validateBillItems(receiptItems).length > 0}
          >
            Summary
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="p-4 sm:p-6">
          <ReceiptUploader onUpload={handleReceiptUpload} />
          <SavedBills
            history={history}
            hasDraft={hasDraft}
            onRestore={handleRestoreSavedBill}
            onDelete={handleDeleteSavedBill}
            onClearSavedData={handleClearSavedData}
          />
        </TabsContent>

        <TabsContent value="participants" className="p-4 sm:p-6">
          <ParticipantManager
            participants={participants}
            onConfirm={handleParticipantsConfirmed}
            onRemoveParticipant={handleRemoveParticipant}
            onParticipantsChange={setParticipants}
            onBack={() => setActiveTab("upload")}
          />
        </TabsContent>

        <TabsContent value="assign" className="p-4 sm:p-6">
          <ItemAssignment
            items={receiptItems}
            participants={participants}
            onAssign={handleItemAssignment}
            onItemsChange={setReceiptItems}
            onTaxTipChange={handleTaxTipChange}
            onBack={() => setActiveTab("participants")}
            taxRate={taxRate}
            tipRate={tipRate}
            receiptMetadata={receiptMetadata}
          />
        </TabsContent>

        <TabsContent value="summary" className="p-4 sm:p-6">
          <BillSummary
            items={receiptItems}
            participants={participants}
            taxRate={taxRate}
            tipRate={tipRate}
            onReset={handleReset}
            onEditItems={() => setActiveTab("assign")}
            onEditPeople={() => setActiveTab("participants")}
            receiptMetadata={receiptMetadata}
          />
        </TabsContent>
      </Tabs>
      <Toaster />
    </div>
  )
}
