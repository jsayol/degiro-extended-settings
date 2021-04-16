import { Settings } from "../common";

const BASE_THEME_ID = "--suite-theme-css";

let connectionPort: chrome.runtime.Port;
let currentTheme = "default";

/**
 * Monitor the connection to the extension's background page.
 * This allows us to detect if it get uninstalled or upgraded
 * so that we can do some cleanup.
 */
chrome.runtime.onConnect.addListener((port) => {
  connectionPort = port;
  connectionPort.onDisconnect.addListener(cleanup);
});

function initialize() {
  chrome.runtime.sendMessage({ op: "getSettings" }, handleSettingsUpdate);
  chrome.runtime.onMessage.addListener(onMessageHandler);
  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", colorSchemeChangeHandler);

  // If we're inside an iframe (quick order in popup) we mark
  // the page so that we can avoid applying themes for now.
  if (window.self !== window.top) {
    document.querySelector("html").dataset.suiteIframe = "true";
  }
}

function cleanup() {
  applyCustomTheme("default");
  chrome.runtime.onMessage.removeListener(onMessageHandler);
  connectionPort.onDisconnect.removeListener(cleanup);
}

function handleSettingsUpdate(settings: Settings) {
  applyCustomTheme(settings.theme);
}

function onMessageHandler(
  message: any,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: any) => void
): void {
  // Only handle messages that come from the extension itself (if theres `tab` then it comes from a content script)
  if (!sender.tab) {
    if (message.op === "settingsUpdate") {
      handleSettingsUpdate(message.settings);
    }
    if (message.op === "reload") {
      location.reload();
    }
  }
}

function colorSchemeChangeHandler(event: MediaQueryListEvent) {
  if (currentTheme === "auto") {
    applyAutoTheme(event.matches);
  }
}

function loadBaseTheme() {
  if (document.getElementById(BASE_THEME_ID)) {
    return;
  }
  const link = document.createElement("link");
  link.setAttribute("href", chrome.extension.getURL("content/styles/theme.css"));
  link.setAttribute("id", BASE_THEME_ID);
  link.setAttribute("type", "text/css");
  link.setAttribute("rel", "stylesheet");
  document.querySelector("html")?.appendChild(link);
}

function unloadBaseTheme() {
  const cssNode = document.getElementById(BASE_THEME_ID);
  if (cssNode && cssNode.parentNode) {
    cssNode.parentNode.removeChild(cssNode);
  }
}

function applyCustomTheme(theme: string) {
  if (!theme) {
    theme = "default";
  }

  if (theme === "auto") {
    if (currentTheme !== "auto") {
      // Determine which theme we should use
      const useDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      applyAutoTheme(useDark);
    }
  } else {
    document.querySelector("html").dataset.suiteTheme = theme;
    if (theme === "default") {
      unloadBaseTheme();
    } else {
      loadBaseTheme();
    }
  }

  currentTheme = theme;
}

function applyAutoTheme(useDark = false) {
  document.querySelector("html").dataset.suiteTheme = useDark
    ? "dark"
    : "default";
  if (useDark) {
    loadBaseTheme();
  } else {
    unloadBaseTheme();
  }
}

initialize();
