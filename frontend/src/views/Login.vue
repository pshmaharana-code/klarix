<template>
  <div class="min-h-screen bg-surface text-ink font-sans grid grid-cols-1 lg:grid-cols-2 selection:bg-volt selection:text-ink">
    <!-- ===================================================================
         MOBILE TOP BRAND STRIP (72px, collapses desktop left panel cleanly)
         =================================================================== -->
    <header class="lg:hidden theme-obsidian h-[72px] px-5 border-b border-obsidian-border flex items-center justify-between">
      <router-link to="/" class="flex items-center gap-3">
        <img
          src="/brand/logo-volt.svg"
          alt="Klarix"
          class="w-7 h-7 rounded-[2px] border border-volt"
        />
        <span class="font-display font-extrabold text-lg tracking-tight text-obsidian-ink leading-none">
          KLARIX
        </span>
      </router-link>

      <router-link
        to="/"
        class="inline-flex items-center gap-1.5 klx-mono-label text-obsidian-muted hover:text-obsidian-ink transition-colors"
      >
        <ArrowLeft class="w-3.5 h-3.5" :stroke-width="1.75" />
        <span>Home</span>
      </router-link>
    </header>

    <!-- ===================================================================
         LEFT PANEL — OBSIDIAN EDITORIAL ANCHOR (Desktop 50%)
         =================================================================== -->
    <aside class="hidden lg:flex theme-obsidian relative flex-col justify-between p-12 xl:p-16 overflow-hidden border-r border-obsidian-border">
      <!-- Real Monochrome Editorial Photography Backdrop -->
      <img
        src="/landing/post-proof-02.webp"
        alt="Creator framing a shot in directional studio light"
        class="absolute inset-0 w-full h-full object-cover object-center opacity-55"
      />
      <div
        class="absolute inset-0 bg-gradient-to-b from-obsidian/90 via-obsidian/45 to-obsidian/95"
        aria-hidden="true"
      ></div>

      <!-- Top Brand Lockup -->
      <div class="relative z-10 flex items-center justify-between">
        <router-link to="/" class="flex items-center gap-3 group">
          <img
            src="/brand/logo-volt.svg"
            alt="Klarix"
            class="w-8 h-8 rounded-[2px] border border-volt"
          />
          <span class="font-display font-extrabold text-2xl tracking-tight text-obsidian-ink leading-none">
            KLARIX
          </span>
          <span class="h-4 w-px bg-obsidian-border"></span>
          <span class="klx-mono-label text-obsidian-muted">Content Intelligence</span>
        </router-link>
      </div>

      <!-- Bottom Editorial Statement & Provenance Footer -->
      <div class="relative z-10 max-w-md space-y-8">
        <div>
          <div class="w-8 h-1 bg-volt mb-5"></div>
          <h2 class="font-display font-extrabold text-4xl xl:text-[2.75rem] tracking-[-0.035em] leading-[1.02] text-obsidian-ink">
            Build your next post on your own <span class="text-volt">proof.</span>
          </h2>
          <p class="mt-4 text-sm leading-relaxed text-obsidian-muted">
            Clarity that remembers. Your Meta metrics, extracted patterns, and locked Brand Memory—ready where you left off.
          </p>
        </div>

        <!-- Restrained Architectural Ledger Line -->
        <div class="pt-5 border-t border-obsidian-border/90 flex items-center justify-between gap-4">
          <div class="space-y-1">
            <div class="klx-mono-label text-volt">Brand Memory Protocol</div>
            <p class="text-xs text-obsidian-muted">
              Evidence-backed rules governed directly from your catalogue.
            </p>
          </div>
          <span class="klx-badge bg-obsidian-surface border border-obsidian-border text-obsidian-ink shrink-0">
            V2 ACTIVE
          </span>
        </div>
      </div>
    </aside>

    <!-- ===================================================================
         RIGHT PANEL — CRISP DAYLIGHT AUTH WORKSPACE (50%)
         =================================================================== -->
    <main class="bg-surface flex flex-col justify-between px-5 py-10 sm:px-10 lg:px-14 xl:px-20">
      <!-- Desktop Top Utility Row -->
      <div class="hidden lg:flex items-center justify-between">
        <router-link
          to="/"
          class="inline-flex items-center gap-2 klx-mono-label text-ink-muted hover:text-ink transition-colors"
        >
          <ArrowLeft class="w-3.5 h-3.5" :stroke-width="1.75" />
          <span>Back to Klarix</span>
        </router-link>

        <span class="klx-mono-label text-ink-muted">
          {{ mode === 'login' ? 'AUTH // SIGN IN' : mode === 'register' ? 'AUTH // INITIALIZE' : 'AUTH // RECOVERY' }}
        </span>
      </div>

      <!-- Centered Auth Column -->
      <div class="w-full max-w-[420px] mx-auto my-auto py-6 lg:py-10">
        <!-- Dynamic View Heading -->
        <div class="mb-8">
          <p class="klx-mono-label text-volt-ink mb-2">
            <template v-if="mode === 'login'">Workspace Access</template>
            <template v-else-if="mode === 'register'">Account Setup</template>
            <template v-else>Key Recovery</template>
          </p>
          <h1 class="font-display font-extrabold text-3xl sm:text-4xl tracking-[-0.035em] leading-[1.05] text-ink">
            <template v-if="mode === 'login'">Sign in to Klarix</template>
            <template v-else-if="mode === 'register'">
              {{ regStep === 1 ? 'Create your account' : regStep === 2 ? 'Verify your email' : 'Set your security key' }}
            </template>
            <template v-else>
              {{ forgotStep === 1 ? 'Reset security key' : forgotStep === 2 ? 'Verify reset code' : 'Set new security key' }}
            </template>
          </h1>
          <p class="mt-2.5 text-sm text-ink-secondary leading-relaxed">
            <template v-if="mode === 'login'">
              Authenticate to access your Brand Memory and production workspace.
            </template>
            <template v-else-if="mode === 'register'">
              {{
                regStep === 1
                  ? 'Continue with Google or verify your email address with a 6-digit code.'
                  : regStep === 2
                    ? `Enter the 6-digit verification code sent to ${email}.`
                    : `Email verified for ${email}. Create a strong security key to finish.`
              }}
            </template>
            <template v-else>
              {{
                forgotStep === 1
                  ? 'Enter your registered email and we will send a 6-digit verification code.'
                  : forgotStep === 2
                    ? `Enter the 6-digit reset code sent to ${email}.`
                    : `Create a new security key for ${email}.`
              }}
            </template>
          </p>
        </div>

        <!-- 01 -> 02 -> 03 Mono Progress Stepper (Register & Forgot Flows) -->
        <div
          v-if="mode === 'register' || mode === 'forgot'"
          class="mb-7 grid grid-cols-3 gap-2"
          aria-label="Authentication progress"
        >
          <div
            v-for="step in activeSteps"
            :key="step.num"
            class="pt-2 border-t-2 transition-colors"
            :class="
              currentStepNumber >= step.num
                ? 'border-ink text-ink'
                : 'border-border-hairline text-ink-muted'
            "
          >
            <div class="klx-mono-label flex items-center gap-1.5">
              <span
                class="w-1.5 h-1.5"
                :class="
                  currentStepNumber === step.num
                    ? 'bg-volt border border-ink'
                    : currentStepNumber > step.num
                      ? 'bg-ink'
                      : 'bg-border-hairline'
                "
              ></span>
              <span>0{{ step.num }} {{ step.label }}</span>
            </div>
          </div>
        </div>

        <!-- Semantic Alerts -->
        <div
          v-if="error"
          role="alert"
          class="mb-6 p-3.5 bg-status-negative-bg border border-status-negative/40 rounded-[2px] flex items-start gap-2.5 text-sm text-status-negative font-medium"
        >
          <AlertCircle class="w-4 h-4 shrink-0 mt-0.5" :stroke-width="2" />
          <span>{{ error }}</span>
        </div>

        <div
          v-if="successMsg"
          role="status"
          class="mb-6 p-3.5 bg-status-positive-bg border border-status-positive/35 rounded-[2px] flex items-start gap-2.5 text-sm text-status-positive font-medium"
        >
          <CheckCircle2 class="w-4 h-4 shrink-0 mt-0.5" :stroke-width="2" />
          <span>{{ successMsg }}</span>
        </div>

        <!-- ───────────────────────────────────────────────────────────── -->
        <!-- VIEW 1: LOGIN                                                 -->
        <!-- ───────────────────────────────────────────────────────────── -->
        <div v-if="mode === 'login'" class="klx-fade-in">
          <div class="mb-5 flex justify-center">
            <GoogleLogin
              key="google-signin"
              :callback="handleGoogleLogin"
              :button-config="{ text: 'signin_with', theme: 'outline', size: 'large', width: 380 }"
            />
          </div>

          <div class="relative flex items-center py-4">
            <div class="flex-grow border-t border-border-hairline"></div>
            <span class="shrink-0 mx-3.5 klx-mono-label text-ink-muted">Or continue with email</span>
            <div class="flex-grow border-t border-border-hairline"></div>
          </div>

          <form @submit.prevent="handleLogin" class="space-y-4">
            <div>
              <label for="login-email" class="block klx-mono-label text-ink-secondary mb-1.5">
                Email Address
              </label>
              <input
                id="login-email"
                v-model="email"
                type="email"
                autocomplete="email"
                maxlength="254"
                required
                class="klx-input px-3.5 py-3 text-sm font-medium placeholder:text-ink-muted/70"
                placeholder="founder@brand.com"
              />
            </div>

            <div>
              <div class="flex items-center justify-between mb-1.5">
                <label for="login-password" class="block klx-mono-label text-ink-secondary">
                  Security Key
                </label>
                <button
                  type="button"
                  @click="switchMode('forgot')"
                  class="klx-mono-label text-ink-muted hover:text-ink underline underline-offset-4 cursor-pointer transition-colors"
                >
                  Forgot key?
                </button>
              </div>
              <div class="relative">
                <input
                  id="login-password"
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  autocomplete="current-password"
                  maxlength="72"
                  required
                  class="klx-input px-3.5 py-3 pr-11 text-sm font-medium placeholder:text-ink-muted/70"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  @click="showPassword = !showPassword"
                  class="absolute inset-y-0 right-0 px-3.5 flex items-center text-ink-muted hover:text-ink cursor-pointer"
                  :aria-label="showPassword ? 'Hide security key' : 'Show security key'"
                >
                  <EyeOff v-if="showPassword" class="w-4 h-4" :stroke-width="1.75" />
                  <Eye v-else class="w-4 h-4" :stroke-width="1.75" />
                </button>
              </div>
            </div>

            <div class="pt-2">
              <button
                type="submit"
                :disabled="loading"
                class="klx-btn-volt w-full py-3.5 text-sm font-semibold"
              >
                <span v-if="loading" class="klx-pulse-square !bg-ink"></span>
                <span>{{ loading ? 'Authenticating...' : 'Sign In' }}</span>
                <ArrowRight v-if="!loading" class="w-4 h-4" :stroke-width="2" />
              </button>
            </div>
          </form>

          <div class="mt-8 pt-6 border-t border-border-hairline flex items-center justify-between text-xs">
            <span class="text-ink-secondary">New to Klarix?</span>
            <button
              type="button"
              @click="switchMode('register')"
              class="klx-mono-label text-ink hover:text-volt-ink underline underline-offset-4 cursor-pointer transition-colors"
            >
              Create account &rarr;
            </button>
          </div>
        </div>

        <!-- ───────────────────────────────────────────────────────────── -->
        <!-- VIEW 2: REGISTER (Google OR 3-Step Email -> OTP -> Key)       -->
        <!-- ───────────────────────────────────────────────────────────── -->
        <div v-if="mode === 'register'" class="klx-fade-in">
          <!-- STEP 1: Email / Google -->
          <div v-if="regStep === 1">
            <div class="mb-5 flex justify-center">
              <GoogleLogin
                key="google-signup"
                :callback="handleGoogleLogin"
                :button-config="{ text: 'signup_with', theme: 'outline', size: 'large', width: 380 }"
              />
            </div>

            <div class="relative flex items-center py-4">
              <div class="flex-grow border-t border-border-hairline"></div>
              <span class="shrink-0 mx-3.5 klx-mono-label text-ink-muted">Or sign up with email</span>
              <div class="flex-grow border-t border-border-hairline"></div>
            </div>

            <form @submit.prevent="handleRegisterSendOtp" class="space-y-4">
              <div>
                <label for="reg-email" class="block klx-mono-label text-ink-secondary mb-1.5">
                  Email Address
                </label>
                <input
                  id="reg-email"
                  v-model="email"
                  type="email"
                  autocomplete="email"
                  maxlength="254"
                  required
                  class="klx-input px-3.5 py-3 text-sm font-medium placeholder:text-ink-muted/70"
                  placeholder="founder@brand.com"
                />
              </div>

              <div class="pt-2">
                <button
                  type="submit"
                  :disabled="loading"
                  class="klx-btn-volt w-full py-3.5 text-sm font-semibold"
                >
                  <span v-if="loading" class="klx-pulse-square !bg-ink"></span>
                  <span>{{ loading ? 'Sending Code...' : 'Send Verification Code' }}</span>
                  <ArrowRight v-if="!loading" class="w-4 h-4" :stroke-width="2" />
                </button>
              </div>
            </form>

            <div class="mt-8 pt-6 border-t border-border-hairline flex items-center justify-between text-xs">
              <span class="text-ink-secondary">Already have an account?</span>
              <button
                type="button"
                @click="switchMode('login')"
                class="klx-mono-label text-ink hover:text-volt-ink underline underline-offset-4 cursor-pointer transition-colors"
              >
                Sign in &rarr;
              </button>
            </div>
          </div>

          <!-- STEP 2: 6-Digit Email OTP -->
          <form v-else-if="regStep === 2" @submit.prevent="handleRegisterVerifyOtp" class="space-y-5 klx-fade-in">
            <div>
              <label for="reg-otp" class="block klx-mono-label text-ink-secondary mb-2">
                6-Digit Verification Code
              </label>
              <input
                id="reg-otp"
                v-model="otpCode"
                @input="sanitizeOtp"
                type="text"
                inputmode="numeric"
                autocomplete="one-time-code"
                pattern="[0-9]*"
                maxlength="6"
                required
                class="klx-input px-4 py-4 text-center font-mono font-bold text-2xl tracking-[0.55em] placeholder:text-ink-muted/40"
                placeholder="000000"
              />
            </div>

            <div class="pt-1 space-y-3">
              <button
                type="submit"
                :disabled="loading || otpCode.length !== 6"
                class="klx-btn-volt w-full py-3.5 text-sm font-semibold"
              >
                <span v-if="loading" class="klx-pulse-square !bg-ink"></span>
                <span>{{ loading ? 'Verifying...' : 'Verify Code' }}</span>
                <ArrowRight v-if="!loading" class="w-4 h-4" :stroke-width="2" />
              </button>

              <button
                type="button"
                @click="resetToStepOne('register')"
                class="klx-btn-outline w-full py-3 text-xs font-mono uppercase tracking-wider"
              >
                <ArrowLeft class="w-3.5 h-3.5" :stroke-width="1.75" />
                <span>Change Email Address</span>
              </button>
            </div>
          </form>

          <!-- STEP 3: Create Security Key -->
          <form v-else-if="regStep === 3" @submit.prevent="handleRegisterComplete" class="space-y-4 klx-fade-in">
            <div>
              <label for="reg-pass" class="block klx-mono-label text-ink-secondary mb-1.5">
                Create Security Key
              </label>
              <div class="relative">
                <input
                  id="reg-pass"
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  autocomplete="new-password"
                  minlength="6"
                  maxlength="72"
                  required
                  class="klx-input px-3.5 py-3 pr-11 text-sm font-medium placeholder:text-ink-muted/70"
                  placeholder="Minimum 6 characters"
                />
                <button
                  type="button"
                  @click="showPassword = !showPassword"
                  class="absolute inset-y-0 right-0 px-3.5 flex items-center text-ink-muted hover:text-ink cursor-pointer"
                  :aria-label="showPassword ? 'Hide security key' : 'Show security key'"
                >
                  <EyeOff v-if="showPassword" class="w-4 h-4" :stroke-width="1.75" />
                  <Eye v-else class="w-4 h-4" :stroke-width="1.75" />
                </button>
              </div>
            </div>

            <div>
              <label for="reg-confirm" class="block klx-mono-label text-ink-secondary mb-1.5">
                Confirm Security Key
              </label>
              <input
                id="reg-confirm"
                v-model="confirmPassword"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="new-password"
                minlength="6"
                maxlength="72"
                required
                class="klx-input px-3.5 py-3 text-sm font-medium placeholder:text-ink-muted/70"
                placeholder="Re-enter security key"
              />
            </div>

            <div class="pt-2">
              <button
                type="submit"
                :disabled="loading"
                class="klx-btn-volt w-full py-3.5 text-sm font-semibold"
              >
                <span v-if="loading" class="klx-pulse-square !bg-ink"></span>
                <span>{{ loading ? 'Initializing Workspace...' : 'Initialize Account' }}</span>
                <ArrowRight v-if="!loading" class="w-4 h-4" :stroke-width="2" />
              </button>
            </div>
          </form>
        </div>

        <!-- ───────────────────────────────────────────────────────────── -->
        <!-- VIEW 3: FORGOT PASSWORD (3-Step Email -> OTP -> New Key)      -->
        <!-- ───────────────────────────────────────────────────────────── -->
        <div v-if="mode === 'forgot'" class="klx-fade-in">
          <!-- STEP 1: Enter Registered Email -->
          <form v-if="forgotStep === 1" @submit.prevent="handleForgotSendOtp" class="space-y-4">
            <div>
              <label for="forgot-email" class="block klx-mono-label text-ink-secondary mb-1.5">
                Registered Email Address
              </label>
              <input
                id="forgot-email"
                v-model="email"
                type="email"
                autocomplete="email"
                maxlength="254"
                required
                class="klx-input px-3.5 py-3 text-sm font-medium placeholder:text-ink-muted/70"
                placeholder="founder@brand.com"
              />
            </div>

            <div class="pt-2 space-y-3">
              <button
                type="submit"
                :disabled="loading"
                class="klx-btn-volt w-full py-3.5 text-sm font-semibold"
              >
                <span v-if="loading" class="klx-pulse-square !bg-ink"></span>
                <span>{{ loading ? 'Sending Code...' : 'Send Reset Code' }}</span>
                <ArrowRight v-if="!loading" class="w-4 h-4" :stroke-width="2" />
              </button>

              <button
                type="button"
                @click="switchMode('login')"
                class="klx-btn-outline w-full py-3 text-xs font-mono uppercase tracking-wider"
              >
                <ArrowLeft class="w-3.5 h-3.5" :stroke-width="1.75" />
                <span>Back to Sign In</span>
              </button>
            </div>
          </form>

          <!-- STEP 2: 6-Digit Reset OTP -->
          <form v-else-if="forgotStep === 2" @submit.prevent="handleForgotVerifyOtp" class="space-y-5 klx-fade-in">
            <div>
              <label for="forgot-otp" class="block klx-mono-label text-ink-secondary mb-2">
                6-Digit Reset Code
              </label>
              <input
                id="forgot-otp"
                v-model="otpCode"
                @input="sanitizeOtp"
                type="text"
                inputmode="numeric"
                autocomplete="one-time-code"
                pattern="[0-9]*"
                maxlength="6"
                required
                class="klx-input px-4 py-4 text-center font-mono font-bold text-2xl tracking-[0.55em] placeholder:text-ink-muted/40"
                placeholder="000000"
              />
            </div>

            <div class="pt-1 space-y-3">
              <button
                type="submit"
                :disabled="loading || otpCode.length !== 6"
                class="klx-btn-volt w-full py-3.5 text-sm font-semibold"
              >
                <span v-if="loading" class="klx-pulse-square !bg-ink"></span>
                <span>{{ loading ? 'Verifying...' : 'Verify Code' }}</span>
                <ArrowRight v-if="!loading" class="w-4 h-4" :stroke-width="2" />
              </button>

              <button
                type="button"
                @click="resetToStepOne('forgot')"
                class="klx-btn-outline w-full py-3 text-xs font-mono uppercase tracking-wider"
              >
                <ArrowLeft class="w-3.5 h-3.5" :stroke-width="1.75" />
                <span>Change Email Address</span>
              </button>
            </div>
          </form>

          <!-- STEP 3: New Security Key -->
          <form v-else-if="forgotStep === 3" @submit.prevent="handleForgotResetPassword" class="space-y-4 klx-fade-in">
            <div>
              <label for="reset-pass" class="block klx-mono-label text-ink-secondary mb-1.5">
                New Security Key
              </label>
              <div class="relative">
                <input
                  id="reset-pass"
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  autocomplete="new-password"
                  minlength="6"
                  maxlength="72"
                  required
                  class="klx-input px-3.5 py-3 pr-11 text-sm font-medium placeholder:text-ink-muted/70"
                  placeholder="Minimum 6 characters"
                />
                <button
                  type="button"
                  @click="showPassword = !showPassword"
                  class="absolute inset-y-0 right-0 px-3.5 flex items-center text-ink-muted hover:text-ink cursor-pointer"
                  :aria-label="showPassword ? 'Hide security key' : 'Show security key'"
                >
                  <EyeOff v-if="showPassword" class="w-4 h-4" :stroke-width="1.75" />
                  <Eye v-else class="w-4 h-4" :stroke-width="1.75" />
                </button>
              </div>
            </div>

            <div>
              <label for="reset-confirm" class="block klx-mono-label text-ink-secondary mb-1.5">
                Confirm New Security Key
              </label>
              <input
                id="reset-confirm"
                v-model="confirmPassword"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="new-password"
                minlength="6"
                maxlength="72"
                required
                class="klx-input px-3.5 py-3 text-sm font-medium placeholder:text-ink-muted/70"
                placeholder="Re-enter security key"
              />
            </div>

            <div class="pt-2">
              <button
                type="submit"
                :disabled="loading"
                class="klx-btn-volt w-full py-3.5 text-sm font-semibold"
              >
                <span v-if="loading" class="klx-pulse-square !bg-ink"></span>
                <span>{{ loading ? 'Updating Key...' : 'Update Security Key' }}</span>
                <ArrowRight v-if="!loading" class="w-4 h-4" :stroke-width="2" />
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Bottom Compliance / Security Footer -->
      <div class="pt-6 border-t border-border-hairline flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono uppercase tracking-wider text-ink-muted">
        <span class="inline-flex items-center gap-1.5">
          <ShieldCheck class="w-3.5 h-3.5 text-ink" :stroke-width="1.75" />
          <span>HTTP-Only Encrypted Session</span>
        </span>
        <span>Klarix &copy; 2026</span>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import {
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  ShieldCheck
} from 'lucide-vue-next'

