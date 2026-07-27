import { cp, mkdir, rm } from "node:fs/promises"

await rm("dist", { recursive: true, force: true })
await mkdir("dist", { recursive: true })
await cp(".open-next", "dist/server", { recursive: true })
await cp(".open-next/assets", "dist/assets", { recursive: true })
await cp(".open-next/worker.js", "dist/server/index.js")
