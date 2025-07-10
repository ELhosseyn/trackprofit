import { vitePlugin as remix } from "@remix-run/dev";
import { installGlobals } from "@remix-run/node";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { getViteSourceMapConfig } from "./app/config/source-maps";

installGlobals({ nativeFetch: true });

// Related: https://github.com/remix-run/remix/issues/2835#issuecomment-1144102176
// Replace the HOST env var with SHOPIFY_APP_URL so that it doesn't break the remix server. The CLI will eventually
// stop passing in HOST, so we can remove this workaround after the next major release.
if (
  process.env.HOST &&
  (!process.env.SHOPIFY_APP_URL ||
    process.env.SHOPIFY_APP_URL === process.env.HOST)
) {
  process.env.SHOPIFY_APP_URL = process.env.HOST;
  delete process.env.HOST;
}

const host = new URL(process.env.SHOPIFY_APP_URL || "http://localhost")
  .hostname;
let hmrConfig;

if (host === "localhost") {
  hmrConfig = {
    protocol: "ws",
    host: "localhost",
    port: 64999,
    clientPort: 64999,
  };
}

export default defineConfig({
  build: {
    assetsInlineLimit: 0, // Don't inline assets
    cssCodeSplit: true, // Enable CSS code splitting
    ...getViteSourceMapConfig(), // Use our dynamic source map configuration
    rollupOptions: {
      // Remove manual chunks for now to avoid external module conflicts
      output: {
        assetFileNames: "assets/[name]-[hash][extname]",
        chunkFileNames: "assets/[name]-[hash].js",
        entryFileNames: "assets/[name]-[hash].js"
      }
    },
    chunkSizeWarningLimit: 1000, // Increase warning limit for larger chunks
  },
  // Exclude backup files from build processing
  plugins: [
    remix({
      ssr: true,
      ignoredRouteFiles: ["**/.*", "**/*.backup", "**/*.tmp"],
      serverModuleFormat: "esm",
      // Config for resolving JSX in .js files
      resolve: {
        conditions: ["development", "browser"],
      }
    }),
    tsconfigPaths(),
  ],
  // Add esbuild configuration to properly handle JSX in .js files
  esbuild: {
    jsx: 'automatic'
  },
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
    alias: {
      '~/components': '/Users/elhosseyn/Desktop/last/trackprofit/app/components',
      '~': '/Users/elhosseyn/Desktop/last/trackprofit/app'
    }
  },
  // Add configuration for handling JSX
  optimizeDeps: {
    include: ['react', 'react-dom'],
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
        '.jsx': 'jsx'
      }
    }
  },
  server: {
    hmr: hmrConfig,
    port: process.env.PORT || 3000,
    fs: {
      // Allow serving files from one level up to the project root
      allow: ['..']
    }
  },
  publicDir: "public",
  appType: "custom"
});
