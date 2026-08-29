<template>
  <div id="app" :class="{ 'dark-theme': isDark }">
    <router-view v-slot="{ Component }">
      <transition name="page-fade" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>
    <MagneticPointer />
  </div>
</template>

<script setup>
import { computed, onMounted, watch } from 'vue'
import { useUserStore } from './store/user'
import { useThemeStore } from './store/theme'
import MagneticPointer from './components/MagneticPointer.vue'

const userStore = useUserStore()
const themeStore = useThemeStore()

const isDark = computed(() => themeStore.isDark)

onMounted(() => {
  // 初始化用户信息
  userStore.initUser()
  // 初始化主题
  themeStore.initTheme()
})
</script>

<style>
#app {
  min-height: 100vh;
  transition: background-color 0.3s, color 0.3s;
}

/* 页面切换过渡动画 */
.page-fade-enter-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.page-fade-leave-active {
  transition: all 0.25s cubic-bezier(0.4, 0, 1, 1);
}
.page-fade-enter-from {
  opacity: 0;
  transform: translateY(16px) scale(0.98);
}
.page-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.98);
}
</style>
