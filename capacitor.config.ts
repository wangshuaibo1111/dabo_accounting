import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dabo.accounting',
  appName: '大博记账',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    // 开发时可开启，指向本地 Vite 服务器实现热更新
    // url: 'http://10.0.2.2:1420',
    // cleartext: true,
  },
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystorePassword: undefined,
      keystoreAlias: undefined,
      keystoreAliasPassword: undefined,
    },
  },
};

export default config;
