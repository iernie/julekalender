import { defineConfig } from "vite";
import { reactRouter } from "@react-router/dev/vite";

export default defineConfig({
  environments: {
    ssr: {
      build: {
        rollupOptions: {
          input: ["virtual:react-router/server-build"],
        },
      },
    },
  },
  ssr: {
    noExternal: true,
    external: [
      "react-fast-compare",
      "fast-deep-equal",
      "js-cookie",
      "copy-to-clipboard",
      "nano-css",
      "screenfull",
      "react-universal-interface",
      "fast-shallow-equal",
      "ts-easing",
      "classnames",
      "tween-functions",
    ],
    optimizeDeps: {
      include: [
        "react",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "react-dom",
        "react-dom/server",
        "react-router",
        "firebase",
        "@grpc/grpc-js",
        "@grpc/proto-loader",
      ],
    },
  },
  plugins: [reactRouter()],
});
