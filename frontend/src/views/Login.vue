<template>
  <div class="min-h-screen bg-gray-950 flex items-center justify-center p-4 text-white font-sans selection:bg-indigo-500 selection:text-white">
    <div class="w-full max-w-md bg-gray-900 border border-gray-800 rounded-[2rem] p-8 sm:p-10 shadow-2xl relative overflow-hidden transition-all duration-300">
      
      <!-- Ambient styling -->
      <div class="absolute top-0 left-1/2 -translate-x-1/2 w-[200px] h-1 bg-indigo-500 rounded-b-full shadow-[0_0_20px_rgba(99,102,241,0.5)]"></div>

      <div class="text-center mb-8 mt-2">
        <h1 class="text-3xl font-black tracking-tight text-white mb-2">Klarix <span class="text-indigo-400 text-lg align-top">V2</span></h1>
        <p class="text-gray-400 text-sm font-medium">
          {{ authState === 'forgot' ? 'Reset your security key' : (isVerifyingRegistration ? 'Verify your email address' : 'Authenticate to access your workspace') }}
        </p>
      </div>

      <div v-if="error" class="mb-6 p-4 bg-red-900/20 border border-red-900/50 text-red-400 text-sm font-medium rounded-xl text-center shadow-sm">
        {{ error }}
      </div>
      <div v-if="successMsg" class="mb-6 p-4 bg-emerald-900/20 border border-emerald-900/50 text-emerald-400 text-sm font-medium rounded-xl text-center shadow-sm">
        {{ successMsg }}
      </div>

      <!-- Auth Method Toggle (Hidden during Forgot Password and Verification flows) -->
      <div v-if="authState !== 'forgot' && !isVerifyingRegistration" class="flex p-1 mb-8 bg-gray-950 rounded-xl border border-gray-800 shadow-inner">
        <button 
          @click="authMethod = 'email'" 
          :class="['flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors', authMethod === 'email' ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300']"
        >
          Email & Social
        </button>
        <button 
          @click="authMethod = 'otp'" 
          :class="['flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors', authMethod === 'otp' ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300']"
        >
          Login with Code
        </button>
      </div>

      <!-- ───────────────────────────────────────────────────────────────── -->
      <!-- TAB 1: EMAIL & GOOGLE -->
      <!-- ───────────────────────────────────────────────────────────────── -->
      <div v-if="authState === 'login' && authMethod === 'email'" class="animate-fade-in">
        
        <!-- STATE A: Standard Login / Registration Form -->
        <div v-if="!isVerifyingRegistration" class="animate-fade-in">
          <div class="mb-6 flex justify-center">
            <GoogleLogin :callback="handleGoogleLogin" />
          </div>

          <div class="relative flex items-center py-5">
            <div class="flex-grow border-t border-gray-800"></div>
            <span class="flex-shrink-0 mx-4 text-[10px] uppercase tracking-widest text-gray-500 font-bold">Or continue with email</span>
            <div class="flex-grow border-t border-gray-800"></div>
          </div>

          <form @submit.prevent="handleEmailAuth" class="space-y-5">
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
              <div class="flex justify-between items-center mb-1.5">
                <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">Security Key</label>
                <button v-if="isLogin" type="button" @click="authState = 'forgot'; error = null; successMsg = null;" class="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold tracking-wider transition-colors">
                  Forgot password?
                </button>
              </div>
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
                {{ loading ? 'Processing...' : (isLogin ? 'Sign In →' : 'Initialize Account →') }}
              </button>
            </div>
          </form>

          <div class="mt-8 text-center border-t border-gray-800 pt-6">
            <button @click="isLogin = !isLogin; error = null" class="text-xs font-bold text-gray-400 hover:text-white uppercase tracking-wider transition-colors">
              {{ isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in" }}
            </button>
          </div>
        </div>

        <!-- STATE B: Registration Verification Lock -->
        <form v-else @submit.prevent="handleVerifyRegistration" class="space-y-5 animate-fade-in">
          <div class="text-center mb-6">
            <p class="text-sm text-gray-400">Enter the 6-digit activation code sent to <strong class="text-white block mt-1">{{ email }}</strong></p>
          </div>
          
          <div>
            <input 
              v-model="registrationOtp" 
              type="text" 
              inputmode="numeric"
              pattern="[0-9]*"
              maxlength="6"
              required 
              class="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-4 text-white font-black text-center text-2xl tracking-[0.5em] focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner placeholder-gray-800"
              placeholder="000000"
            />
          </div>
          
          <div class="pt-2">
            <button 
              type="submit" 
              :disabled="loading || registrationOtp.length !== 6"
              class="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 disabled:text-gray-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-[0_10px_25px_rgba(79,70,229,0.2)] hover:shadow-[0_15px_30px_rgba(79,70,229,0.3)] uppercase tracking-wider text-sm flex justify-center items-center gap-2"
            >
              <svg v-if="loading" class="animate-spin w-4 h-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {{ loading ? 'Verifying...' : 'Unlock Account →' }}
            </button>
          </div>
          
          <div class="text-center mt-4">
            <button type="button" @click="isVerifyingRegistration = false; error = null" class="text-xs font-bold text-gray-500 hover:text-gray-300 uppercase tracking-wider transition-colors">
              Cancel
            </button>
          </div>
        </form>

      </div>

      <!-- ───────────────────────────────────────────────────────────────── -->
      <!-- TAB 2: EMAIL OTP (PASSWORDLESS) -->
      <!-- ───────────────────────────────────────────────────────────────── -->
      <div v-if="authState === 'login' && authMethod === 'otp'" class="animate-fade-in">
        
        <form v-if="otpState === 'request'" @submit.prevent="handleOtpRequest" class="space-y-5">
          <div>
            <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Email Address</label>
            <input 
              v-model="otpEmail" 
              type="email" 
              required 
              class="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3.5 text-white font-medium focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner placeholder-gray-600"
              placeholder="ceo@brand.com"
            />
          </div>
          
          <div class="pt-2">
            <button 
              type="submit" 
              :disabled="loading"
              class="w-full bg-gray-100 hover:bg-white disabled:bg-gray-800 disabled:text-gray-500 text-gray-900 font-bold py-3.5 rounded-xl transition-all shadow-sm uppercase tracking-wider text-sm flex justify-center items-center gap-2"
            >
              <svg v-if="loading" class="animate-spin w-4 h-4 text-gray-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {{ loading ? 'Generating...' : 'Send Access Code' }}
            </button>
          </div>
        </form>

        <form v-if="otpState === 'verify'" @submit.prevent="handleOtpVerify" class="space-y-5">
          <div class="text-center mb-6">
            <p class="text-sm text-gray-400">Enter the 6-digit access code sent to <strong class="text-white block mt-1">{{ otpEmail }}</strong></p>
          </div>
          
          <div>
            <input 
              v-model="otpCode" 
              type="text" 
              inputmode="numeric"
              pattern="[0-9]*"
              maxlength="6"
              required 
              class="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-4 text-white font-black text-center text-2xl tracking-[0.5em] focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner placeholder-gray-800"
              placeholder="000000"
            />
          </div>
          
          <div class="pt-2">
            <button 
              type="submit" 
              :disabled="loading || otpCode.length !== 6"
              class="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 disabled:text-gray-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-[0_10px_25px_rgba(79,70,229,0.2)] hover:shadow-[0_15px_30px_rgba(79,70,229,0.3)] uppercase tracking-wider text-sm flex justify-center items-center gap-2"
            >
              <svg v-if="loading" class="animate-spin w-4 h-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {{ loading ? 'Verifying...' : 'Verify & Enter →' }}
            </button>
          </div>
          
          <div class="text-center mt-4">
            <button type="button" @click="otpState = 'request'; error = null" class="text-xs font-bold text-gray-500 hover:text-gray-300 uppercase tracking-wider transition-colors">
              Change Email Address
            </button>
          </div>
        </form>
      </div>

      <!-- ───────────────────────────────────────────────────────────────── -->
      <!-- TAB 3: FORGOT PASSWORD -->
      <!-- ───────────────────────────────────────────────────────────────── -->
      <div v-if="authState === 'forgot'" class="animate-fade-in">
        <form @submit.prevent="handleForgotPassword" class="space-y-5">
          <div class="text-center mb-6">
            <p class="text-sm text-gray-400">Enter your email and we'll send you a secure link to reset your security key.</p>
          </div>

          <div>
            <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Email Address</label>
            <input 
              v-model="resetEmail" 
              type="email" 
              required 
              class="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3.5 text-white font-medium focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner placeholder-gray-600"
              placeholder="ceo@brand.com"
            />
          </div>

          <div class="pt-2 space-y-4">
            <button 
              type="submit" 
              :disabled="loading"
              class="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 disabled:text-gray-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-[0_10px_25px_rgba(79,70,229,0.2)] hover:shadow-[0_15px_30px_rgba(79,70,229,0.3)] uppercase tracking-wider text-sm flex justify-center items-center gap-2"
            >
              <svg v-if="loading" class="animate-spin w-4 h-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {{ loading ? 'Processing...' : 'Send Reset Link' }}
            </button>
            
            <button 
              type="button" 
              @click="authState = 'login'; error = null; successMsg = null;"
              class="w-full bg-transparent hover:bg-gray-800 text-gray-400 font-bold py-3.5 rounded-xl transition-all uppercase tracking-wider text-xs"
            >
              ← Back to Login
            </button>
          </div>
        </form>
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

// UI State
const authState = ref('login'); 
const authMethod = ref('email'); 
const isLogin = ref(true); 
const otpState = ref('request'); 
const isVerifyingRegistration = ref(false); // The new Registration Verification Lock state

// Form Data
const email = ref('');
const password = ref('');
const registrationOtp = ref(''); // For unlocking the account
const otpEmail = ref(''); // For passwordless
const otpCode = ref('');
const resetEmail = ref('');

const loading = ref(false);
const error = ref(null);
const successMsg = ref(null);

// Reset forms cleanly when switching tabs or modes
watch([authMethod, isLogin, authState], () => {
  error.value = null;
  successMsg.value = null;
  isVerifyingRegistration.value = false;
  registrationOtp.value = '';
});

// ─────────────────────────────────────────────────────────────────────────────
// Google Login Handler
// ─────────────────────────────────────────────────────────────────────────────
const handleGoogleLogin = async (response) => {
  loading.value = true;
  error.value = null;
  
  try {
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
// Manual Registration & Login Handler
// ─────────────────────────────────────────────────────────────────────────────
const handleEmailAuth = async () => {
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
      if (data.data?.requireOtp) {
        // Backend locked the registration and sent an OTP
        successMsg.value = data.message;
        isVerifyingRegistration.value = true;
      } else {
        // Standard successful login
        authStore.setUser(data.data.user);
        router.push('/dashboard');
      }
    } else {
      error.value = data.message || 'Authentication failed.';
    }
  } catch (e) {
    error.value = 'Neural connection failed. Please ensure the backend server is running.';
  } finally {
    loading.value = false;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Registration Verification Handler (The Lock)
// ─────────────────────────────────────────────────────────────────────────────
const handleVerifyRegistration = async () => {
  loading.value = true;
  error.value = null;
  
  try {
    const res = await fetch('/api/v2/auth/verify-registration', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.value, code: registrationOtp.value })
    });
    
    const data = await res.json();
    if (res.ok) {
      authStore.setUser(data.data.user);
      router.push('/dashboard');
    } else {
      error.value = data.message || 'Invalid verification code.';
      registrationOtp.value = '';
    }
  } catch (e) {
    error.value = 'Neural connection failed.';
  } finally {
    loading.value = false;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Resend Email OTP Handlers (Passwordless Tab)
// ─────────────────────────────────────────────────────────────────────────────
const handleOtpRequest = async () => {
  loading.value = true;
  error.value = null;
  successMsg.value = null;
  
  try {
    const res = await fetch('/api/v2/auth/otp/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: otpEmail.value })
    });
    
    const data = await res.json();
    if (res.ok) {
      successMsg.value = 'Access code dispatched. Please check your inbox.';
      otpState.value = 'verify';
    } else {
      error.value = data.message || 'Failed to dispatch access code.';
    }
  } catch (e) {
    error.value = 'Neural connection failed.';
  } finally {
    loading.value = false;
  }
};

const handleOtpVerify = async () => {
  loading.value = true;
  error.value = null;
  
  try {
    const res = await fetch('/api/v2/auth/otp/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: otpEmail.value, code: otpCode.value })
    });
    
    const data = await res.json();
    if (res.ok) {
      authStore.setUser(data.data.user);
      router.push('/dashboard');
    } else {
      error.value = data.message || 'Invalid access code. Please try again.';
      otpCode.value = '';
    }
  } catch (e) {
    error.value = 'Neural connection failed.';
  } finally {
    loading.value = false;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Forgot Password Handler
// ─────────────────────────────────────────────────────────────────────────────
const handleForgotPassword = async () => {
  loading.value = true;
  error.value = null;
  successMsg.value = null;
  
  try {
    const res = await fetch('/api/v2/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: resetEmail.value })
    });
    
    if (res.ok) {
      successMsg.value = 'If an account exists, a reset link has been sent.';
      resetEmail.value = '';
    } else {
      const data = await res.json();
      error.value = data.message || 'Failed to process request.';
    }
  } catch (e) {
    error.value = 'Neural connection failed.';
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.3s ease-out forwards;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(5px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>