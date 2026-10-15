"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

/** Chrome's install prompt event (not in the DOM lib types yet). */
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Env = "ios" | "other" | "installed" | "server";

const noopSubscribe = () => () => {};

function readEnv(): Env {
  if (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
    return "installed";
  const ios =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    // iPadOS reports as a Mac with touch.
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  return ios ? "ios" : "other";
}

/**
 * "Install the app": on Android/desktop Chrome it opens the browser's install
 * dialog (only shown once Chrome says the app is installable); on iPhone,
 * where there is no install dialog, it shows the Share → Add to Home Screen
 * steps. Hidden once the app is installed or running as the installed app.
 */
export function InstallAppButton({ className }: { className?: string }) {
  const env = useSyncExternalStore<Env>(noopSubscribe, readEnv, () => "server");
  const [event, setEvent] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault(); // keep it for our own button
      setEvent(e as InstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setEvent(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (env === "server" || env === "installed" || installed) return null;
  if (env === "other" && !event) return null;

  async function install() {
    if (env === "ios") return setShowIosHelp((v) => !v);
    if (!event) return;
    await event.prompt();
    await event.userChoice;
    setEvent(null); // a prompt event can only be used once
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={install}
        aria-expanded={env === "ios" ? showIosHelp : undefined}
        data-testid="install-app"
        className="inline-flex min-h-11 items-center gap-2 rounded-2xl border-2 border-white/40 px-4 font-semibold text-white hover:border-white hover:bg-white/10"
      >
        <span aria-hidden>📲</span> Install the app
      </button>
      {env === "ios" && showIosHelp && (
        <p className="text-on-deep-muted mt-2 max-w-xs text-xs leading-relaxed">
          In Safari, tap the Share button (the square with an arrow), then{" "}
          <strong>Add to Home Screen</strong>.
        </p>
      )}
    </div>
  );
}
