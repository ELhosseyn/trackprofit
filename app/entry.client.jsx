import { RemixBrowser } from "@remix-run/react";
import { startTransition, StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import { initializeWebSocketErrorHandler } from "./utils/websocket-error-handler";

// Initialize the WebSocket error handler to prevent console errors
initializeWebSocketErrorHandler();

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <RemixBrowser />
    </StrictMode>
  );
});
