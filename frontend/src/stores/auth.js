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

  let initPromise = null;

  function checkSession() {
    if (!initPromise) {
      initPromise = fetch('/api/v2/auth/session', {credentials: 'include'})
        .then(async res => {
          if (res.ok) {
            const { data } = await res.json();
            setUser(data.user);
          }
        })
        .catch(() => {})
        .finally(() => {
          setInitializing(false);
        });
    }
    return initPromise;
  }

  return {
    user,
    isAuthenticated,
    activeBrand,
    isInitializing,
    setUser,
    setActiveBrand,
    clearAuth,
    setInitializing,
    checkSession
  };
});
