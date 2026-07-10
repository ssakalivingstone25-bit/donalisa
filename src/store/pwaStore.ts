import { create } from 'zustand';

interface PwaState {
  deferredPrompt: any;
  isInstallable: boolean;
  isInstalled: boolean;
  setDeferredPrompt: (prompt: any) => void;
  clearDeferredPrompt: () => void;
  installApp: () => Promise<boolean>;
  initPwaListeners: () => void;
}

export const usePwaStore = create<PwaState>((set, get) => ({
  deferredPrompt: null,
  isInstallable: false,
  isInstalled: false,

  setDeferredPrompt: (prompt) => set({ deferredPrompt: prompt, isInstallable: !!prompt }),
  clearDeferredPrompt: () => set({ deferredPrompt: null, isInstallable: false }),
  
  installApp: async () => {
    const promptEvent = get().deferredPrompt;
    if (!promptEvent) {
      console.warn('No installation prompt available.');
      return false;
    }

    try {
      // Show the browser install prompt
      promptEvent.prompt();

      // Wait for the user to respond to the prompt
      const { outcome } = await promptEvent.userChoice;
      console.log(`PWA install user choice outcome: ${outcome}`);
      
      // Clear the deferred prompt since it can't be used again
      get().clearDeferredPrompt();
      
      if (outcome === 'accepted') {
        set({ isInstalled: true });
        return true;
      }
    } catch (err) {
      console.error('Failed to trigger PWA install prompt:', err);
    }
    return false;
  },

  initPwaListeners: () => {
    if (typeof window === 'undefined') return;

    // Detect if app is already running in standalone mode (installed)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
      || (window.navigator as any).standalone 
      || document.referrer.includes('android-app://');
    
    set({ isInstalled: isStandalone });

    // Listen for beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e: any) => {
      // Prevent the default browser mini-infobar from showing
      e.preventDefault();
      // Store the event so it can be triggered later
      set({ deferredPrompt: e, isInstallable: true });
      console.log('PWA installation prompt is deferred and ready.');
    });

    // Listen for successful installation
    window.addEventListener('appinstalled', () => {
      set({ isInstalled: true, deferredPrompt: null, isInstallable: false });
      console.log('Donalisa PWA successfully installed!');
    });

    // Register service worker if supported
    if ('serviceWorker' in navigator) {
      // Register immediately if already loaded, otherwise on window load
      const registerSW = () => {
        navigator.serviceWorker.register('/firebase-messaging-sw.js')
          .then((reg) => {
            console.log('PWA Service Worker registered successfully with scope:', reg.scope);
          })
          .catch((err) => {
            console.error('PWA Service Worker registration failed:', err);
          });
      };

      if (document.readyState === 'complete') {
        registerSW();
      } else {
        window.addEventListener('load', registerSW);
      }
    }
  }
}));
