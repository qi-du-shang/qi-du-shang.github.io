import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './assets/styles/main.css'
import { magnetic } from './directives/magnetic'
import { initSocket } from './utils/socket'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.directive('magnetic', magnetic)

// 启动全局 Socket 连接（用于评论实时推送 + 在线人数统计）
initSocket()

app.mount('#app')
