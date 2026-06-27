/// <reference types="vite/client" />

import type { SignalboxApi } from '../preload';

declare global {
  interface Window {
    signalbox?: SignalboxApi;
  }
}
