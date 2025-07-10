// scripts/optimize-assets.js
import { exec } from "child_process";
import path from "path";

const entryFile = "assets/index-JtBPHX8I.js";
console.log(`🔍 Running vite-bundle-visualizer on ${entryFile}...`);

exec(`npx vite-bundle-visualizer ${entryFile} --gzip --brotli`, {
  cwd: path.resolve("./build/client")
}, (err, stdout, stderr) => {
  if (err) {
    console.error("❌ Error running vite-bundle-visualizer:", err.message);
    return;
  }

  console.log(stdout);
  if (stderr) {
    console.error(stderr);
  } else {
    console.log("✅ Bundle analysis complete. Open `stats.html` in your browser.");
  }
});