<template>
  <div id="app" :class="{ 'dark-theme': isDark }">
    <router-view />
  </div>
</template>

<script setup>
import { computed, onMounted, watch } from 'vue'
import { useUserStore } from './store/user'
import { useThemeStore } from './store/theme'

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
</style>
