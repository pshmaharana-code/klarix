<template>
  <div class="min-h-screen flex bg-canvas text-ink font-sans selection:bg-volt selection:text-ink">
    <!-- Mobile Backdrop -->
    <div
      v-if="mobileNavOpen"
      @click="mobileNavOpen = false"
      class="fixed inset-0 z-40 bg-ink/40 backdrop-blur-[1px] lg:hidden"
      aria-hidden="true"
    ></div>

    <!-- ===================================================================
         LEFT ARCHITECTURAL RAIL (240px fixed desktop / slide-over mobile)
         =================================================================== -->
    <aside
      class="fixed inset-y-0 left-0 z-50 w-60 bg-surface border-r border-border-hairline flex flex-col justify-between transition-transform duration-200 ease-out lg:static lg:translate-x-0 shrink-0"
      :class="mobileNavOpen ? 'translate-x-0' : '-translate-x-full'"
    >
      <div>
        <!-- Brand Header -->
        <div class="h-14 px-5 border-b border-border-hairline flex items-center justify-between">
          <router-link
            to="/dashboard"
            @click="mobileNavOpen = false"
            class="flex items-center gap-2.5 group"
          >
            <img
              src="/brand/logo-volt.svg"
              alt="Klarix"
              class="w-7 h-7 rounded-[2px] border border-ink"
            />
            <span class="font-display font-extrabold text-lg tracking-tight text-ink leading-none">
              KLARIX
            </span>
          </router-link>

          <button
            type="button"
            @click="mobileNavOpen = false"
            class="lg:hidden p-1.5 text-ink-muted hover:text-ink border border-border-hairline rounded-[2px]"
            aria-label="Close navigation"
          >
            <X class="w-4 h-4" :stroke-width="1.75" />
          </button>
        </div>

        <!-- Pipeline Navigation Ledger -->
        <div class="px-3 pt-5 pb-2">
          <div class="px-2.5 mb-2.5 klx-mono-label text-ink-muted">
            Intelligence Pipeline
          </div>

          <nav class="space-y-1" aria-label="Workspace navigation">
            <router-link
              v-for="item in navItems"
              :key="item.to"
              :to="item.to"
              @click="mobileNavOpen = false"
              class="relative flex items-center justify-between px-3 py-2.5 rounded-[2px] text-sm transition-colors group"
              :class="
                isRouteActive(item.to)
                  ? 'bg-canvas text-ink font-semibold'
                  : 'text-ink-secondary hover:bg-canvas/70 hover:text-ink font-medium'
              "
            >
              <!-- Crisp 3px Acid Volt Active Rail Indicator -->
              <span
                v-if="isRouteActive(item.to)"
                class="absolute left-0 top-1 bottom-1 w-[3px] bg-volt border-r border-ink/20"
                aria-hidden="true"
              ></span>

              <span class="flex items-center gap-2.5 min-w-0">
                <component
                  :is="item.icon"
                  class="w-4 h-4 shrink-0 transition-colors"
                  :class="isRouteActive(item.to) ? 'text-ink' : 'text-ink-muted group-hover:text-ink'"
                  :stroke-width="1.75"
                />
                <span class="truncate">{{ item.label }}</span>
              </span>

              <span
                class="font-mono text-[10px] tracking-wider shrink-0"
                :class="isRouteActive(item.to) ? 'text-ink font-semibold' : 'text-ink-muted'"
              >
                {{ item.step }}
              </span>
            </router-link>
          </nav>
        </div>
      </div>

      <!-- Bottom Workspace Account & Sync Status Footer -->
      <div class="p-3 border-t border-border-hairline space-y-2.5">
        <!-- Quick Connect / Account Status Link -->
        <router-link
          to="/onboarding/connect"
          @click="mobileNavOpen = false"
          class="flex items-center justify-between px-3 py-2 bg-canvas border border-border-hairline hover:border-border-strong rounded-[2px] transition-colors"
        >
          <span class="flex items-center gap-2 min-w-0">
            <span
              class="w-2 h-2 shrink-0"
              :class="connectedAccount ? 'bg-status-positive' : 'bg-status-warning'"
            ></span>
            <span class="klx-mono-label text-ink truncate">
              {{ connectedAccount ? `@${connectedAccount.username}` : 'Connect Meta' }}
            </span>
          </span>
          <Link2 class="w-3.5 h-3.5 text-ink-muted shrink-0" :stroke-width="1.75" />
        </router-link>

        <!-- User Email & Logout -->
        <div class="px-2 pt-1 flex items-center justify-between gap-2">
          <div class="min-w-0">
            <div class="text-xs font-medium text-ink truncate">
              {{ authStore.user?.email || 'Authenticated User' }}
            </div>
            <div class="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
              Klarix V2
            </div>
          </div>

          <button
            type="button"
            @click="logout"
            title="Sign out"
            class="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-mono uppercase tracking-wider text-ink-secondary hover:text-ink border border-transparent hover:border-border-hairline rounded-[2px] transition-colors cursor-pointer shrink-0"
          >
            <LogOut class="w-3.5 h-3.5" :stroke-width="1.75" />
            <span class="sr-only sm:not-sr-only">Exit</span>
          </button>
        </div>
      </div>
    </aside>

    <!-- ===================================================================
         MAIN WORKSPACE COLUMN
         =================================================================== -->
    <div class="min-w-0 flex-1 flex flex-col">
      <!-- Sticky 56px Top Utility Bar -->
      <header class="h-14 sticky top-0 z-30 bg-surface/92 backdrop-blur-md border-b border-border-hairline px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
        <div class="flex items-center gap-3 min-w-0">
          <!-- Mobile Drawer Trigger -->
          <button
            type="button"
            @click="mobileNavOpen = true"
            class="lg:hidden p-1.5 border border-border-hairline rounded-[2px] text-ink hover:border-border-strong"
            aria-label="Open navigation"
          >
            <Menu class="w-4 h-4" :stroke-width="1.75" />
          </button>

          <!-- Active Brand & Handle Breadcrumb -->
          <div class="flex items-center gap-2.5 min-w-0">
            <span
              class="w-2 h-2 shrink-0"
              :class="authStore.activeBrand ? 'bg-volt border border-ink' : 'bg-border-hairline'"
            ></span>
            <span v-if="authStore.activeBrand" class="font-display font-bold text-sm sm:text-base tracking-tight text-ink truncate">
              {{ authStore.activeBrand.name }}
            </span>
            <span v-else class="text-sm text-ink-muted italic truncate">
              No Brand Initialized
            </span>

            <template v-if="connectedAccount">
              <span class="hidden sm:inline text-border-hairline">/</span>
              <span class="hidden sm:inline font-mono text-xs text-ink-secondary truncate">
                @{{ connectedAccount.username }}
              </span>
            </template>
          </div>
        </div>

        <!-- Right Engine Status Pill -->
        <div class="flex items-center gap-3 shrink-0">
          <div
            class="klx-badge border"
            :class="
              connectedAccount
                ? 'bg-canvas border-border-hairline text-ink'
                : 'bg-status-warning-bg border-status-warning/30 text-status-warning'
            "
          >
            <span
              class="w-1.5 h-1.5"
              :class="connectedAccount ? 'bg-status-positive' : 'bg-status-warning'"
            ></span>
            <span>{{ connectedAccount ? 'ENGINE IDLE' : 'SOURCE PENDING' }}</span>
          </div>
        </div>
      </header>

      <!-- Active Workspace Route View -->
      <main class="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import {
  LayoutDashboard,
  Grid3x3,
  LineChart,
  Sparkles,
  Brain,
  FileText,
  LogOut,
  Menu,
  X,
  Link2
} from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const mobileNavOpen = ref(false)

const navItems = [
  { step: '00', label: 'Command Center', to: '/dashboard', icon: LayoutDashboard },
  { step: '01', label: 'Content Catalogue', to: '/content', icon: Grid3x3 },
  { step: '02', label: 'Analytics', to: '/analytics', icon: LineChart },
  { step: '03', label: 'Patterns', to: '/patterns', icon: Sparkles },
  { step: '04', label: 'Brand Memory', to: '/memory', icon: Brain },
  { step: '05', label: 'Strategy & Scripts', to: '/strategy', icon: FileText }
]

const connectedAccount = computed(
  () => authStore.activeBrand?.socialAccounts?.[0] || null
)

const isRouteActive = (targetPath) => {
  if (targetPath === '/dashboard') {
    return route.path === '/dashboard'
  }
  return route.path === targetPath || route.path.startsWith(`${targetPath}/`)
}

const logout = async () => {
  mobileNavOpen.value = false
  await authStore.logout()
  router.push('/login')
}
</script>