import liff from '@line/liff';

const LIFF_ID = import.meta.env.VITE_LINE_LIFF_ID || '2011098313-nFOisgmf';

export const liffService = {
  profile: null,
  isInitialized: false,

  async init() {
    if (this.isInitialized) return this.profile;

    const targetLiffId = LIFF_ID || '2011098313-nFOisgmf';

    try {
      await liff.init({ liffId: targetLiffId });
      this.isInitialized = true;
      console.log('✅ LINE LIFF initialized successfully with ID:', targetLiffId);

      if (liff.isLoggedIn()) {
        const profile = await liff.getProfile();
        this.profile = profile;
        console.log('👤 LINE User Profile:', profile);
        return profile;
      } else {
        if (liff.isInClient()) {
          liff.login();
        }
      }
    } catch (error) {
      console.error('❌ LINE LIFF initialization failed:', error);
    }
    return null;
  },

  isInClient() {
    try {
      return this.isInitialized && liff.isInClient();
    } catch (e) {
      return false;
    }
  },

  isLoggedIn() {
    try {
      return this.isInitialized && liff.isLoggedIn();
    } catch (e) {
      return false;
    }
  },

  async login() {
    try {
      if (!this.isInitialized) {
        await this.init();
      }
      if (this.isInitialized && !liff.isLoggedIn()) {
        liff.login({ redirectUri: window.location.href });
        return;
      }
    } catch (e) {
      console.warn("Direct LIFF SDK login error:", e);
    }
  },

  logout() {
    try {
      if (this.isInitialized && liff.isLoggedIn()) {
        liff.logout();
      }
    } catch (e) {}
    this.profile = null;
    localStorage.removeItem('line_user_id');
    localStorage.removeItem('line_user_name');
    window.location.reload();
  },

  async getProfile() {
    if (this.profile) return this.profile;
    if (this.isInitialized && liff.isLoggedIn()) {
      try {
        const profile = await liff.getProfile();
        this.profile = profile;
        return profile;
      } catch (err) {
        console.error('Failed to get LIFF profile:', err);
      }
    }
    return null;
  },

  async sendMealMessageAndClose(meal) {
    if (this.isInClient()) {
      try {
        const text = `🍱 已在 App 記錄餐點：${meal.dish_name} (${meal.calories} kcal, 蛋白質 ${meal.protein}g${meal.water ? `, 水分 ${meal.water}ml` : ''}${meal.comment ? `, 備註: ${meal.comment}` : ''})`;
        await liff.sendMessages([{ type: 'text', text }]);
        liff.closeWindow();
        return true;
      } catch (err) {
        console.warn('LIFF sendMessages error:', err);
      }
    }
    return false;
  }
};
