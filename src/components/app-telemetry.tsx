"use client"

import { useEffect } from "react"

function sendEvent(payload: Record<string, string>) {
  const body = JSON.stringify({
    ...payload,
    path: window.location.pathname.slice(0, 200),
    userAgent: navigator.userAgent.slice(0, 300),
  })
  if (navigator.sendBeacon) {
    navigator.sendBeacon("/api/telemetry", new Blob([body], { type: "application/json" }))
  } else {
    void fetch("/api/telemetry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    })
  }
}

export default function AppTelemetry() {
  useEffect(() => {
    sendEvent({ type: "page_view" })
    const onError = (event: ErrorEvent) => sendEvent({
      type: "client_error",
      message: (event.message || "Unknown client error").slice(0, 500),
    })
    const onRejection = (event: PromiseRejectionEvent) => sendEvent({
      type: "client_error",
      message: String(event.reason instanceof Error ? event.reason.message : event.reason).slice(0, 500),
    })
    window.addEventListener("error", onError)
    window.addEventListener("unhandledrejection", onRejection)
    return () => {
      window.removeEventListener("error", onError)
      window.removeEventListener("unhandledrejection", onRejection)
    }
  }, [])
  return null
}
