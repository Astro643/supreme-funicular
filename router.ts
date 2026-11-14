import { createRouter, type RouterContext } from "remix/router"
import { render } from "remix/middleware/render"
import { staticFiles } from "remix/middleware/static"

import controller from "./actions/controller.tsx"
import { assets, isProduction } from "./assets.ts"
import { routes } from "./routes.ts"

const SECURITY_HEADERS = {
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "strict-origin-when-cross-origin",
}

export const router = createRouter({
  middleware: [
    async (context, next) => {
      const res = await next()
      const { pathname } = new URL(context.request.url)

      for (const [name, value] of Object.entries(SECURITY_HEADERS)) res.headers.set(name, value)

      // API responses set their own caching; fingerprinted assets never change; HTML always revalidates.
      if (!pathname.startsWith("/api/")) {
        // Only production URLs are fingerprinted; in development the same URL must be able to change.
        const immutable = isProduction && res.ok && pathname.startsWith("/assets/")
        res.headers.set("cache-control", immutable ? "public, max-age=31536000, s-maxage=31536000, immutable" : "no-cache")
      }
      return res
    },
    staticFiles("./public", { index: false }),
    render({ assets }),
  ],
})

export type AppContext = RouterContext<typeof router>

declare module "remix" {
  interface RouterTypes {
    context: AppContext
  }
}

router.map(routes, controller)
