// Vercel entry point. Vercel runs this file as a function; server.ts is only for local development and
// hosts that run a long-lived Node process.
//
// The app is TypeScript and JSX, and the asset server turns client modules into browser code from their
// source paths (clientEntry uses import.meta.url). So the app has to run from source here too: register
// the same loader that `node --import remix/node-tsx` registers, then import the router.
import "remix/node-tsx"

const { router } = await import("../app/router.ts")

export default {
  fetch: (request) => router.fetch(request),
}
