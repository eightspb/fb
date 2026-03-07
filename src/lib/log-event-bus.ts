/**
 * In-memory event bus for real-time log streaming.
 * Stored on `globalThis` so there is exactly ONE instance per Node.js process,
 * regardless of how many times this module is evaluated (HMR, multiple route workers, etc.).
 */

import { EventEmitter } from 'events';

export const LOG_EVENT = 'log';

declare global {
  // eslint-disable-next-line no-var
  var __logEventBus: EventEmitter | undefined;
}

if (!globalThis.__logEventBus) {
  globalThis.__logEventBus = new EventEmitter();
  globalThis.__logEventBus.setMaxListeners(100);
}

const logEventBus = globalThis.__logEventBus;
export default logEventBus;
