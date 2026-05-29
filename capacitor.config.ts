import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // Bundle ID no formato reverse-domain — deve bater com o App ID no Apple Developer Portal
  appId: 'com.solviss.app',
  appName: 'Solviss',
  webDir: 'dist',

  // PRODUÇÃO: sem server.url (carrega os assets locais do bundle)
  // Descomente o bloco abaixo APENAS para desenvolvimento com live-reload:
  // server: {
  //   url: 'http://SEU_IP_LOCAL:8080',
  //   cleartext: true,
  // },

  ios: {
    contentInset: 'automatic',      // respeita safe-area (notch, Dynamic Island)
    scrollEnabled: true,
    backgroundColor: '#ffffff',     // cor enquanto o splash carrega
    preferredContentMode: 'mobile',
    limitsNavigationsToAppBoundDomains: true, // segurança: bloqueia navegação para fora do app
  },

  plugins: {
    Camera: {
      // Textos exibidos pelo iOS ao pedir permissão
      // Não precisam ser configurados aqui — vão no Info.plist (ver docs/ios-setup.md)
    },

    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#01696f',       // verde Solviss
      sound: 'default',
    },

    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#f7f6f2',  // bege Nexus (igual ao --color-bg)
      showSpinner: false,          // spinner off — usamos a splash image
      splashFullScreen: true,
      splashImmersive: true,
      iosSpinnerStyle: 'small',
      spinnerColor: '#01696f',
    },

    StatusBar: {
      style: 'Default',            // escuro no light mode, claro no dark mode
      backgroundColor: '#f7f6f2',
      overlaysWebView: false,
    },
  },
};

export default config;
