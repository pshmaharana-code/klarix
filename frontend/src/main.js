import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { router } from './router'
import vue3GoogleLogin from 'vue3-google-login' // <-- Import the package
import './style.css'
import App from './App.vue'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

// Initialize the Google plugin with your exact Client ID
app.use(vue3GoogleLogin, {
    clientId: '46205565659-1m4jip029g3i6s5b21vps1q7rdd6icpe.apps.googleusercontent.com'
})

app.mount('#app')