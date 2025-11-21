import {
  type RouteConfig,
  index,
  layout,
  prefix,
  route,
} from "@react-router/dev/routes";

export default [
  layout("routes/App/App.tsx", [
    index("routes/Welcome/Welcome.tsx"),
    ...prefix(":name", [
      layout("components/StateContainer.tsx", [
        index("routes/Calendar/Calendar.tsx"),
        route("open/:day", "routes/Open/Open.tsx"),
        route("settings", "routes/Admin/Admin.tsx"),
      ]),
    ]),
  ]),
  route("/api/:name", "routes/api.ts"),
] satisfies RouteConfig;
