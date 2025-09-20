"use client"

import { useState, useCallback, useEffect } from "react"
import { useDropzone } from "react-dropzone"
import { Button } from "./ui/button"
import { Card } from "./ui/card"
import { Upload, X, FileText, Image as ImageIcon } from "lucide-react"
import { v4 as uuidv4 } from "uuid"
import type { ReceiptItem, ReceiptMetadata } from "./lib/types"
import { Spinner } from "./ui/spinner"
import { useToast } from "./ui/use-toast"

interface ReceiptUploaderProps {
  onUpload: (items: ReceiptItem[], metadata?: ReceiptMetadata) => void
}

// Cache for processed receipts to prevent duplicate API calls
const processedImagesCache = new Map<string, ReceiptItem[]>()

export default function ReceiptUploader({ onUpload }: ReceiptUploaderProps) {
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isGalleryOpen, setIsGalleryOpen] = useState(false)
  const [base64Image, setBase64Image] = useState<string | null>(null)
  const [processingError, setProcessingError] = useState<string | null>(null)
  const { toast } = useToast()

  // Convert file to base64
  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = (error) => reject(error)
    })
  }

  // Optimize image before sending to API
  const optimizeImage = async (base64: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        // Max dimensions for reasonable file size while maintaining readability
        const MAX_WIDTH = 1200
        const MAX_HEIGHT = 1600
        
        let width = img.width
        let height = img.height
        
        // Calculate new dimensions while maintaining aspect ratio
        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round(height * (MAX_WIDTH / width))
            width = MAX_WIDTH
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round(width * (MAX_HEIGHT / height))
            height = MAX_HEIGHT
          }
        }
        
        canvas.width = width
        canvas.height = height
        
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Could not get canvas context'))
          return
        }
        
        // Improve contrast for better OCR
        ctx.filter = 'contrast(1.2) brightness(1.1)'
        ctx.drawImage(img, 0, 0, width, height)
        
        // Get optimized base64
        const optimizedBase64 = canvas.toDataURL('image/jpeg', 0.85)
        resolve(optimizedBase64)
      }
      
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = base64
    })
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
        
        // Convert to base64 for API processing
        const base64 = await convertToBase64(file)
        setBase64Image(base64)
      } catch (error) {
        console.error("Error processing image:", error)
        setProcessingError("Failed to process image. Please try again.")
      }
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png"],
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
        const cachedItems = processedImagesCache.get(cacheKey)
        console.log("Using cached OCR results")
        onUpload(cachedItems!, undefined)
        setIsProcessing(false)
        return
      }
      
      // Optimize image before sending to API
      const optimizedImage = await optimizeImage(base64Image)
      
      // Call OpenAI API for OCR processing
      const response = await fetch('/api/openai/extract-receipt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          image: optimizedImage,
          filename: file.name,
        }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to process receipt')
      }
      
      const data = await response.json()
      
      // Transform API response to app data model
      const receiptItems: ReceiptItem[] = data.items.map((item: any) => ({
        id: uuidv4(),
        name: item.description,
        price: parseFloat(item.price),
        assignedTo: [],
        confidence: item.confidence || 0.9,
      }))
      
      // Cache the results
      processedImagesCache.set(cacheKey, receiptItems)
      
      // Send data to parent component
      onUpload(receiptItems, data.metadata)
      
      toast({
        title: "Receipt processed successfully",
        description: `${receiptItems.length} items detected`,
      })
      
    } catch (error: any) {
      console.error("Receipt processing error:", error)
      setProcessingError(error.message || "Failed to process receipt. Please try again.")
      
      toast({
        title: "Processing failed",
        description: error.message || "Failed to extract items from receipt",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }
  
  // Simple hash function for caching
  const calculateHash = async (str: string): Promise<string> => {
    const encoder = new TextEncoder()
    const data = encoder.encode(str)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  const handleManualEntry = () => {
    // Provide empty receipt for manual entry
    onUpload([{ id: uuidv4(), name: "", price: 0, assignedTo: [] }], undefined)
  }
  
  // Open device gallery
  const openGallery = () => {
    // This triggers the file input click
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    if (fileInput) {
      fileInput.click()
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">Upload Your Receipt</h2>
        <p className="text-muted-foreground mb-4">Upload a photo of your receipt or enter items manually</p>
      </div>

      {!file ? (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
            isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/20"
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg font-medium">{isDragActive ? "Drop the receipt here" : "Drag & drop your receipt"}</p>
          <p className="text-sm text-muted-foreground mt-2">or click to browse files</p>
          <p className="text-xs text-muted-foreground mt-4">Supported formats: JPG, PNG</p>
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
            <img src={previewUrl || ""} alt="Receipt preview" className="w-full h-full object-contain" />
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

      <div className="flex flex-col sm:flex-row gap-4 justify-center mt-6">
        <Button onClick={processReceipt} disabled={!file || isProcessing} className="flex-1">
          {isProcessing ? "Processing..." : "Process Receipt"}
        </Button>
        <Button variant="outline" onClick={openGallery} className="flex-1">
          <ImageIcon className="mr-2 h-4 w-4" />
          Select from Gallery
        </Button>
        <Button variant="outline" onClick={handleManualEntry} className="flex-1">
          <FileText className="mr-2 h-4 w-4" />
          Enter Manually
        </Button>
      </div>
    </div>
  )
}

