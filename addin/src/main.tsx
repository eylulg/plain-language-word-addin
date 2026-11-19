import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createRewriteClient } from '@/api/rewrite-client';
import { GatewayProvider } from '@/office/GatewayProvider';
import { createPreviewGateway } from '@/office/preview-gateway';
import type { WordGateway } from '@/office/types';
import { createWordGateway } from '@/office/word-gateway';
import { App } from '@/taskpane/App';
import { OfficeThemeDefault } from '@/taskpane/OfficeThemeDefault';
import '@/styles/globals.css';

function isDark(hexColor: string): boolean {
  const hex = hexColor.replace('#', '');
  const channel = (start: number) => parseInt(hex.slice(start, start + 2), 16);
  return channel(0) * 0.299 + channel(2) * 0.587 + channel(4) * 0.114 < 128;
}

function readOfficeDark(): boolean | undefined {
  const background = Office.context.officeTheme?.bodyBackgroundColor;
  return background ? isDark(background) : undefined;
}

function render(gateway: WordGateway, followOffice = false) {
  const root = document.getElementById('root');
  if (!root) throw new Error('Missing #root element.');
  createRoot(root).render(
    <StrictMode>
      <GatewayProvider gateway={gateway}>
        <App client={createRewriteClient()} />
      </GatewayProvider>
      {followOffice && <OfficeThemeDefault readDark={readOfficeDark} />}
    </StrictMode>,
  );
}

if (typeof Office === 'undefined') {
  // office.js did not load, for example offline in a plain browser tab.
  render(createPreviewGateway());
} else {
  Office.onReady()
    .then((info) => {
      if (info.host !== Office.HostType.Word) {
        render(createPreviewGateway());
        return;
      }
      render(createWordGateway(), true);
    })
    .catch(reportError);
}
