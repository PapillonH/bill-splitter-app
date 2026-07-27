"use client"

import { useState, useCallback, useRef } from "react"
import Image from "next/image"
import { useDropzone } from "react-dropzone"
import { Button } from "./ui/button"
import { Card } from "./ui/card"
import { Camera, Upload, X, FileText, Image as ImageIcon } from "lucide-react"
import { v4 as uuidv4 } from "uuid"
import type { ReceiptEntryType, ReceiptItem, ReceiptMetadata } from "./lib/types"
import { Spinner } from "./ui/spinner"
import { useToast } from "./ui/use-toast"
import Link from "next/link"

interface ReceiptUploaderProps {
  onUpload: (items: ReceiptItem[], metadata?: ReceiptMetadata) => void
}

interface ExtractedReceiptItem {
  description: string
  price: number | string
  quantity?: number
  type?: ReceiptEntryType
  confidence?: number
}

interface ExtractedReceiptResponse {
  items: ExtractedReceiptItem[]
  metadata: ReceiptMetadata
}

// Cache for processed receipts to prevent duplicate API calls
const processedImagesCache = new Map<string, { items: ReceiptItem[]; metadata: ReceiptMetadata }>()

function isExtractedReceiptResponse(value: unknown): value is ExtractedReceiptResponse {
  if (!value || typeof value !== "object") return false
  const candidate = value as Partial<ExtractedReceiptResponse>
  if (!Array.isArray(candidate.items) || !candidate.metadata) return false
  const metadata = candidate.metadata
  return (
    typeof metadata.currencyCode === "string"
    && typeof metadata.processedAt === "string"
    && candidate.items.every((item) => (
      typeof item?.description === "string"
      && Number.isFinite(Number(item.price))
      && Number.isInteger(item.quantity)
      && (item.quantity ?? 0) > 0
      && ["item", "discount", "service", "adjustment"].includes(item.type ?? "")
    ))
  )
}

