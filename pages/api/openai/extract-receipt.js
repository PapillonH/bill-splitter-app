import { normalizeExtractedReceipt, receiptResponseJsonSchema } from "../../../src/server/receipt-schema"
import {
  consumeRateLimit,
  getClientIp,
  hasValidImageSignature,
  isSameOriginBrowserRequest,
} from "../../../src/server/request-security"

export const config = {
  api: {
    bodyParser: { sizeLimit: "8mb" },
    responseLimit: false,
  },
}

const DATA_URL_PATTERN = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=\s]+)$/
const MAX_IMAGE_BYTES = 6 * 1024 * 1024

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST")
    return res.status(405).json({ error: "Method not allowed" })
  }

  if (!isSameOriginBrowserRequest(req)) {
    return res.status(403).json({ error: "Cross-origin receipt requests are not allowed." })
  }

  const rateLimit = consumeRateLimit(`receipt:${getClientIp(req)}`, 10)
  res.setHeader("X-RateLimit-Limit", "10")
  res.setHeader("X-RateLimit-Remaining", String(rateLimit.remaining))
  res.setHeader("X-RateLimit-Reset", String(Math.ceil(rateLimit.resetAt / 1000)))
  if (!rateLimit.allowed) {
    res.setHeader("Retry-After", String(Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000))))
    return res.status(429).json({ error: "Too many receipt scans. Please wait a few minutes and try again." })
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(503).json({ error: "Receipt scanning is not configured. Add OPENAI_API_KEY and restart the server." })
  }

  const { image, filename } = req.body ?? {}
  const match = typeof image === "string" ? image.match(DATA_URL_PATTERN) : null
  if (!match) {
    return res.status(400).json({ error: "Upload a valid JPEG, PNG, or WebP image." })
  }

  const imageBytes = Buffer.from(match[2], "base64")
  if (imageBytes.length === 0 || imageBytes.length > MAX_IMAGE_BYTES) {
    return res.status(413).json({ error: "The processed receipt image must be smaller than 6 MB." })
  }
  if (!hasValidImageSignature(imageBytes, match[1])) {
    return res.status(400).json({ error: "The uploaded file contents do not match a supported image type." })
  }

  try {
    const openAIResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5.4-mini",
        store: false,
        messages: [{
          role: "user",
          content: [
            {
              type: "text",
              text: [
                "Extract this receipt accurately.",
                "Return each purchased item plus discounts, service charges, and other adjustments.",
                "Price is the unit price. Discounts must be negative.",
                "Do not include subtotal, tax, tip, or total as line items.",
                "Infer the ISO 4217 currency code from symbols, language, address, and formatting.",
                "Convert locale-formatted amounts (for example 12,50) to JSON numbers.",
                "Use null only when a receipt-level field is not readable.",
              ].join(" "),
            },
            {
              type: "image_url",
              image_url: { url: image, detail: "high" },
            },
          ],
        }],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "receipt_extraction",
            strict: true,
            schema: receiptResponseJsonSchema,
          },
        },
        max_completion_tokens: 4000,
      }),
    })

    const payload = await openAIResponse.json()
    if (!openAIResponse.ok) {
      const message = payload?.error?.message || "The receipt service could not process this image."
      return res.status(openAIResponse.status).json({ error: message })
    }

    const message = payload?.choices?.[0]?.message
    if (message?.refusal) {
      return res.status(422).json({ error: "The receipt image could not be processed." })
    }

    const extracted = normalizeExtractedReceipt(JSON.parse(message?.content ?? ""))
    return res.status(200).json({
      items: extracted.items.map((item) => ({
        description: item.name,
        price: item.price,
        quantity: item.quantity,
        type: item.type,
        confidence: item.confidence,
      })),
      metadata: {
        merchant: extracted.merchant,
        date: extracted.date,
        currencyCode: extracted.currencyCode,
        subtotal: extracted.subtotal,
        tax: extracted.tax,
        tip: extracted.tip,
        total: extracted.total,
        processedAt: new Date().toISOString(),
        originalFilename: typeof filename === "string" ? filename.slice(0, 255) : undefined,
      },
    })
  } catch (error) {
    if (error instanceof SyntaxError || error?.name === "ZodError") {
      return res.status(422).json({ error: "The scanned receipt data was incomplete or invalid. Try a clearer photo." })
    }
    console.error("Receipt processing failed:", error instanceof Error ? error.message : "Unknown error")
    return res.status(502).json({ error: "Could not reach the receipt scanning service. Please try again." })
  }
}
