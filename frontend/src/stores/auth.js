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
  }

  function setActiveBrand(brandData) {
    activeBrand.value = brandData;
  }

  function clearAuth() {
    user.value = null;
    isAuthenticated.value = false;
    activeBrand.value = null;
    // CRITICAL FIX: Reset the promise so session checks can run again after logout
    initPromise = null;
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
            clearAuth(); // Ensure clean state if session cookie is expired
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
    setInitializing,
    checkSession,
    triggerSyncUpdate
  };
});