const router = useRouter()
const authStore = useAuthStore()

// Primary Mode: 'login' | 'register' | 'forgot'
const mode = ref('login')
const regStep = ref(1)    // 1: Email, 2: OTP, 3: Set Security Key
const forgotStep = ref(1) // 1: Email, 2: OTP, 3: Reset Security Key

// Form State
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const otpCode = ref('')
const verificationToken = ref('')
const resetToken = ref('')
const showPassword = ref(false)

const loading = ref(false)
const error = ref(null)
const successMsg = ref(null)

const currentStepNumber = computed(() =>
  mode.value === 'register' ? regStep.value : forgotStep.value
)

const activeSteps = computed(() =>
  mode.value === 'register'
    ? [
        { num: 1, label: 'Email' },
        { num: 2, label: 'Verify' },
        { num: 3, label: 'Key' }
      ]
    : [
        { num: 1, label: 'Email' },
        { num: 2, label: 'Verify' },
        { num: 3, label: 'Reset' }
      ]
)

const sanitizeOtp = () => {
  otpCode.value = otpCode.value.replace(/\D/g, '').slice(0, 6)
}

const resetToStepOne = (targetMode) => {
  if (targetMode === 'register') regStep.value = 1
  if (targetMode === 'forgot') forgotStep.value = 1
  otpCode.value = ''
  error.value = null
  successMsg.value = null
}

