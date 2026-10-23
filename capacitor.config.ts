import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.cetpass.app',
  appName: 'CETPass',
  webDir: 'dist',
  bundledWebRuntime: false,
  android: {
    allowMixedContent: false,
    captureInput: true,
    backgroundColor: '#0f1020',
  },
  server: {
    androidScheme: 'https',
    cleartext: false,
  },
}

export default config
