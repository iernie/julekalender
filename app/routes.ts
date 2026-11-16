import { type RouteConfig, index, layout, prefix, route } from "@react-router/dev/routes";

export default [
  layout("routes/App/App.tsx", [
    index("routes/Welcome/Welcome.tsx"),
    layout("components/StateContainer.tsx", [
      ...prefix(":name", [
        index("routes/Calendar/Calendar.tsx"),
        route("open/:day", "routes/Open/Open.tsx"),
        route("settings", "routes/Admin/Admin.tsx"),
      ]),
    ]),
  ]),
  route("og/:name/og.png", "routes/og.calendar.ts"),
  route("og/:name/:day/og.png", "routes/og.day.ts"),
] satisfies RouteConfig;
