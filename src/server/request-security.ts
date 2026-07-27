import type { NextApiRequest } from "next"

interface RateEntry {
  count: number
  resetAt: number
}

const rateEntries = new Map<string, RateEntry>()

export function getClientIp(req: NextApiRequest): string {
  const forwarded = req.headers["x-forwarded-for"]
  if (typeof forwarded === "string") return forwarded.split(",")[0].trim()
  if (Array.isArray(forwarded)) return forwarded[0] ?? "unknown"
  return req.socket.remoteAddress ?? "unknown"
}

export function consumeRateLimit(
  key: string,
  limit = 10,
  windowMs = 10 * 60 * 1000,
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now()
  const current = rateEntries.get(key)
  const entry = !current || current.resetAt <= now
    ? { count: 0, resetAt: now + windowMs }
    : current
  entry.count += 1
  rateEntries.set(key, entry)

  if (rateEntries.size > 5000) {
    rateEntries.forEach((value, entryKey) => {
      if (value.resetAt <= now) rateEntries.delete(entryKey)
    })
  }

  return {
    allowed: entry.count <= limit,
    remaining: Math.max(0, limit - entry.count),
    resetAt: entry.resetAt,
  }
}

export function isSameOriginBrowserRequest(req: NextApiRequest): boolean {
  const origin = req.headers.origin
  if (!origin) return true
  try {
    return new URL(origin).host === req.headers.host
  } catch {
    return false
  }
}

export function hasValidImageSignature(bytes: Buffer, mimeType: string): boolean {
  if (mimeType === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  if (mimeType === "image/png") {
    return bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  }
  if (mimeType === "image/webp") {
    return bytes.subarray(0, 4).toString("ascii") === "RIFF"
      && bytes.subarray(8, 12).toString("ascii") === "WEBP"
  }
  return false
}
