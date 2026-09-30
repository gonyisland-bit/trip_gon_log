import type { CapacitorConfig } from '@capacitor/cli';

// Store app (v1.3.6 6-d): the built site in dist/ wrapped for Android and iOS.
// Build the site with VITE_API_ORIGIN set to the deployed address so the app reaches the
// server functions, then `npm run cap:sync` and open the native project.
// appId is permanent once the app is in a store; change it here before the first upload.
const config: CapacitorConfig = {
  appId: 'com.tripgonlog.app',
  appName: 'Tripgon log',
  webDir: 'dist',
  backgroundColor: '#F6F4EF',
  android: {
    backgroundColor: '#F6F4EF',
  },
  ios: {
    backgroundColor: '#F6F4EF',
    contentInset: 'always',
  },
};

export default config;
