export function normalizeCurrencyCode(currencyCode?: string | null): string {
  const code = currencyCode?.toUpperCase()
  if (!code || !/^[A-Z]{3}$/.test(code)) return "USD"
  try {
    new Intl.NumberFormat("en", { style: "currency", currency: code })
    return code
  } catch {
    return "USD"
  }
}

export function formatCurrency(value: number, currencyCode?: string | null): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: normalizeCurrencyCode(currencyCode),
  }).format(value)
}
