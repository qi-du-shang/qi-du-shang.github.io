<template>
  <div v-if="showPlayer" class="music-player-wrapper">
    <div ref="aplayerRef" class="aplayer-container"></div>
    <div v-if="showLyric && currentLyric" class="lyric-container">
      <!-- <div class="lyric-text">{{ currentLyric }}</div> -->
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

const platformMap = {
  'netease': 'netease',
  'tencent': 'tencent',
  'kugou': 'kugou',
  'xiami': 'xiami',
  'baidu': 'baidu'
}

function parsePlaylistId(rawId) {
  const id = String(rawId || '').trim()
  if (!id) return ''
  const match = id.match(/(?:[?&]id=)(\d+)/) || id.match(/playlist\/(\d+)/) || id.match(/(\d+)$/)
  return match ? match[1] : id
}

async function fetchPlaylistData(server, playlistId) {
  const apiUrl = `https://api.i-meto.com/meting/api?server=${server}&type=playlist&id=${encodeURIComponent(playlistId)}&r=${Math.random()}`
  const res = await fetch(apiUrl)
  if (!res.ok) {
    throw new Error(`Meting API 请求失败: ${res.status}`)
  }
  return await res.json()
}

function loadScripts() {
  return new Promise((resolve) => {
    let loadedCount = 0
    const totalScripts = 1

    function checkAllLoaded() {
      loadedCount++
      if (loadedCount >= totalScripts) {
        resolve()
      }
    }

    if (!document.querySelector('link[href*="aplayer"]')) {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = 'https://cdn.jsdelivr.net/npm/aplayer@1.10.1/dist/APlayer.min.css'
      document.head.appendChild(link)
    }

    if (typeof APlayer === 'undefined') {
      const script1 = document.createElement('script')
      script1.src = 'https://cdn.jsdelivr.net/npm/aplayer@1.10.1/dist/APlayer.min.js'
      script1.onload = checkAllLoaded
      script1.onerror = checkAllLoaded
      document.body.appendChild(script1)
    } else {
      checkAllLoaded()
    }
  })
}

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

function stopLyricMonitor() {
  if (lyricInterval) {
    clearInterval(lyricInterval)
    lyricInterval = null
  }
}

async function initPlayer() {
  const playlistId = parsePlaylistId(props.playlistId)
  if (!aplayerRef.value || !playlistId) return

  if (typeof APlayer === 'undefined') {
    await loadScripts()
  }

  if (typeof APlayer === 'undefined') {
    console.warn('APlayer 加载失败')
    return
  }

  let playlist = []
  try {
    const server = platformMap[props.musicPlatform] || 'netease'
    const data = await fetchPlaylistData(server, playlistId)
    const rawSongs = Array.isArray(data)
      ? data
      : Array.isArray(data?.songs)
        ? data.songs
        : Array.isArray(data?.playlist)
          ? data.playlist
          : Array.isArray(data?.data)
            ? data.data
            : []

    if (rawSongs.length > 0) {
      playlist = rawSongs.map((item, index) => {
        const song = item?.song || item || {}
        return {
          name: song.name || song.title || song.song_name || `Audio name`,
          artist: song.artist || song.author || song.singer || song.artist_name || 'Audio artist',
          url: song.url || song.src || song.mp3 || song.music_url || '',
          cover: song.pic || song.cover || song.al || song.album || song.img || '',
          lrc: song.lrc || song.lyric || song.lyrics || '',
          index
        }
      })
    } else {
      console.warn('歌单数据为空', data)
    }
  } catch (err) {
    console.error('加载歌单失败:', err)
    return
  }

  if (playlist.length === 0) {
    return
  }

  if (aplayer) {
    aplayer.destroy()
    aplayer = null
  }

  aplayer = new APlayer({
    container: aplayerRef.value,
    fixed: true,
    mini: true,
    autoplay: props.autoPlay,
    theme: '#1890ff',
    loop: 'all',
    order: 'random',
    preload: 'auto',
    volume: props.volume / 100,
    mutex: true,
    listFolded: false,
    listMaxHeight: 300,
    lrcType: 3,
    audio: playlist
  })

  if (props.autoPlay) {
    aplayer.play()
  }
  startLyricMonitor()

  aplayer.on('play', () => {
    startLyricMonitor()
  })

  aplayer.on('pause', () => {
    stopLyricMonitor()
  })
}

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
/* 兜底强制开启滚动，解决mini模式listMaxHeight失效 */
:deep(.aplayer.aplayer-fixed .aplayer-list ol) {
    max-height: 300px !important;
    overflow-y: auto !important;
    overflow-x: hidden;
    padding-left: 0 !important;
    padding-right: 0 !important;
}
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
  width: 700px;
  pointer-events: auto;
  z-index: 1001;
}

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

@media (max-width: 768px) {
  .aplayer-container {
    width: 700px;
    /* bottom: 16px;
    left: 16px; */
  }

  .lyric-container {
    bottom: 100px;
    max-width: 90%;
  }

  .lyric-text {
    font-size: 13px;
    padding: 8px 16px;
  }

  /* 兜底强制开启滚动，解决mini模式listMaxHeight失效 */
:deep(.aplayer.aplayer-fixed .aplayer-list ol) {
    max-height: 300px !important;
    overflow-y: auto !important;
    overflow-x: hidden;
    padding-left: 0 !important;
    padding-right: 0 !important;
}
}
</style>