export default function ReceiptUploader({ onUpload }: ReceiptUploaderProps) {
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [base64Image, setBase64Image] = useState<string | null>(null)
  const [processingError, setProcessingError] = useState<string | null>(null)
  const { toast } = useToast()
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const optimizeImage = async (sourceFile: File): Promise<string> => {
    const bitmap = await createImageBitmap(sourceFile, { imageOrientation: "from-image" })
    try {
      const maxLongEdge = 2000
      const scale = Math.min(1, maxLongEdge / Math.max(bitmap.width, bitmap.height))
      const width = Math.max(1, Math.round(bitmap.width * scale))
      const height = Math.max(1, Math.round(bitmap.height * scale))
      const canvas = document.createElement("canvas")
      canvas.width = width
      canvas.height = height
      const context = canvas.getContext("2d")
      if (!context) throw new Error("Could not prepare this image.")
      context.fillStyle = "#ffffff"
      context.fillRect(0, 0, width, height)
      context.filter = "contrast(1.08)"
      context.drawImage(bitmap, 0, 0, width, height)
      return canvas.toDataURL("image/jpeg", 0.82)
    } finally {
      bitmap.close()
    }
  }

  // Handle file drop
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0]
      setFile(file)
      setProcessingError(null)

      try {
        // Create a preview URL for the image
        const url = URL.createObjectURL(file)
        setPreviewUrl(url)
        
        const optimized = await optimizeImage(file)
        setBase64Image(optimized)
      } catch (error) {
        console.error("Error processing image:", error)
        setProcessingError("Failed to process image. Please try again.")
      }
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive, inputRef } = useDropzone({
    onDrop,
    onDropRejected: (rejections) => {
      const code = rejections[0]?.errors[0]?.code
      setProcessingError(
        code === "file-too-large"
          ? "Receipt images must be 10 MB or smaller."
          : "Please choose a JPG, PNG, or WebP receipt image.",
      )
    },
    accept: {
      "image/jpeg": [".jpeg", ".jpg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB max
  })

  const handleRemoveFile = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
    setFile(null)
    setPreviewUrl(null)
    setBase64Image(null)
    setProcessingError(null)
  }

  // Debounced API call to prevent multiple submissions
  const processReceipt = async () => {
    if (!base64Image || !file) return
    
    setIsProcessing(true)
    setProcessingError(null)
    
    try {
      // Check cache first
      const cacheKey = await calculateHash(base64Image)
      if (processedImagesCache.has(cacheKey)) {
        const cached = processedImagesCache.get(cacheKey)!
        onUpload(cached.items, cached.metadata)
        setIsProcessing(false)
        return
      }
      
      // Call OpenAI API for OCR processing
      const response = await fetch('/api/openai/extract-receipt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          image: base64Image,
          filename: file.name,
        }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to process receipt')
      }
      
      const data: unknown = await response.json()
      if (!isExtractedReceiptResponse(data)) {
        throw new Error("The receipt service returned invalid data. Please try again.")
      }
      if (data.items.length === 0) {
        throw new Error("No receipt entries were detected. Try a clearer image or enter the bill manually.")
      }
      
      // Transform API response to app data model
      const receiptItems: ReceiptItem[] = data.items
        .map((item) => ({
          id: uuidv4(),
          name: String(item.description ?? "").trim(),
          price: Number.parseFloat(String(item.price)),
          quantity: Number.isInteger(item.quantity) && (item.quantity ?? 0) > 0 ? item.quantity! : 1,
          type: item.type ?? "item",
          assignedTo: [],
          confidence: item.confidence || 0.9,
        }))
        .filter((item) => item.name && Number.isFinite(item.price))
      if (receiptItems.length === 0) {
        throw new Error("The receipt response did not contain valid entries. Please enter the bill manually.")
      }
      
      // Cache the results
      processedImagesCache.set(cacheKey, { items: receiptItems, metadata: data.metadata })
      
      // Send data to parent component
      onUpload(receiptItems, data.metadata)
      
      toast({
        title: "Receipt processed successfully",
        description: `${receiptItems.length} items detected`,
      })
      
    } catch (error: unknown) {
      console.error("Receipt processing error:", error)
      const message = error instanceof Error ? error.message : "Failed to process receipt. Please try again."
      setProcessingError(message)
      
      toast({
        title: "Processing failed",
        description: message,
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }
  
  // This cache key is only for avoiding duplicate scans, not for security.
  // It intentionally works in mobile browsers on local HTTP connections where
  // crypto.subtle is unavailable.
  const calculateHash = async (str: string): Promise<string> => {
    let hash = 2166136261
    for (let index = 0; index < str.length; index += 1) {
      hash ^= str.charCodeAt(index)
      hash = Math.imul(hash, 16777619)
    }
    return `${str.length}-${(hash >>> 0).toString(16)}`
  }

  const handleManualEntry = () => {
    // Provide empty receipt for manual entry
    onUpload([{
      id: uuidv4(),
      name: "",
      price: 0,
      quantity: 1,
      type: "item",
      assignedTo: [],
    }], undefined)
  }
  
  // Open device gallery
  const openGallery = () => {
    inputRef.current?.click()
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">Upload Your Receipt</h2>
        <p className="text-muted-foreground mb-4">Upload a photo of your receipt or enter items manually</p>
        <p className="text-xs text-muted-foreground">
          Receipt photos are sent to OpenAI for extraction and are not saved by Vizzle.{" "}
          <Link href="/privacy" className="underline underline-offset-2">Privacy details</Link>
        </p>
      </div>

      {!file ? (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg px-4 py-10 sm:p-12 text-center cursor-pointer transition-colors ${
            isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/20"
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg font-medium">{isDragActive ? "Drop the receipt here" : "Drag & drop your receipt"}</p>
          <p className="text-sm text-muted-foreground mt-2">or click to browse files</p>
          <p className="text-xs text-muted-foreground mt-4">Supported formats: JPG, PNG, WebP · up to 10 MB</p>
        </div>
      ) : (
        <Card className="relative overflow-hidden">
          <Button
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 z-10 rounded-full"
            onClick={handleRemoveFile}
          >
            <X className="h-4 w-4" />
          </Button>
          <div className="aspect-[3/4] relative">
            <Image
              src={previewUrl || ""}
              alt="Receipt preview"
              fill
              unoptimized
              className="object-contain"
            />
            {isProcessing && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                <div className="text-center space-y-2">
                  <Spinner size="lg" />
                  <p className="text-sm font-medium">Scanning receipt...</p>
                </div>
              </div>
            )}
          </div>
          {processingError && (
            <div className="p-3 bg-destructive/10 text-destructive text-sm">
              {processingError}
            </div>
          )}
        </Card>
      )}

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        className="sr-only"
        aria-label="Take a receipt photo"
        onChange={(event) => {
          const selectedFile = event.target.files?.[0]
          if (selectedFile) void onDrop([selectedFile])
          event.target.value = ""
        }}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
        <Button onClick={processReceipt} disabled={!file || isProcessing} className="sm:col-span-2">
          {isProcessing ? "Processing..." : "Process Receipt"}
        </Button>
        <Button variant="outline" onClick={() => cameraInputRef.current?.click()}>
          <Camera className="mr-2 h-5 w-5" />
          Take Photo
        </Button>
        <Button variant="outline" onClick={openGallery}>
          <ImageIcon className="mr-2 h-4 w-4" />
          Photo Library
        </Button>
        <Button variant="outline" onClick={handleManualEntry} className="sm:col-span-2">
          <FileText className="mr-2 h-4 w-4" />
          Enter Manually
        </Button>
      </div>
    </div>
  )
}
