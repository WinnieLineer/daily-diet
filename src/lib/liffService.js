import liff from '@line/liff';

const LIFF_ID = import.meta.env.VITE_LINE_LIFF_ID || '';

export const liffService = {
  profile: null,
  isInitialized: false,

  async init() {
    if (this.isInitialized) return this.profile;

    if (!LIFF_ID) {
      console.warn('⚠️ LINE LIFF ID is not configured (VITE_LINE_LIFF_ID). Running in standalone mode.');
      return null;
    }

    try {
      await liff.init({ liffId: LIFF_ID });
      this.isInitialized = true;
      console.log('✅ LINE LIFF initialized successfully.');

      if (liff.isLoggedIn()) {
        const profile = await liff.getProfile();
        this.profile = profile;
        console.log('👤 LINE User Profile:', profile);
        return profile;
      } else {
        // If we are in LIFF but not logged in, log in automatically
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
    return this.isInitialized && liff.isInClient();
  },

  isLoggedIn() {
    return this.isInitialized && liff.isLoggedIn();
  },

  login() {
    if (this.isInitialized && !liff.isLoggedIn()) {
      liff.login();
    }
  },

  logout() {
    if (this.isInitialized && liff.isLoggedIn()) {
      liff.logout();
      this.profile = null;
      window.location.reload();
    }
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
