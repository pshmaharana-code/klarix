import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null);
  const isAuthenticated = ref(false);
  const activeBrand = ref(null);
  const isInitializing = ref(true);

  let initPromise = null;

  function setUser(userData) {
    user.value = userData;
    isAuthenticated.value = !!userData;
    isInitializing.value = false;
    if (userData) {
      initPromise = Promise.resolve();
    }
  }

  function setActiveBrand(brandData) {
    activeBrand.value = brandData;
  }

  function clearAuth() {
    user.value = null;
    isAuthenticated.value = false;
    activeBrand.value = null;
    initPromise = null;
  }

  async function logout() {
    try {
      await fetch('/api/v2/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (e) {
      // Proceed with local cleanup even if network fails
    } finally {
      clearAuth();
    }
  }

  function setInitializing(value) {
    isInitializing.value = value;
  }

  function checkSession() {
    if (!initPromise) {
      initPromise = fetch('/api/v2/auth/session', { credentials: 'include' })
        .then(async res => {
          if (res.ok) {
            const { data } = await res.json();
            setUser(data.user);
          } else {
            clearAuth();
          }
        })
        .catch(() => {
          clearAuth();
        })
        .finally(() => {
          setInitializing(false);
        });
    }
    return initPromise;
  }

  const lastSyncTimestamp = ref(Date.now());

  function triggerSyncUpdate() {
    lastSyncTimestamp.value = Date.now();
  }

  return {
    user,
    isAuthenticated,
    activeBrand,
    isInitializing,
    lastSyncTimestamp,
    setUser,
    setActiveBrand,
    clearAuth,
    logout,
    setInitializing,
    checkSession,
    triggerSyncUpdate
  };
});