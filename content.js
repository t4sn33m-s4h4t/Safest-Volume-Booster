(function () {
  function applyGain(video, volume) {
    if (!video._gainNode) {
      try {
        const context = new (window.AudioContext || window.webkitAudioContext)();
        const source = context.createMediaElementSource(video);
        const gainNode = context.createGain();
        source.connect(gainNode).connect(context.destination);

        video._gainNode = gainNode;
        video._audioContext = context;

        video.addEventListener("play", () => {
          if (context.state === "suspended") {
            context.resume();
          }
        });
      } catch (e) {
        // Element may already be connected to an AudioContext elsewhere; ignore.
        return;
      }
    }

    video._gainNode.gain.value = volume;
  }

  function applyToAllVideos(volume) {
    document.querySelectorAll("video").forEach((video) => applyGain(video, volume));
  }

  function init() {
    chrome.storage.local.get(["boostVolume", "extensionEnabled"], (result) => {
      const enabled = result.extensionEnabled !== false; // default true
      if (!enabled) return;

      const volume = typeof result.boostVolume === "number" ? result.boostVolume : 1.0;
      if (volume === 1.0) return; // nothing to boost, skip extra audio context setup

      applyToAllVideos(volume);

      // Watch for videos added after initial load (e.g. SPA navigation, lazy load)
      const observer = new MutationObserver(() => {
        applyToAllVideos(volume);
      });
      observer.observe(document.documentElement, { childList: true, subtree: true });
    });
  }

  // Re-apply whenever the saved volume or enabled state changes
  chrome.storage.onChanged.addListener((changes) => {
    if (!("boostVolume" in changes) && !("extensionEnabled" in changes)) return;

    chrome.storage.local.get(["boostVolume", "extensionEnabled"], (result) => {
      const enabled = result.extensionEnabled !== false;
      const volume = typeof result.boostVolume === "number" ? result.boostVolume : 1.0;
      if (enabled) {
        applyToAllVideos(volume);
      } else {
        applyToAllVideos(1.0);
      }
    });
  });

  init();
})();
