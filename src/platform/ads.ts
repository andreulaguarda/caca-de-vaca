import { Capacitor } from '@capacitor/core';

const TEST_ADS = {
  bannerAndroid: 'ca-app-pub-3940256099942544/6300978111',
  interstitialAndroid: 'ca-app-pub-3940256099942544/1033173712'
};

type AdMobModule = typeof import('@capacitor-community/admob');

class AdsManager {
  private module: AdMobModule | null = null;
  private initialized = false;
  private initializing: Promise<void> | null = null;
  private bannerVisible = false;
  private interstitialReady = false;
  private lastInterstitial = 0;
  private mockAdOpen = false;
  private readonly native = Capacitor.isNativePlatform();

  get isNative(): boolean {
    return this.native;
  }

  async init(): Promise<void> {
    document.documentElement.classList.toggle('native', this.native);
    if (!this.native) {
      document.documentElement.style.setProperty('--banner-space', '60px');
      return;
    }
    if (this.initialized) return;
    if (this.initializing) return this.initializing;
    this.initializing = this.initializeNative();
    await this.initializing;
    this.initializing = null;
  }

  private async initializeNative(): Promise<void> {
    try {
      const module = await import('@capacitor-community/admob');
      this.module = module;
      const { AdMob, AdmobConsentStatus, BannerAdPluginEvents } = module;
      let consent = await AdMob.requestConsentInfo();
      if (
        consent.isConsentFormAvailable &&
        consent.status === AdmobConsentStatus.REQUIRED
      ) {
        consent = await AdMob.showConsentForm();
      }
      if (!consent.canRequestAds) {
        return;
      }
      await AdMob.initialize();
      await AdMob.addListener(BannerAdPluginEvents.SizeChanged, (size) => {
        const reserve = size.height > 0 ? size.height : 0;
        document.documentElement.style.setProperty('--banner-space', `${reserve}px`);
      });
      this.initialized = true;
      if (this.bannerVisible) {
        await this.showNativeBanner();
      }
      await this.prepareNativeInterstitial();
    } catch {
      this.initialized = false;
    }
  }

  async showBanner(): Promise<void> {
    this.bannerVisible = true;
    document.getElementById('app')?.classList.add('ads-visible');
    if (!this.native) {
      document.documentElement.style.setProperty('--banner-space', '60px');
      return;
    }
    await this.init();
    if (this.initialized) {
      await this.showNativeBanner();
    }
  }

  async hideBanner(): Promise<void> {
    this.bannerVisible = false;
    document.getElementById('app')?.classList.remove('ads-visible');
    if (!this.native || !this.initialized || !this.module) return;
    try {
      await this.module.AdMob.hideBanner();
    } catch {
      return;
    }
  }

  private async showNativeBanner(): Promise<void> {
    if (!this.module) return;
    const { AdMob, BannerAdPosition, BannerAdSize } = this.module;
    try {
      await AdMob.showBanner({
        adId: TEST_ADS.bannerAndroid,
        adSize: BannerAdSize.ADAPTIVE_BANNER,
        position: BannerAdPosition.BOTTOM_CENTER,
        margin: 0,
        isTesting: true
      });
      document.getElementById('app')?.classList.add('ads-visible');
    } catch {
      return;
    }
  }

  async prepareInterstitial(): Promise<void> {
    if (!this.native) {
      this.interstitialReady = true;
      return;
    }
    await this.init();
    if (this.initialized) {
      await this.prepareNativeInterstitial();
    }
  }

  private async prepareNativeInterstitial(): Promise<void> {
    if (!this.module || this.interstitialReady) return;
    try {
      await this.module.AdMob.prepareInterstitial({
        adId: TEST_ADS.interstitialAndroid,
        isTesting: true
      });
      this.interstitialReady = true;
    } catch {
      this.interstitialReady = false;
    }
  }

  async maybeShowInterstitial(completedRuns: number): Promise<boolean> {
    if (this.mockAdOpen || completedRuns < 1) return false;
    if (completedRuns % 2 !== 0) return false;
    const now = Date.now();
    if (now - this.lastInterstitial < 75000) return false;
    this.lastInterstitial = now;
    if (!this.native) {
      await this.showMockInterstitial();
      return true;
    }
    await this.init();
    if (!this.module || !this.initialized) return false;
    if (!this.interstitialReady) {
      await this.prepareNativeInterstitial();
    }
    if (!this.interstitialReady) return false;
    try {
      this.interstitialReady = false;
      await this.module.AdMob.showInterstitial();
      window.setTimeout(() => void this.prepareNativeInterstitial(), 1800);
      return true;
    } catch {
      return false;
    }
  }

  private showMockInterstitial(): Promise<void> {
    this.mockAdOpen = true;
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'mock-interstitial';
      const box = document.createElement('div');
      box.className = 'mock-ad-box';
      const kicker = document.createElement('span');
      kicker.textContent = 'ANUNCIO DE PRUEBA';
      const title = document.createElement('strong');
      title.textContent = 'Aquí irá el intersticial AdMob';
      const text = document.createElement('p');
      text.textContent = 'En Android se mostrará el anuncio de prueba real al terminar la partida.';
      const close = document.createElement('button');
      close.textContent = 'CERRAR';
      close.disabled = true;
      box.append(kicker, title, text, close);
      overlay.append(box);
      document.querySelector('#app')?.append(overlay);
      window.setTimeout(() => {
        close.disabled = false;
      }, 1500);
      close.addEventListener('click', () => {
        overlay.remove();
        this.mockAdOpen = false;
        resolve();
      });
    });
  }
}

export const ads = new AdsManager();
