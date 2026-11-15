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

// The Remix asset server resolves every Remix dependency as a package root at runtime.
require("@remix-run/async-context-middleware/package.json")
require("@remix-run/auth-middleware/package.json")
require("@remix-run/auth/package.json")
require("@remix-run/component-hmr/package.json")
require("@remix-run/cop-middleware/package.json")
require("@remix-run/cors-middleware/package.json")
require("@remix-run/csrf-middleware/package.json")
require("@remix-run/compression-middleware/package.json")
require("@remix-run/data-schema/package.json")
require("@remix-run/data-table-postgres/package.json")
require("@remix-run/data-table-sqlite/package.json")
require("@remix-run/data-table/package.json")
require("@remix-run/data-table-mysql/package.json")
require("@remix-run/cookie/package.json")
require("@remix-run/file-storage-s3/package.json")
require("@remix-run/form-data-middleware/package.json")
require("@remix-run/form-data-parser/package.json")
require("@remix-run/method-override-middleware/package.json")
require("@remix-run/multipart-parser/package.json")
require("@remix-run/logger-middleware/package.json")
require("@remix-run/node-fetch-server/package.json")
require("@remix-run/session/package.json")
require("@remix-run/session-storage-memcache/package.json")
require("@remix-run/session-middleware/package.json")
require("@remix-run/tar-parser/package.json")
require("@remix-run/session-storage-redis/package.json")
require("@remix-run/assert/package.json")
require("@remix-run/cli/package.json")
require("@remix-run/test/package.json")
require("@remix-run/terminal/package.json")
require("@remix-run/node-hmr/package.json")
require("@remix-run/spa/package.json")

const { router } = await import("../app/router.ts")

export default {
  fetch: (request) => router.fetch(request),
}
