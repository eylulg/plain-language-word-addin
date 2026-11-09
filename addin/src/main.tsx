import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createRewriteClient } from "@/api/rewrite-client";
import { createPreviewGateway, createWordGateway, GatewayProvider, type WordGateway } from "@/office";
import { App } from "@/taskpane/App";
import "@/styles/globals.css";

function applyOfficeTheme() {
  const background = Office.context?.officeTheme?.bodyBackgroundColor;
  if (!background) return;
  const hex = background.replace("#", "");
  const luminance =
    parseInt(hex.slice(0, 2), 16) * 0.299 +
    parseInt(hex.slice(2, 4), 16) * 0.587 +
    parseInt(hex.slice(4, 6), 16) * 0.114;
  document.documentElement.classList.toggle("dark-mode", luminance < 128);
}

function render(gateway: WordGateway) {
  const root = document.getElementById("root");
  if (!root) throw new Error("Missing #root element.");
  createRoot(root).render(
    <StrictMode>
      <GatewayProvider gateway={gateway}>
        <App client={createRewriteClient()} />
      </GatewayProvider>
    </StrictMode>,
  );
}

if (typeof Office === "undefined") {
  // office.js did not load, for example offline in a plain browser tab.
  render(createPreviewGateway());
} else {
  void Office.onReady((info) => {
    if (info.host === Office.HostType.Word) {
      applyOfficeTheme();
      render(createWordGateway());
    } else {
      render(createPreviewGateway());
    }
  });
}
