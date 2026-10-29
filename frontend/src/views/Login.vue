<template>
  <div class="min-h-screen bg-gray-950 flex items-center justify-center p-4 text-white font-sans selection:bg-indigo-500 selection:text-white">
    <div class="w-full max-w-md bg-gray-900 border border-gray-800 rounded-[2rem] p-8 sm:p-10 shadow-2xl relative overflow-hidden">
      
      <!-- Ambient styling -->
      <div class="absolute top-0 left-1/2 -translate-x-1/2 w-[200px] h-1 bg-indigo-500 rounded-b-full shadow-[0_0_20px_rgba(99,102,241,0.5)]"></div>

      <div class="text-center mb-8 mt-2">
        <h1 class="text-3xl font-black tracking-tight text-white mb-2">Klarix <span class="text-indigo-400 text-lg align-top">V2</span></h1>
        <p class="text-gray-400 text-sm font-medium">Authenticate to access your workspace</p>
      </div>

      <div v-if="error" class="mb-6 p-4 bg-red-900/20 border border-red-900/50 text-red-400 text-sm font-medium rounded-xl text-center shadow-sm">
        {{ error }}
      </div>
      
      <!-- Google OAuth Section -->
      <div class="mb-6 flex justify-center">
        <!-- The GoogleLogin component handles the popup and returns the token -->
        <GoogleLogin :callback="handleGoogleLogin" />
      </div>

      <!-- Divider -->
      <div class="relative flex items-center py-5">
        <div class="flex-grow border-t border-gray-800"></div>
        <span class="flex-shrink-0 mx-4 text-[10px] uppercase tracking-widest text-gray-500 font-bold">Or continue with email</span>
        <div class="flex-grow border-t border-gray-800"></div>
      </div>

      <!-- Legacy Email/Password Form -->
      <form @submit.prevent="handleAuth" class="space-y-5">
        <div>
          <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Email Address</label>
          <input 
            v-model="email" 
            type="email" 
            required 
            class="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3.5 text-white font-medium focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner placeholder-gray-600"
            placeholder="ceo@brand.com"
          />
        </div>
        
        <div>
          <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Security Key</label>
          <input 
            v-model="password" 
            type="password" 
            required 
            class="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3.5 text-white font-medium focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner"
            placeholder="••••••••"
          />
        </div>

        <div class="pt-2">
          <button 
            type="submit" 
            :disabled="loading"
            class="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 disabled:text-gray-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-[0_10px_25px_rgba(79,70,229,0.2)] hover:shadow-[0_15px_30px_rgba(79,70,229,0.3)] uppercase tracking-wider text-sm flex justify-center items-center gap-2"
          >
            <svg v-if="loading" class="animate-spin w-4 h-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {{ loading ? 'Authenticating...' : (isLogin ? 'Sign In →' : 'Initialize Account →') }}
          </button>
        </div>
      </form>

      <div class="mt-8 text-center border-t border-gray-800 pt-6">
        <button @click="isLogin = !isLogin" class="text-xs font-bold text-gray-400 hover:text-white uppercase tracking-wider transition-colors">
          {{ isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in" }}
        </button>
      </div>
      
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const authStore = useAuthStore();

const isLogin = ref(true);
const email = ref('');
const password = ref('');
const loading = ref(false);
const error = ref(null);

watch(isLogin, () => {
  error.value = null;
  email.value = '';
  password.value = '';
});

// ─────────────────────────────────────────────────────────────────────────────
// Google Login Handler
// ─────────────────────────────────────────────────────────────────────────────
const handleGoogleLogin = async (response) => {
  loading.value = true;
  error.value = null;
  
  try {
    // Send the Google JWT token to our backend for verification
    const res = await fetch('/api/v2/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: response.credential })
    });
    
    const data = await res.json();
    
    if (res.ok) {
      authStore.setUser(data.data.user);
      router.push('/dashboard');
    } else {
      error.value = data.message || 'Google Authentication failed.';
    }
  } catch (e) {
    error.value = 'Network error. Please make sure the backend is running.';
  } finally {
    loading.value = false;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Legacy Email/Password Handler
// ─────────────────────────────────────────────────────────────────────────────
const handleAuth = async () => {
  loading.value = true;
  error.value = null;
  
  const endpoint = isLogin.value ? '/api/v2/auth/login' : '/api/v2/auth/register';
  
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.value, password: password.value })
    });
    
    const data = await res.json();
    
    if (res.ok) {
      authStore.setUser(data.data.user);
      router.push('/dashboard');
    } else {
      error.value = data.message || 'Authentication failed. Please verify your credentials.';
    }
  } catch (e) {
    error.value = 'Neural connection failed. Please ensure the backend server is running.';
  } finally {
    loading.value = false;
  }
};
</script>