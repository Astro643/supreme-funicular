import { get, route } from "remix/routes"

export const routes = route({
  assets: get("/assets/*path"),
  api: "/api/*path",
  home: "/",
  privacy: "/privacy",
  terms: "/terms",
  dashboard: "/dashboard",
  docs: "/docs",
  about: "/about",
  notFound: get("/*path"),
})
