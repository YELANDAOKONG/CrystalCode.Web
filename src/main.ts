import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { initI18n } from './i18n'
import { initTheme } from './theme/theme'

initTheme()
initI18n()
createApp(App).mount('#app')
