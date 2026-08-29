import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './assets/styles/main.css'
import { magnetic } from './directives/magnetic'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.directive('magnetic', magnetic)

app.mount('#app')
