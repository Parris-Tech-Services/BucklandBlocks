import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import "./index.css";
import { isFeatureOn } from "./engine/features";


declare global {
  interface Window {
    PortalAdapter?: { init: (gameId: string) => void };
  }
}

function loadParrisUi() {
  if (!isFeatureOn("parrisui")) return;
  const script = document.createElement("script");
  script.src = "https://parris-tech-services.github.io/WhirringWilderness/network/portal-adapter.js?v=3";
  script.dataset.parrisUi = "true";
  script.addEventListener("load", () => window.PortalAdapter?.init("buckland-blocks"));
  document.head.appendChild(script);
}

loadParrisUi();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
);
