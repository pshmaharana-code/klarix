<template>
  <div class="min-h-screen bg-gray-950 flex items-center justify-center p-4 text-white font-sans selection:bg-indigo-500 selection:text-white">
    <div class="w-full max-w-md bg-gray-900 border border-gray-800 rounded-[2rem] p-8 sm:p-10 shadow-2xl relative overflow-hidden transition-all duration-300">
      
      <!-- Top Ambient Bar -->
      <div class="absolute top-0 left-1/2 -translate-x-1/2 w-[200px] h-1 bg-indigo-500 rounded-b-full shadow-[0_0_20px_rgba(99,102,241,0.5)]"></div>

      <!-- Dynamic Header -->
      <div class="text-center mb-8 mt-2">
        <h1 class="text-3xl font-black tracking-tight text-white mb-2">
          Klarix <span class="text-indigo-400 text-lg align-top">V2</span>
        </h1>
        <p class="text-gray-400 text-sm font-medium">
          <template v-if="mode === 'login'">Authenticate to access your workspace</template>
          <template v-else-if="mode === 'register'">
            {{ regStep === 1 ? 'Create your Klarix account' : (regStep === 2 ? 'Verify your email address' : 'Set your security key') }}
          </template>
          <template v-else-if="mode === 'forgot'">
            {{ forgotStep === 1 ? 'Reset your security key' : (forgotStep === 2 ? 'Verify reset code' : 'Create a new security key') }}
          </template>
        </p>
      </div>

      <!-- Alerts -->
      <div v-if="error" class="mb-6 p-4 bg-red-900/20 border border-red-900/50 text-red-400 text-sm font-medium rounded-xl text-center shadow-sm">
        {{ error }}
      </div>
      <div v-if="successMsg" class="mb-6 p-4 bg-emerald-900/20 border border-emerald-900/50 text-emerald-400 text-sm font-medium rounded-xl text-center shadow-sm">
        {{ successMsg }}
      </div>

      <!-- ───────────────────────────────────────────────────────────────── -->
      <!-- VIEW 1: LOGIN (Sign In with Google OR Email + Security Key)       -->
      <!-- ───────────────────────────────────────────────────────────────── -->
      <div v-if="mode === 'login'" class="animate-fade-in">
        
        <div class="mb-6 flex justify-center">
          <GoogleLogin
            key="google-signin"
            :callback="handleGoogleLogin"
            :button-config="{ text: 'signin_with', theme: 'outline', size: 'large' }"
          />
        </div>

        <div class="relative flex items-center py-5">
          <div class="flex-grow border-t border-gray-800"></div>
          <span class="flex-shrink-0 mx-4 text-[10px] uppercase tracking-widest text-gray-500 font-bold">Or continue with email</span>
          <div class="flex-grow border-t border-gray-800"></div>
        </div>

        <form @submit.prevent="handleLogin" class="space-y-5">
          <div>
            <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Email Address</label>
            <input 
              v-model="email" 
              type="email" 
              maxlength="254"
              required 
              class="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3.5 text-white font-medium focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner placeholder-gray-600"
              placeholder="ceo@brand.com"
            />
          </div>
          
          <div>
            <div class="flex justify-between items-center mb-1.5">
              <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">Security Key</label>
              <button 
                type="button" 
                @click="switchMode('forgot')" 
                class="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold tracking-wider transition-colors"
              >
                Forgot password?
              </button>
            </div>
            <input 
              v-model="password" 
              type="password" 
              maxlength="72"
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
              {{ loading ? 'Signing In...' : 'Sign In →' }}
            </button>
          </div>
        </form>

        <div class="mt-8 text-center border-t border-gray-800 pt-6">
          <button @click="switchMode('register')" class="text-xs font-bold text-gray-400 hover:text-white uppercase tracking-wider transition-colors">
            Don't have an account? Sign up
          </button>
        </div>
      </div>

      <!-- ───────────────────────────────────────────────────────────────── -->
      <!-- VIEW 2: REGISTER (Sign Up with Google OR 3-Step Email + OTP + Key)-->
      <!-- ───────────────────────────────────────────────────────────────── -->
      <div v-if="mode === 'register'" class="animate-fade-in">
        
        <!-- STEP 1: Choose Google Sign Up OR Enter Email for OTP -->
        <div v-if="regStep === 1" class="animate-fade-in">
          <div class="mb-6 flex justify-center">
            <GoogleLogin
              key="google-signup"
              :callback="handleGoogleLogin"
              :button-config="{ text: 'signup_with', theme: 'outline', size: 'large' }"
            />
          </div>

          <div class="relative flex items-center py-5">
            <div class="flex-grow border-t border-gray-800"></div>
            <span class="flex-shrink-0 mx-4 text-[10px] uppercase tracking-widest text-gray-500 font-bold">Or sign up with email</span>
            <div class="flex-grow border-t border-gray-800"></div>
          </div>

          <form @submit.prevent="handleRegisterSendOtp" class="space-y-5">
            <div>
              <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Email Address</label>
              <input 
                v-model="email" 
                type="email" 
                maxlength="254"
                required 
                class="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3.5 text-white font-medium focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner placeholder-gray-600"
                placeholder="ceo@brand.com"
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
                {{ loading ? 'Sending Code...' : 'Send Verification Code →' }}
              </button>
            </div>
          </form>

          <div class="mt-8 text-center border-t border-gray-800 pt-6">
            <button @click="switchMode('login')" class="text-xs font-bold text-gray-400 hover:text-white uppercase tracking-wider transition-colors">
              Already have an account? Sign in
            </button>
          </div>
        </div>

        <!-- STEP 2: Enter 6-Digit Email OTP -->
        <form v-else-if="regStep === 2" @submit.prevent="handleRegisterVerifyOtp" class="space-y-5 animate-fade-in">
          <div class="text-center mb-6">
            <p class="text-sm text-gray-400">
              Enter the 6-digit verification code sent to
              <strong class="text-white block mt-1">{{ email }}</strong>
            </p>
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
              {{ loading ? 'Verifying...' : 'Verify Code →' }}
            </button>
          </div>

          <div class="text-center mt-4">
            <button type="button" @click="regStep = 1; otpCode = ''; error = null; successMsg = null;" class="text-xs font-bold text-gray-500 hover:text-gray-300 uppercase tracking-wider transition-colors">
              ← Change Email Address
            </button>
          </div>
        </form>

        <!-- STEP 3: Create Security Key (After Email is Verified) -->
        <form v-else-if="regStep === 3" @submit.prevent="handleRegisterComplete" class="space-y-5 animate-fade-in">
          <div class="text-center mb-4">
            <p class="text-sm text-gray-400">
              Email verified for <strong class="text-white">{{ email }}</strong>. Set your security key to complete registration.
            </p>
          </div>

          <div>
            <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Create Security Key</label>
            <input 
              v-model="password" 
              type="password" 
              minlength="6"
              maxlength="72"
              required 
              class="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3.5 text-white font-medium focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Confirm Security Key</label>
            <input 
              v-model="confirmPassword" 
              type="password" 
              minlength="6"
              maxlength="72"
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
              {{ loading ? 'Creating Account...' : 'Initialize Account →' }}
            </button>
          </div>
        </form>

      </div>

      <!-- ───────────────────────────────────────────────────────────────── -->
      <!-- VIEW 3: FORGOT PASSWORD (3-Step Email -> OTP -> New Security Key) -->
      <!-- ───────────────────────────────────────────────────────────────── -->
      <div v-if="mode === 'forgot'" class="animate-fade-in">
        
        <!-- STEP 1: Enter Registered Email -->
        <form v-if="forgotStep === 1" @submit.prevent="handleForgotSendOtp" class="space-y-5 animate-fade-in">
          <div class="text-center mb-6">
            <p class="text-sm text-gray-400">Enter your registered email address and we will send a 6-digit verification code to reset your security key.</p>
          </div>

          <div>
            <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Email Address</label>
            <input 
              v-model="email" 
              type="email" 
              maxlength="254"
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
              {{ loading ? 'Sending Code...' : 'Send Reset Code →' }}
            </button>
            
            <button 
              type="button" 
              @click="switchMode('login')"
              class="w-full bg-transparent hover:bg-gray-800 text-gray-400 font-bold py-3.5 rounded-xl transition-all uppercase tracking-wider text-xs"
            >
              ← Back to Sign In
            </button>
          </div>
        </form>

        <!-- STEP 2: Enter 6-Digit Reset OTP -->
        <form v-else-if="forgotStep === 2" @submit.prevent="handleForgotVerifyOtp" class="space-y-5 animate-fade-in">
          <div class="text-center mb-6">
            <p class="text-sm text-gray-400">
              Enter the 6-digit reset code sent to
              <strong class="text-white block mt-1">{{ email }}</strong>
            </p>
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
              {{ loading ? 'Verifying...' : 'Verify Code →' }}
            </button>
          </div>

          <div class="text-center mt-4">
            <button type="button" @click="forgotStep = 1; otpCode = ''; error = null; successMsg = null;" class="text-xs font-bold text-gray-500 hover:text-gray-300 uppercase tracking-wider transition-colors">
              ← Change Email Address
            </button>
          </div>
        </form>

        <!-- STEP 3: Enter & Confirm New Security Key -->
        <form v-else-if="forgotStep === 3" @submit.prevent="handleForgotResetPassword" class="space-y-5 animate-fade-in">
          <div class="text-center mb-4">
            <p class="text-sm text-gray-400">
              Enter a new security key for <strong class="text-white">{{ email }}</strong>.
            </p>
          </div>

          <div>
            <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">New Security Key</label>
            <input 
              v-model="password" 
              type="password" 
              minlength="6"
              maxlength="72"
              required 
              class="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3.5 text-white font-medium focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Confirm New Security Key</label>
            <input 
              v-model="confirmPassword" 
              type="password" 
              minlength="6"
              maxlength="72"
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
              {{ loading ? 'Updating...' : 'Update Security Key →' }}
            </button>
          </div>
        </form>

      </div>
      
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const authStore = useAuthStore();