const switchMode = (newMode) => {
  mode.value = newMode
  regStep.value = 1
  forgotStep.value = 1
  password.value = ''
  confirmPassword.value = ''
  otpCode.value = ''
  verificationToken.value = ''
  resetToken.value = ''
  showPassword.value = false
  error.value = null
  successMsg.value = null
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. GOOGLE OAUTH HANDLER
// ─────────────────────────────────────────────────────────────────────────────
const handleGoogleLogin = async (response) => {
  loading.value = true
  error.value = null

  try {
    const res = await fetch('/api/v2/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ token: response.credential })
    })

    const data = await res.json()
    if (res.ok) {
      authStore.setUser(data.data.user)
      router.push('/dashboard')
    } else {
      error.value = data.message || 'Google authentication failed.'
    }
  } catch {
    error.value = 'Unable to reach the server. Please check your connection and try again.'
  } finally {
    loading.value = false
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. MANUAL LOGIN HANDLER (Email + Security Key)
// ─────────────────────────────────────────────────────────────────────────────
const handleLogin = async () => {
  loading.value = true
  error.value = null
  successMsg.value = null

  try {
    const res = await fetch('/api/v2/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email: email.value, password: password.value })
    })

    const data = await res.json()
    if (res.ok) {
      authStore.setUser(data.data.user)
      router.push('/dashboard')
    } else {
      error.value = data.message || 'Invalid credentials.'
    }
  } catch {
    error.value = 'Unable to reach the server. Please ensure the backend service is running.'
  } finally {
    loading.value = false
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. MANUAL REGISTRATION HANDLERS (3-Step Progressive Flow)
// ─────────────────────────────────────────────────────────────────────────────
const handleRegisterSendOtp = async () => {
  loading.value = true
  error.value = null
  successMsg.value = null

  try {
    const res = await fetch('/api/v2/auth/register/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email: email.value })
    })

    const data = await res.json()
    if (res.ok) {
      successMsg.value = data.message
      regStep.value = 2
    } else {
      error.value = data.message || 'Failed to send verification code.'
    }
  } catch {
    error.value = 'Unable to reach the server. Please try again.'
  } finally {
    loading.value = false
  }
}

const handleRegisterVerifyOtp = async () => {
  loading.value = true
  error.value = null
  successMsg.value = null

  try {
    const res = await fetch('/api/v2/auth/register/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email: email.value, code: otpCode.value })
    })

    const data = await res.json()
    if (res.ok) {
      verificationToken.value = data.data.verificationToken
      successMsg.value = data.message
      regStep.value = 3
    } else {
      error.value = data.message || 'Invalid verification code.'
      otpCode.value = ''
    }
  } catch {
    error.value = 'Unable to reach the server. Please try again.'
  } finally {
    loading.value = false
  }
}

const handleRegisterComplete = async () => {
  error.value = null
  successMsg.value = null

  if (password.value !== confirmPassword.value) {
    error.value = 'Security keys do not match.'
    return
  }

  loading.value = true

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
    })

    const data = await res.json()
    if (res.ok) {
      authStore.setUser(data.data.user)
      router.push('/dashboard')
    } else {
      error.value = data.message || 'Failed to complete registration.'
    }
  } catch {
    error.value = 'Unable to reach the server. Please try again.'
  } finally {
    loading.value = false
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. FORGOT PASSWORD HANDLERS (3-Step Progressive Flow)
// ─────────────────────────────────────────────────────────────────────────────
const handleForgotSendOtp = async () => {
  loading.value = true
  error.value = null
  successMsg.value = null

  try {
    const res = await fetch('/api/v2/auth/forgot-password/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email: email.value })
    })

    const data = await res.json()
    if (res.ok) {
      successMsg.value = data.message
      forgotStep.value = 2
    } else {
      error.value = data.message || 'Failed to send reset code.'
    }
  } catch {
    error.value = 'Unable to reach the server. Please try again.'
  } finally {
    loading.value = false
  }
}

const handleForgotVerifyOtp = async () => {
  loading.value = true
  error.value = null
  successMsg.value = null

  try {
    const res = await fetch('/api/v2/auth/forgot-password/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email: email.value, code: otpCode.value })
    })

    const data = await res.json()
    if (res.ok) {
      resetToken.value = data.data.resetToken
      successMsg.value = data.message
      forgotStep.value = 3
    } else {
      error.value = data.message || 'Invalid verification code.'
      otpCode.value = ''
    }
  } catch {
    error.value = 'Unable to reach the server. Please try again.'
  } finally {
    loading.value = false
  }
}

const handleForgotResetPassword = async () => {
  error.value = null
  successMsg.value = null

  if (password.value !== confirmPassword.value) {
    error.value = 'Security keys do not match.'
    return
  }

  loading.value = true

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
    })

    const data = await res.json()
    if (res.ok) {
      switchMode('login')
      successMsg.value = data.message
    } else {
      error.value = data.message || 'Failed to reset security key.'
    }
  } catch {
    error.value = 'Unable to reach the server. Please try again.'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.klx-fade-in {
  animation: klxFade 180ms cubic-bezier(0.2, 0, 0, 1) forwards;
}

@keyframes klxFade {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>