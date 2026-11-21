import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { server } from './app/server'
import { initI18n } from './i18n'
import { initTheme } from './theme/theme'
import { initAppearance } from './theme/appearance'

initTheme()
initAppearance()
initI18n()
createApp(App).mount('#app')
void server.start()
