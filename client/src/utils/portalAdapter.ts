declare global {
  interface Window {
    PortalAdapter?: { init: (gameId: string) => void };
  }
}

/** Optional integration: only called after an explicit feature opt-in. */
export function connectPortalAdapter() {
  const script = document.createElement('script');
  script.src = 'https://parris-tech-services.github.io/WhirringWilderness/network/portal-adapter.js';
  script.async = true;
  script.onload = () => {
    try {
      window.PortalAdapter?.init('buckland-blocks');
    } catch (error) {
      console.warn('Optional game portal could not connect.', error);
    }
  };
  script.onerror = () => console.warn('Optional game portal is unavailable; local play remains available.');
  document.head.append(script);
}
