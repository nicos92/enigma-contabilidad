import '@fontsource/inter/latin-400.css'
import '@fontsource/inter/latin-500.css'
import '@fontsource/inter/latin-600.css'
import '@fontsource/inter/latin-700.css'
import './css/tokens.css'
import './css/styles.css'
import './css/layout.css'
import './css/components.css'

import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.mount('#app')
