<template>
  <div class="min-h-screen bg-gray-950 flex items-center justify-center p-4 text-white">
    <div class="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl">
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold tracking-tighter">Klarix V2</h1>
        <p class="text-gray-400 mt-2 text-sm">Sign in to access your brand intelligence</p>
      </div>

      <div v-if="error" class="mb-4 p-3 bg-red-900/50 border border-red-800 text-red-200 text-sm rounded-lg text-center">
        {{ error }}
      </div>

      <form @submit.prevent="handleAuth" class="space-y-4">
        <div>
          <label class="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Email</label>
          <input 
            v-model="email" 
            type="email" 
            required 
            class="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
        
        <div>
          <label class="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Password</label>
          <input 
            v-model="password" 
            type="password" 
            required 
            class="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        <button 
          type="submit" 
          :disabled="loading"
          class="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors mt-6"
        >
          {{ loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account') }}
        </button>
      </form>

      <div class="mt-6 text-center">
        <button @click="isLogin = !isLogin" class="text-sm text-gray-400 hover:text-white transition-colors">
          {{ isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in" }}
        </button>
      </div>
      
      <div class="mt-8 text-center">
        <router-link to="/" class="text-xs text-gray-500 hover:text-gray-300 transition-colors">
          &larr; Back to V1 Public Home
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth';

const router = useRouter();
const authStore = useAuthStore();

const isLogin = ref(true);
const email = ref('');
const password = ref('');
const loading = ref(false);
const error = ref(null);

const handleAuth = async () => {
  loading.value = true;
  error.value = null;
  
  const endpoint = isLogin.value ? '/api/v2/auth/login' : '/api/v2/auth/register';
  
  try {
    const res = await fetch(`http://localhost:3001${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.value, password: password.value })
    });
    
    const data = await res.json();
    
    if (res.ok) {
      authStore.setUser(data.data.user);
      router.push('/dashboard');
    } else {
      error.value = data.message || 'Authentication failed';
    }
  } catch (e) {
    error.value = 'Network error. Please make sure the backend is running.';
  } finally {
    loading.value = false;
  }
};
</script>
