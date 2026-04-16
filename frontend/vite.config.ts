import { defineConfig } from "vite";
import { devtools } from "@tanstack/devtools-vite";
import tsconfigPaths from "vite-tsconfig-paths";

import { tanstackRouter } from "@tanstack/router-plugin/vite";

import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

const config = defineConfig({
  plugins: [
    devtools(),
    tsconfigPaths({ projects: ["./tsconfig.json"] }),
    tailwindcss(),
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    viteReact({
      babel: {
        plugins: [
          ["babel-plugin-react-compiler", { target: "19" }],
          "relay",
          [
            "@locator/babel-jsx/dist",
            {
              env: "development",
            },
          ],
        ],
      },
    }),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      // The old Create-React-App–style manifest.json shipped by TanStack is
      // replaced by vite-plugin-pwa's generated manifest.webmanifest.
      filename: "sw.js",
      manifestFilename: "manifest.webmanifest",
      // Only include small, always-needed assets in the precache. Larger
      // documents (rule.pdf, deck-template.xlsx) and the 1200+ card images
      // are handled via runtime caching below.
      includeAssets: ["favicon.ico", "robots.txt", "pwa-icon.png"],
      manifest: {
        name: "건담 TCG 서포터",
        short_name: "GCG Deck",
        description: "Gundam Card Game deck builder and card browser.",
        lang: "ko",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "any",
        background_color: "#ffffff",
        theme_color: "#0b0b0b",
        icons: [
          {
            src: "favicon.ico",
            sizes: "16x16 24x24 32x32 48x48 64x64 72x72 96x96 128x128 256x256",
            type: "image/vnd.microsoft.icon",
          },
          {
            src: "pwa-icon.png",
            sizes: "any",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "pwa-icon.png",
            sizes: "any",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // Precache core app shell (JS/CSS/HTML/fonts). Card artwork is far
        // too large to precache — it's handled via runtime caching below.
        globPatterns: ["**/*.{js,css,html,woff,woff2,ico,svg}"],
        // 1268+ card images live in /cards and the deck template/rules are
        // large; don't try to inline them into the precache manifest.
        globIgnores: ["**/cards/**", "**/deck-template.xlsx", "**/rule.pdf"],
        navigateFallback: "/index.html",
        // Allow offline fallback to work across all client-side routes
        // handled by TanStack Router (the service worker serves index.html).
        navigateFallbackDenylist: [/^\/api\//, /^\/graphql/],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          {
            // Card artwork — cache-first, long TTL. Assets are content-
            // addressed by card code so they're effectively immutable.
            urlPattern: ({ url }) => url.pathname.startsWith("/cards/"),
            handler: "CacheFirst",
            options: {
              cacheName: "card-images",
              expiration: {
                maxEntries: 2000,
                maxAgeSeconds: 60 * 60 * 24 * 90, // 90 days
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Static template / rules PDF — stale-while-revalidate so
            // offline users keep working while updates trickle in.
            urlPattern: ({ url }) =>
              url.pathname === "/deck-template.xlsx" || url.pathname === "/rule.pdf",
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "static-docs",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // GraphQL / Relay queries — network-first so fresh data wins
            // when online, but the user still sees something offline.
            urlPattern: ({ url }) =>
              url.pathname.startsWith("/graphql") || url.pathname.startsWith("/api/"),
            handler: "NetworkFirst",
            options: {
              cacheName: "api",
              networkTimeoutSeconds: 5,
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        // Keep the SW disabled in `vite dev` by default — it interferes
        // with HMR. Set VITE_PWA_DEV=true to enable for manual testing.
        enabled: process.env.VITE_PWA_DEV === "true",
        type: "module",
        navigateFallback: "index.html",
      },
    }),
  ],
});

export default config;
