import { describe, expect, it } from "vitest"
import { consumeRateLimit, hasValidImageSignature } from "./request-security"

describe("receipt request security", () => {
  it("accepts only image bytes matching their declared type", () => {
    expect(hasValidImageSignature(Buffer.from([0xff, 0xd8, 0xff, 0x00]), "image/jpeg")).toBe(true)
    expect(hasValidImageSignature(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), "image/png")).toBe(true)
    expect(hasValidImageSignature(Buffer.from("RIFF0000WEBP"), "image/webp")).toBe(true)
    expect(hasValidImageSignature(Buffer.from("<script>"), "image/jpeg")).toBe(false)
  })

  it("blocks requests after the configured rate limit", () => {
    const key = `test-${Math.random()}`
    expect(consumeRateLimit(key, 2, 60_000).allowed).toBe(true)
    expect(consumeRateLimit(key, 2, 60_000).allowed).toBe(true)
    expect(consumeRateLimit(key, 2, 60_000).allowed).toBe(false)
  })
})
