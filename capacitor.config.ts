import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mesdemil.cacadevaca',
  appName: 'Caca de Vaca',
  webDir: 'dist',
  backgroundColor: '#65b74b',
  server: {
    androidScheme: 'https'
  },
  android: {
    backgroundColor: '#65b74b',
    allowMixedContent: false
  }
};

export default config;
