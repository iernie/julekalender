import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import type { Route } from "./+types/root";
import "./app.css";
import { Link } from "react-router";
import styles from "./root.module.css";

/**
 * og:image has to be an absolute URL, and meta functions only receive the
 * path, so the request origin is published here for descendant routes.
 */
export function loader({ request }: Route.LoaderArgs) {
  return { origin: new URL(request.url).origin };
}

export const meta: Route.MetaFunction = ({ loaderData }) => {
  const image = `${loaderData?.origin ?? ""}/logo192.png`;
  return [
    { title: "Julekalender as a Service" },
    { name: "description", content: "Lag din egen julekalender på et blunk." },
    { property: "og:site_name", content: "Julekalender as a Service" },
    { property: "og:type", content: "website" },
    { property: "og:title", content: "Julekalender as a Service" },
    { property: "og:description", content: "Lag din egen julekalender på et blunk." },
    { property: "og:image", content: image },
    { name: "twitter:card", content: "summary" },
    { name: "twitter:image", content: image },
  ];
};

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Calligraffitti&family=Playfair+Display:wght@700&family=Roboto:wght@400;700&display=swap",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="no">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#d52b1e" />
        <link rel="icon" href="/favicon.png" />
        <link rel="apple-touch-icon" href="/logo192.png" />
        <link rel="manifest" href="/manifest.json" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const notFound = isRouteErrorResponse(error) && error.status === 404;

  let message = "Oisann!";
  let details = "Noe uventet skjedde.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = notFound ? "404" : "Feil";
    details = notFound
      ? "Vi fant ikke denne siden. Kanskje kalenderen er slettet?"
      : error.statusText || details;
  } else if (import.meta.env.DEV && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className={styles.error}>
      <h1 className={styles.title}>{message}</h1>
      <p className={styles.details}>{details}</p>
      <Link to="/" className={styles.link}>
        Til forsiden
      </Link>
      {stack && (
        <pre className={styles.stack}>
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
