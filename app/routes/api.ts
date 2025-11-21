import type { Route } from "./+types/api";

export async function loader({ params, request }: Route.LoaderArgs) {
  const searchParams = request.url.split("?");
  const apiKey =
    searchParams.length > 0
      ? new URLSearchParams(searchParams[1]).get("apiKey")
      : "";
  return fetch(
    "https://api-ozorugzyza-ew.a.run.app/api/" +
      params.name +
      "?apiKey=" +
      apiKey
  );
}
