import { useMemo } from 'react';

// Heuristic detection of an in-app browser (WebView). These environments
// usually disable service workers and IndexedDB, so the offline-first stack
// won't work — we want to nudge the user to open the link in their real
// browser before they start filling things in.
const WEBVIEW_HINTS = [
  /FBAN\//i, /FBAV\//i,     // Facebook app
  /Instagram/i,
  /Twitter for/i,
  /Snapchat/i,
  /LinkedInApp/i,
  /; wv\)/i,                // Generic Android WebView
  /Line\//i,
  /MicroMessenger/i,        // WeChat
];

export function detectWebView() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return WEBVIEW_HINTS.some(re => re.test(ua));
}

export function useWebView() {
  return useMemo(() => detectWebView(), []);
}
