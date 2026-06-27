/**
 * Background Service Worker
 *
 * Wires the website tracker to lifecycle events and message routing.
 */

import { initTracker, shutdownTracker, getRankings, getFullHistory, resetData } from './tracker.js';
import type { ExtensionMessage, ExtensionResponse, RankingPeriod } from '@extensions/shared';
import { MSG } from '@extensions/shared';

// ─── Lifecycle ──────────────────────────────────────────

chrome.runtime.onInstalled.addListener((details) => {
  console.log(`[BG] Installed: ${details.reason}`);
});

chrome.runtime.onSuspend.addListener(async () => {
  console.log('[BG] Suspending — flushing data');
  await shutdownTracker();
});

// ─── Message Router ─────────────────────────────────────

async function handleMessage(message: ExtensionMessage): Promise<ExtensionResponse> {
  switch (message.type) {
    case MSG.GET_RANKINGS: {
      const period = (message.payload as { period?: RankingPeriod })?.period ?? 'day';
      const rankings = getRankings(period);
      return { success: true, data: rankings };
    }

    case MSG.GET_HISTORY: {
      const history = await getFullHistory();
      return { success: true, data: history };
    }

    case MSG.RESET_DATA: {
      await resetData();
      return { success: true, data: null };
    }

    case 'GET_TAB_INFO': {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      return {
        success: true,
        data: { url: tab?.url, title: tab?.title, id: tab?.id },
      };
    }

    default:
      return { success: false, error: `Unknown type: ${message.type}` };
  }
}

// ─── Boot ───────────────────────────────────────────────

// Set toolbar icon programmatically — three ascending bars (ranking chart)
function createIconImageData(size: number): ImageData {
  const pixels = new Uint8ClampedArray(size * size * 4);
  const cx = size / 2,
    cy = size / 2,
    maxR = cx - 1;
  const br = Math.max(2, size * 0.25);

  // Three ascending bars
  const barW = Math.max(2, size * 0.16);
  const barGap = Math.max(2, size * 0.08);
  const totalW = 3 * barW + 2 * barGap;
  const startX = Math.round(cx - totalW / 2);
  const bottom = Math.round(cy + size * 0.28);
  const heights = [0.28, 0.52, 0.8];

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const dx = x - cx,
        dy = y - cy;

      // Rounded square alpha
      const cd = Math.max(Math.abs(dx) - cx + br, Math.abs(dy) - cy + br, 0);
      const bgDist = cd > 0 ? cd : Math.max(Math.abs(dx), Math.abs(dy));
      const alpha = bgDist >= maxR ? 0 : Math.round(Math.max(0, (maxR - bgDist) / br) * 255);
      if (alpha === 0) {
        pixels[idx + 3] = 0;
        continue;
      }

      // Check three bars
      let inBar = false,
        barH = 0;
      for (let b = 0; b < 3; b++) {
        const bx = startX + b * (barW + barGap);
        const h = Math.round(size * heights[b]);
        if (x >= bx && x < bx + barW && y >= bottom - h && y < bottom) {
          inBar = true;
          barH = h;
          break;
        }
      }

      if (inBar) {
        // White bars with subtle gradient
        const g = 0.9 - (0.15 * (bottom - y)) / Math.max(1, bottom - (bottom - barH));
        pixels[idx] = Math.round(255 * (1 - g) + 99 * g);
        pixels[idx + 1] = Math.round(255 * (1 - g) + 102 * g);
        pixels[idx + 2] = Math.round(255 * (1 - g) + 241 * g);
        pixels[idx + 3] = Math.round(alpha * 0.92);
      } else {
        const g = 0.85 + 0.15 * (1 - Math.sqrt(dx * dx + dy * dy) / maxR);
        pixels[idx] = Math.round(99 * g);
        pixels[idx + 1] = Math.round(102 * g);
        pixels[idx + 2] = Math.round(241 * g);
        pixels[idx + 3] = alpha;
      }
    }
  }
  return new ImageData(pixels, size, size);
}

function setToolbarIcon() {
  const imageData: Record<number, ImageData> = {};
  for (const size of [16, 32, 48, 128]) {
    imageData[size] = createIconImageData(size);
  }
  chrome.action.setIcon({ imageData }).catch((err: unknown) => {
    console.warn('[BG] setIcon failed:', err);
  });
}

setToolbarIcon();

const ready = initTracker();
ready.catch((err) => console.error('[BG] Init failed:', err));

// Wrap message handling to wait for init
chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
  ready
    .then(() => handleMessage(message))
    .then((response) => sendResponse(response))
    .catch((error) => sendResponse({ success: false, error: error.message }));
  return true; // keep channel open
});

export {};
