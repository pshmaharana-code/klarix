import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { router } from './router'
import vue3GoogleLogin from 'vue3-google-login'
import './style.css'
import App from './App.vue'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

// Initialize the Google plugin using the environment variable
app.use(vue3GoogleLogin, {
    clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID
})

app.mount('#app')