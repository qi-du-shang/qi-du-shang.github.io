<template>
  <div v-if="showPlayer" class="music-player-wrapper">
    <!-- 播放器主体 -->
    <div ref="aplayerRef" class="aplayer-container"></div>
    
    <!-- 底部歌词显示 -->
    <div v-if="showLyric && currentLyric" class="lyric-container">
      <div class="lyric-text">{{ currentLyric }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useUserStore } from '../store/user'

const props = defineProps({
  musicPlatform: {
    type: String,
    default: 'netease'
  },
  playlistId: {
    type: String,
    default: ''
  },
  showPlayer: {
    type: Boolean,
    default: true
  },
  showLyric: {
    type: Boolean,
    default: true
  },
  volume: {
    type: Number,
    default: 70
  },
  autoPlay: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['lyricChange'])

const userStore = useUserStore()
const aplayerRef = ref(null)
const currentLyric = ref('')
let aplayer = null
let meting = null
let lyricInterval = null

// 平台映射
const platformMap = {
  'netease': 'netease',
  'tencent': 'tencent',
  'kugou': 'kugou',
  'xiami': 'xiami',
  'baidu': 'baidu'
}

// 初始化播放器
async function initPlayer() {
  if (!aplayerRef.value || !props.playlistId) return
  
  // 等待APlayer和Meting加载
  if (typeof APlayer === 'undefined' || typeof Meting === 'undefined') {
    await loadScripts()
  }
  
  if (typeof APlayer === 'undefined' || typeof Meting === 'undefined') {
    console.warn('APlayer或Meting.js加载失败')
    return
  }
  
  // 销毁旧播放器
  if (aplayer) {
    aplayer.destroy()
    aplayer = null
  }
  
  // 创建新播放器
  aplayer = new APlayer({
    container: aplayerRef.value,
    fixed: true,
    mini: false,
    autoplay: props.autoPlay,
    theme: '#1890ff',
    loop: 'all',
    order: 'list',
    preload: 'auto',
    volume: props.volume / 100,
    mutex: true,
    listFolded: true,
    listMaxHeight: 300,
    lrcType: 3,
    audio: []
  })
  
  // 使用Meting加载歌单
  if (props.playlistId && typeof Meting !== 'undefined') {
    const metingInstance = new Meting({
      server: platformMap[props.musicPlatform] || 'netease',
      type: 'playlist',
      id: props.playlistId
    })
    
    metingInstance.fetch().then((data) => {
      if (data && data.length > 0) {
        const playlist = data.map(item => ({
          name: item.name,
          artist: item.artist,
          url: item.url,
          cover: item.pic,
          lrc: item.lrc
        }))
        aplayer.list.add(playlist)
        
        // 开始监听歌词
        startLyricMonitor()
      }
    }).catch(err => {
      console.error('加载歌单失败:', err)
    })
  }
  
  // 监听播放事件
  aplayer.on('play', () => {
    startLyricMonitor()
  })
  
  aplayer.on('pause', () => {
    stopLyricMonitor()
  })
}

// 加载外部脚本
function loadScripts() {
  return new Promise((resolve) => {
    let loadedCount = 0
    const totalScripts = 2
    
    function checkAllLoaded() {
      loadedCount++
      if (loadedCount >= totalScripts) {
        resolve()
      }
    }
    
    // 加载APlayer CSS
    if (!document.querySelector('link[href*="aplayer"]')) {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = 'https://cdn.jsdelivr.net/npm/aplayer@1.10.1/dist/APlayer.min.css'
      document.head.appendChild(link)
    }
    
    // 加载APlayer JS
    if (typeof APlayer === 'undefined') {
      const script1 = document.createElement('script')
      script1.src = 'https://cdn.jsdelivr.net/npm/aplayer@1.10.1/dist/APlayer.min.js'
      script1.onload = checkAllLoaded
      script1.onerror = checkAllLoaded
      document.body.appendChild(script1)
    } else {
      checkAllLoaded()
    }
    
    // 加载Meting JS
    if (typeof Meting === 'undefined') {
      const script2 = document.createElement('script')
      script2.src = 'https://cdn.jsdelivr.net/npm/meting@2.0.1/dist/Meting.min.js'
      script2.onload = checkAllLoaded
      script2.onerror = checkAllLoaded
      document.body.appendChild(script2)
    } else {
      checkAllLoaded()
    }
  })
}

// 开始监听歌词
function startLyricMonitor() {
  if (lyricInterval) return
  
  lyricInterval = setInterval(() => {
    if (aplayer && aplayer.lrc && aplayer.lrc.current) {
      const lyric = aplayer.lrc.current[1] || ''
      if (lyric !== currentLyric.value) {
        currentLyric.value = lyric
        emit('lyricChange', lyric)
      }
    }
  }, 500)
}

// 停止监听歌词
function stopLyricMonitor() {
  if (lyricInterval) {
    clearInterval(lyricInterval)
    lyricInterval = null
  }
}

// 监听属性变化
watch(() => [props.musicPlatform, props.playlistId], () => {
  if (props.showPlayer && props.playlistId) {
    nextTick(() => {
      initPlayer()
    })
  }
}, { deep: true })

watch(() => props.volume, (newVal) => {
  if (aplayer) {
    aplayer.volume(newVal / 100)
  }
})

watch(() => props.showPlayer, (newVal) => {
  if (newVal && props.playlistId) {
    nextTick(() => {
      initPlayer()
    })
  }
})

onMounted(() => {
  if (props.showPlayer && props.playlistId) {
    nextTick(() => {
      initPlayer()
    })
  }
})

onUnmounted(() => {
  stopLyricMonitor()
  if (aplayer) {
    aplayer.destroy()
    aplayer = null
  }
})
</script>

<style scoped>
.music-player-wrapper {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  pointer-events: none;
}

.aplayer-container {
  position: fixed;
  bottom: 20px;
  left: 20px;
  width: 320px;
  pointer-events: auto;
  z-index: 1001;
}

/* 覆盖APlayer样式，使其更符合项目风格 */
.aplayer-container :deep(.aplayer) {
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.lyric-container {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  pointer-events: none;
  z-index: 999;
}

.lyric-text {
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 10px 24px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  text-align: center;
  max-width: 600px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  backdrop-filter: blur(10px);
  animation: lyricFadeIn 0.3s ease;
}

@keyframes lyricFadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 响应式 */
@media (max-width: 768px) {
  .aplayer-container {
    width: 280px;
    bottom: 16px;
    left: 16px;
  }
  
  .lyric-container {
    bottom: 100px;
    max-width: 90%;
  }
  
  .lyric-text {
    font-size: 13px;
    padding: 8px 16px;
  }
}
</style>
