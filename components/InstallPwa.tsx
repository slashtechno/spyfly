"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Download, PlusSquare, Share, X } from "lucide-react";

// Non-standard — Chrome/Edge/Samsung Internet only, not in lib.dom.d.ts.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari's own (also non-standard) flag for "already added to home screen".
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

// iOS Safari never fires beforeinstallprompt — Apple has no install API at
// all, install is only ever a manual Share-sheet action — so it's the one
// platform that needs static instructions instead of a real prompt. Other
// iOS browsers (Chrome/Firefox on iOS) are just Safari's engine underneath
// but can't trigger the share sheet's "Add to Home Screen" the same way, so
// this deliberately only matches actual Safari.
function isIosSafari(): boolean {
  const ua = navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua) && !("MSStream" in window);
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  return isIos && isSafari;
}

// Both read browser-only state via useSyncExternalStore rather than a
// useState+useEffect: that keeps the server/first-paint render safely
// "installed" (renders nothing) without a manual setState call in an
// effect body, and — for `installed` — lets the real appinstalled event
// double as the store's change notification instead of a separate
// listener-plus-setState effect.
function subscribeToInstall(cb: () => void) {
  window.addEventListener("appinstalled", cb);
  return () => window.removeEventListener("appinstalled", cb);
}
function getInstalledSnapshot(): boolean {
  return isStandalone();
}
function getInstalledServerSnapshot(): boolean {
  return true;
}

function subscribeNever() {
  return () => {};
}
function getIosEligibleSnapshot(): boolean {
  return isIosSafari();
}
function getIosEligibleServerSnapshot(): boolean {
  return false;
}

export default function InstallPwa() {
  const installed = useSyncExternalStore(
    subscribeToInstall,
    getInstalledSnapshot,
    getInstalledServerSnapshot,
  );
  const iosEligible = useSyncExternalStore(
    subscribeNever,
    getIosEligibleSnapshot,
    getIosEligibleServerSnapshot,
  );
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosModal, setShowIosModal] = useState(false);

  useEffect(() => {
    function onBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }
    function onInstalled() {
      setDeferredPrompt(null);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  // Nothing to offer: already installed, or a browser/platform combo with
  // no install path we can help with (e.g. desktop Firefox).
  if (installed || (!deferredPrompt && !iosEligible)) return null;

  async function handleClick() {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      return;
    }
    setShowIosModal(true);
  }

  return (
    <>
      <button
        onClick={handleClick}
        title="Install SpyFly"
        className="flex h-8 w-8 items-center justify-center rounded-sm border border-hairline bg-panel-1 text-ink-1 transition-colors hover:bg-panel-2 hover:text-ink-0"
      >
        <Download className="h-3.5 w-3.5" />
      </button>

      {showIosModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 p-4 backdrop-blur-sm"
          onClick={() => setShowIosModal(false)}
        >
          <div
            className="hud-frame relative w-full max-w-xs rounded bg-panel-0 p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowIosModal(false)}
              aria-label="Close"
              className="absolute right-3 top-3 text-ink-2 hover:text-ink-0"
            >
              <X className="h-4 w-4" />
            </button>
            <h2 className="font-display text-sm font-bold uppercase tracking-wide text-ink-0">
              Install SpyFly
            </h2>
            <p className="mt-3 font-mono text-xs leading-relaxed text-ink-1">
              iOS doesn&apos;t let sites trigger this automatically — add it from Safari&apos;s own
              menu for a fast, full-screen view:
            </p>
            <ol className="mt-3 space-y-2.5 font-mono text-xs text-ink-1">
              <li className="flex items-center gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border border-hairline text-[10px] text-ink-2">
                  1
                </span>
                Tap <Share className="h-3.5 w-3.5 shrink-0 text-ice" /> Share in the toolbar
              </li>
              <li className="flex items-center gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border border-hairline text-[10px] text-ink-2">
                  2
                </span>
                <span className="flex items-center gap-1.5">
                  Scroll down, tap <PlusSquare className="h-3.5 w-3.5 shrink-0 text-ice" /> Add to
                  Home Screen
                </span>
              </li>
            </ol>
          </div>
        </div>
      )}
    </>
  );
}
