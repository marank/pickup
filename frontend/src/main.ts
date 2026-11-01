import './assets/main.css'

import { VueQueryPlugin } from '@tanstack/vue-query'
import { createApp } from 'vue'

import App from './App.vue'
import { queryClient } from './lib/queryClient'
import { initI18n } from './lib/i18n'
import { initTheme } from './lib/theme'
import { initVisibleViewport } from './lib/visibleViewport'
import router from './router'

initTheme()
initVisibleViewport()
// The language is loaded first, so the first paint is already in it.
void initI18n().then(() =>
  createApp(App).use(VueQueryPlugin, { queryClient }).use(router).mount('#app'),
)
