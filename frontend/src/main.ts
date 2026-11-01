import './assets/main.css'

import { VueQueryPlugin } from '@tanstack/vue-query'
import { createApp } from 'vue'

import App from './App.vue'
import { queryClient } from './lib/queryClient'
import { initTheme } from './lib/theme'
import { initVisibleViewport } from './lib/visibleViewport'
import router from './router'

initTheme()
initVisibleViewport()
createApp(App).use(VueQueryPlugin, { queryClient }).use(router).mount('#app')
