import { vitePlugin as remix } from "@remix-run/dev";
import { installGlobals } from "@remix-run/node";
import { defineConfig } from "vite";
// ❌ احذف هذا الاستيراد الثابت
// import { visualizer } from 'rollup-plugin-visualizer';
import tsconfigPaths from "vite-tsconfig-paths";
import { getViteSourceMapConfig } from "./app/config/source-maps";

installGlobals({ nativeFetch: true });

// Shopify workaround
if (
  process.env.HOST &&
  (!process.env.SHOPIFY_APP_URL ||
    process.env.SHOPIFY_APP_URL === process.env.HOST)
) {
  process.env.SHOPIFY_APP_URL = process.env.HOST;
  delete process.env.HOST;
}

let shopifyAppUrl = process.env.SHOPIFY_APP_URL;
if (!shopifyAppUrl || !/^https?:\/\//.test(shopifyAppUrl)) {
  shopifyAppUrl = "http://localhost";
}
const host = new URL(shopifyAppUrl).hostname;
let hmrConfig;

if (host === "localhost") {
  hmrConfig = {
    protocol: "ws",
    host: "localhost",
    port: 64999,
    clientPort: 64999,
  };
}

export default defineConfig(async () => {
  // ✅ حمل visualizer فقط في بيئة التطوير
  const rollupPlugins = [];
  if (process.env.NODE_ENV !== 'production') {
    const { visualizer } = await import('rollup-plugin-visualizer');
    rollupPlugins.push(
      visualizer({
        filename: './build/client/stats.html',
        open: false,
        gzipSize: true,
        brotliSize: true,
      })
    );
  }

  return {
    build: {
      assetsInlineLimit: 0,
      cssCodeSplit: true,
      sourcemap: false,
      ...getViteSourceMapConfig(),
      rollupOptions: {
        output: {
          assetFileNames: "assets/[name]-[hash][extname]",
          chunkFileNames: "assets/[name]-[hash].js",
          entryFileNames: "assets/[name]-[hash].js"
        },
        plugins: rollupPlugins
      },
      chunkSizeWarningLimit: 1000,
    },
    plugins: [
      remix({
        ssr: true,
        ignoredRouteFiles: ["**/.*", "**/*.backup", "**/*.tmp"],
        serverModuleFormat: "esm",
        resolve: {
          conditions: ["development", "browser"],
        }
      }),
      tsconfigPaths(),
    ],
    esbuild: {
      jsx: 'automatic'
    },
    resolve: {
      extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
      alias: {
        '~': '/Users/elhosseyn/Downloads/trackprofit/app'
      }
    },
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
        allow: ['..']
      }
    },
    publicDir: "public",
    appType: "custom"
  };
});
