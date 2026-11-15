import { createAssetServer } from "remix/assets"

const nodeEnv = process.env.NODE_ENV ?? "development"
const isDevelopment = nodeEnv === "development"
export const isProduction = nodeEnv === "production"

export const assets = createAssetServer({
  basePath: "/assets",
  rootDir: process.cwd(),

  allowFiles: ["app/routes.ts", "app/**/public/**", "app/ui/**", "node_modules/remix/**"],
  allowPackages: ["@remix-run/component", "@remix-run/multiple-import-maps-polyfill"],
  denyFiles: ["app/**/*.test.*"],
  sourceMaps: isDevelopment ? "external" : undefined,
  minify: !isDevelopment,
  fingerprint: isProduction,
  watch: isDevelopment,
})

export const scriptEntry = await assets.getScriptEntry("app/actions/public/entry.ts")
