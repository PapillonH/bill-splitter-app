import React from "react"
import BillSplitter from "../src/components/bill-splitter"
import { ThemeToggle } from "../src/components/theme-toggle"

export default function Home() {
  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="container max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Vizzle
          </h1>
          <ThemeToggle />
        </div>
        <BillSplitter />
      </div>
    </main>
  )
}