// Primary Mode: 'login' | 'register' | 'forgot'
const mode = ref('login');
const regStep = ref(1);    // 1: Email, 2: OTP, 3: Set Security Key
const forgotStep = ref(1); // 1: Email, 2: OTP, 3: Reset Security Key

// Form State
const email = ref('');
const password = ref('');
const confirmPassword = ref('');
const otpCode = ref('');
const verificationToken = ref('');
const resetToken = ref('');

const loading = ref(false);
const error = ref(null);
const successMsg = ref(null);

const switchMode = (newMode) => {
  mode.value = newMode;
  regStep.value = 1;
  forgotStep.value = 1;
  password.value = '';
  confirmPassword.value = '';
  otpCode.value = '';
  verificationToken.value = '';
  resetToken.value = '';
  error.value = null;
  successMsg.value = null;
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. GOOGLE OAUTH HANDLER
// ─────────────────────────────────────────────────────────────────────────────
const handleGoogleLogin = async (response) => {
  loading.value = true;
  error.value = null;
  
  try {
    const res = await fetch('/api/v2/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
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
// 2. MANUAL LOGIN HANDLER (Email + Security Key)
// ─────────────────────────────────────────────────────────────────────────────
const handleLogin = async () => {
  loading.value = true;
  error.value = null;
  successMsg.value = null;
  
  try {
    const res = await fetch('/api/v2/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email: email.value, password: password.value })
    });
    
    const data = await res.json();
    if (res.ok) {
      authStore.setUser(data.data.user);
      router.push('/dashboard');
    } else {
      error.value = data.message || 'Invalid credentials.';
    }
  } catch (e) {
    error.value = 'Neural connection failed. Please ensure the backend server is running.';
  } finally {
    loading.value = false;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. MANUAL REGISTRATION HANDLERS (3-Step Progressive Flow)
// ─────────────────────────────────────────────────────────────────────────────
const handleRegisterSendOtp = async () => {
  loading.value = true;
  error.value = null;
  successMsg.value = null;

  try {
    const res = await fetch('/api/v2/auth/register/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email: email.value })
    });

    const data = await res.json();
    if (res.ok) {
      successMsg.value = data.message;
      regStep.value = 2;
    } else {
      error.value = data.message || 'Failed to send verification code.';
    }
  } catch (e) {
    error.value = 'Neural connection failed.';
  } finally {
    loading.value = false;
  }
};

const handleRegisterVerifyOtp = async () => {
  loading.value = true;
  error.value = null;
  successMsg.value = null;

  try {
    const res = await fetch('/api/v2/auth/register/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email: email.value, code: otpCode.value })
    });

    const data = await res.json();
    if (res.ok) {
      verificationToken.value = data.data.verificationToken;
      successMsg.value = data.message;
      regStep.value = 3;
    } else {
      error.value = data.message || 'Invalid verification code.';
      otpCode.value = '';
    }
  } catch (e) {
    error.value = 'Neural connection failed.';
  } finally {
    loading.value = false;
  }
};

const handleRegisterComplete = async () => {
  error.value = null;
  successMsg.value = null;

  if (password.value !== confirmPassword.value) {
    error.value = 'Security keys do not match.';
    return;
  }

  loading.value = true;

  try {
    const res = await fetch('/api/v2/auth/register/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        email: email.value,
        password: password.value,
        verificationToken: verificationToken.value
      })
    });

    const data = await res.json();
    if (res.ok) {
      authStore.setUser(data.data.user);
      router.push('/dashboard');
    } else {
      error.value = data.message || 'Failed to complete registration.';
    }
  } catch (e) {
    error.value = 'Neural connection failed.';
  } finally {
    loading.value = false;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. FORGOT PASSWORD HANDLERS (3-Step Progressive Flow)
// ─────────────────────────────────────────────────────────────────────────────
const handleForgotSendOtp = async () => {
  loading.value = true;
  error.value = null;
  successMsg.value = null;

  try {
    const res = await fetch('/api/v2/auth/forgot-password/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email: email.value })
    });

    const data = await res.json();
    if (res.ok) {
      successMsg.value = data.message;
      forgotStep.value = 2;
    } else {
      error.value = data.message || 'Failed to send reset code.';
    }
  } catch (e) {
    error.value = 'Neural connection failed.';
  } finally {
    loading.value = false;
  }
};

const handleForgotVerifyOtp = async () => {
  loading.value = true;
  error.value = null;
  successMsg.value = null;

  try {
    const res = await fetch('/api/v2/auth/forgot-password/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email: email.value, code: otpCode.value })
    });

    const data = await res.json();
    if (res.ok) {
      resetToken.value = data.data.resetToken;
      successMsg.value = data.message;
      forgotStep.value = 3;
    } else {
      error.value = data.message || 'Invalid verification code.';
      otpCode.value = '';
    }
  } catch (e) {
    error.value = 'Neural connection failed.';
  } finally {
    loading.value = false;
  }
};

const handleForgotResetPassword = async () => {
  error.value = null;
  successMsg.value = null;

  if (password.value !== confirmPassword.value) {
    error.value = 'Security keys do not match.';
    return;
  }

  loading.value = true;

  try {
    const res = await fetch('/api/v2/auth/forgot-password/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        email: email.value,
        newPassword: password.value,
        resetToken: resetToken.value
      })
    });

    const data = await res.json();
    if (res.ok) {
      switchMode('login');
      successMsg.value = data.message;
    } else {
      error.value = data.message || 'Failed to reset security key.';
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