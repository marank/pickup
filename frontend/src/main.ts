import './assets/main.css'

import { VueQueryPlugin } from '@tanstack/vue-query'
import { createApp } from 'vue'

import App from './App.vue'
import { queryClient } from './lib/queryClient'
import { followSystemTheme } from './lib/theme'
import router from './router'

followSystemTheme()
createApp(App).use(VueQueryPlugin, { queryClient }).use(router).mount('#app')
