// Vercel entry point. Vercel runs this file as a function; server.ts is only for local development and
// hosts that run a long-lived Node process.
//
// The app is TypeScript and JSX, and the asset server turns client modules into browser code from their
// source paths (clientEntry uses import.meta.url). So the app has to run from source here too: register
// the same loader that `node --import remix/node-tsx` registers, then import the router.
import "remix/node-tsx"

// Make dependencies used by the runtime-loaded TypeScript routes visible to Vercel's tracer.
import "remix/assets"
import "remix/component"
import "remix/component/jsx-runtime"
import "remix/component/server"
import "remix/fetch-proxy"
import "remix/middleware/render"
import "remix/middleware/static"
import "remix/multiple-import-maps-polyfill"
import "remix/router"
import "remix/routes"
import "@oxc-project/runtime/package.json" with { type: "json" }

// Lightning CSS resolves its platform-specific native binding through a dynamic require.
import { createRequire } from "node:module"

const require = createRequire(import.meta.url)
require("../tsconfig.json")
require("lightningcss-linux-x64-gnu")

const { router } = await import("../app/router.ts")

export default {
  fetch: (request) => router.fetch(request),
}
