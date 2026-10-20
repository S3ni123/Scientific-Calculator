"use strict";

/* =========================================
   SCIENTIFIC CALCULATOR APP SUPPORT
========================================= */

if ("serviceWorker" in navigator && window.isSecureContext) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch((error) => {
      console.error("Offline support could not start:", error);
    });
  });
}

let installPrompt = null;

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  installPrompt = event;

  let installButton = document.getElementById("install-app");

  if (!installButton) {
    installButton = document.createElement("button");
    installButton.id = "install-app";
    installButton.type = "button";
    installButton.className = "small-action";
    installButton.textContent = "Install App";

    const actions = document.querySelector(".header-actions");

    if (actions) {
      actions.appendChild(installButton);
    }
  }

  installButton.hidden = false;

  installButton.addEventListener(
    "click",
    async () => {
      if (!installPrompt) return;

      installPrompt.prompt();

      await installPrompt.userChoice;

      installPrompt = null;
      installButton.hidden = true;
    },
    { once: true },
  );
});

window.addEventListener("appinstalled", () => {
  installPrompt = null;

  const installButton = document.getElementById("install-app");

  if (installButton) {
    installButton.remove();
  }
});
