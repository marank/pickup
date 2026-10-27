import './assets/main.css'

import { VueQueryPlugin } from '@tanstack/vue-query'
import { createApp } from 'vue'

import App from './App.vue'
import { queryClient } from './lib/queryClient'
import router from './router'

createApp(App).use(VueQueryPlugin, { queryClient }).use(router).mount('#app')
