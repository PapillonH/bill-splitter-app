import { z } from "zod"
import { consumeRateLimit, getClientIp, isSameOriginBrowserRequest } from "../../src/server/request-security"

const eventSchema = z.object({
  type: z.enum(["page_view", "client_error"]),
  path: z.string().max(200),
  message: z.string().max(500).optional(),
  userAgent: z.string().max(300).optional(),
}).strict()

export default function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" })
  if (!isSameOriginBrowserRequest(req)) return res.status(403).json({ error: "Forbidden" })
  if (!consumeRateLimit(`telemetry:${getClientIp(req)}`, 60, 60 * 1000).allowed) {
    return res.status(429).json({ error: "Rate limit exceeded" })
  }
  const parsed = eventSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: "Invalid event" })

  console.info(JSON.stringify({
    event: parsed.data.type,
    path: parsed.data.path,
    message: parsed.data.message,
    userAgent: parsed.data.userAgent,
    timestamp: new Date().toISOString(),
  }))
  return res.status(204).end()
}
