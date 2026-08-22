import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null);
  const isAuthenticated = ref(false);
  const activeBrand = ref(null);
  const isInitializing = ref(true);

  function setUser(userData) {
    user.value = userData;
    isAuthenticated.value = !!userData;
  }

  function setActiveBrand(brandData) {
    activeBrand.value = brandData;
  }

  function clearAuth() {
    user.value = null;
    isAuthenticated.value = false;
    activeBrand.value = null;
  }

  function setInitializing(value) {
    isInitializing.value = value;
  }

  return {
    user,
    isAuthenticated,
    activeBrand,
    isInitializing,
    setUser,
    setActiveBrand,
    clearAuth,
    setInitializing
  };
});
