import { createApp, ref, h } from 'vue'
import Toast from '../components/Toast.vue'

// 创建一个容器来管理toast实例
let toastInstance = null
let toastApp = null

function createToastContainer() {
  if (toastInstance) return toastInstance
  
  const container = document.createElement('div')
  container.id = 'toast-container'
  document.body.appendChild(container)
  
  const visible = ref(false)
  const message = ref('')
  const type = ref('info')
  let timer = null
  
  const ToastWrapper = {
    setup() {
      return () => h(Toast, {
        visible: visible.value,
        message: message.value,
        type: type.value,
        'onUpdate:visible': (val) => { visible.value = val }
      })
    }
  }
  
  toastApp = createApp(ToastWrapper)
  toastApp.mount(container)
  
  toastInstance = {
    show(msg, msgType = 'info', duration = 3000) {
      if (timer) {
        clearTimeout(timer)
      }
      
      message.value = msg
      type.value = msgType
      visible.value = true
      
      timer = setTimeout(() => {
        visible.value = false
        timer = null
      }, duration)
    },
    success(msg, duration) {
      this.show(msg, 'success', duration)
    },
    error(msg, duration) {
      this.show(msg, 'error', duration)
    },
    warning(msg, duration) {
      this.show(msg, 'warning', duration)
    },
    info(msg, duration) {
      this.show(msg, 'info', duration)
    }
  }
  
  return toastInstance
}

// 全局toast函数
export function toast(message, type = 'info', duration = 3000) {
  const instance = createToastContainer()
  instance.show(message, type, duration)
}

toast.success = (message, duration) => {
  const instance = createToastContainer()
  instance.success(message, duration)
}

toast.error = (message, duration) => {
  const instance = createToastContainer()
  instance.error(message, duration)
}

toast.warning = (message, duration) => {
  const instance = createToastContainer()
  instance.warning(message, duration)
}

toast.info = (message, duration) => {
  const instance = createToastContainer()
  instance.info(message, duration)
}

export default toast
