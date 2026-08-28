<template>
  <div
    ref="pointerRef"
    class="magnetic-pointer"
    :class="{ hovering: isHovering, clicking: isClicking, visible: isVisible }"
    :style="pointerStyle"
  >
    <div class="corner corner-tl"></div>
    <div class="corner corner-tr"></div>
    <div class="corner corner-bl"></div>
    <div class="corner corner-br"></div>
    <div class="pointer-dot"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'

const pointerRef = ref(null)
const isHovering = ref(false)
const isClicking = ref(false)
const isVisible = ref(false)

// 目标位置（鼠标实际位置）
const targetX = ref(0)
const targetY = ref(0)
// 当前渲染位置（带缓动）
const currentX = ref(0)
const currentY = ref(0)
// 目标尺寸
const targetWidth = ref(32)
const targetHeight = ref(32)
const currentWidth = ref(32)
const currentHeight = ref(32)

let rafId = null
let currentTarget = null
const MAGNETIC_STRENGTH = 0.15 // 磁吸强度（越小吸附越强）
const LERP_SPEED = 0.18 // 缓动速度

const pointerStyle = computed(() => ({
  transform: `translate(${currentX.value}px, ${currentY.value}px)`,
  '--width': `${currentWidth.value}px`,
  '--height': `${currentHeight.value}px`
}))

function onMouseMove(e) {
  isVisible.value = true
  targetX.value = e.clientX
  targetY.value = e.clientY

  if (currentTarget) {
    const rect = currentTarget.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    // 磁吸：鼠标位置向元素中心偏移
    targetX.value = centerX + (e.clientX - centerX) * MAGNETIC_STRENGTH
    targetY.value = centerY + (e.clientY - centerY) * MAGNETIC_STRENGTH
  }
}

function onMouseDown() { isClicking.value = true }
function onMouseUp() { isClicking.value = false }
function onMouseLeave() { isVisible.value = false }
function onMouseEnter() { isVisible.value = true }

// 检查元素是否为磁吸目标
function isMagneticElement(el) {
  if (!el) return false
  // 直接标记
  if (el.hasAttribute?.('data-magnetic') || el.__magnetic__) return true
  // 交互元素自动磁吸
  const tag = el.tagName
  if (tag === 'BUTTON' || tag === 'A') return true
  if (el.classList?.contains('magnetic-target')) return true
  return false
}

function findMagneticTarget(e) {
  let el = e.target
  while (el && el !== document.body) {
    if (isMagneticElement(el)) return el
    el = el.parentElement
  }
  return null
}

function onMouseOver(e) {
  const target = findMagneticTarget(e)
  if (target && target !== currentTarget) {
    currentTarget = target
    isHovering.value = true
    const rect = target.getBoundingClientRect()
    const padding = Math.max(rect.width, rect.height) * 0.15 + 12
    targetWidth.value = rect.width + padding
    targetHeight.value = rect.height + padding
  } else if (!target && currentTarget) {
    currentTarget = null
    isHovering.value = false
    targetWidth.value = 32
    targetHeight.value = 32
  }
}

// 缓动动画循环
function animate() {
  currentX.value += (targetX.value - currentX.value) * LERP_SPEED
  currentY.value += (targetY.value - currentY.value) * LERP_SPEED
  currentWidth.value += (targetWidth.value - currentWidth.value) * LERP_SPEED
  currentHeight.value += (targetHeight.value - currentHeight.value) * LERP_SPEED
  rafId = requestAnimationFrame(animate)
}

onMounted(() => {
  window.addEventListener('mousemove', onMouseMove, { passive: true })
  window.addEventListener('mouseover', onMouseOver, { passive: true })
  window.addEventListener('mousedown', onMouseDown)
  window.addEventListener('mouseup', onMouseUp)
  document.addEventListener('mouseleave', onMouseLeave)
  document.addEventListener('mouseenter', onMouseEnter)
  animate()
})

onUnmounted(() => {
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseover', onMouseOver)
  window.removeEventListener('mousedown', onMouseDown)
  window.removeEventListener('mouseup', onMouseUp)
  document.removeEventListener('mouseleave', onMouseLeave)
  document.removeEventListener('mouseenter', onMouseEnter)
  if (rafId) cancelAnimationFrame(rafId)
})
</script>

<style scoped>
.magnetic-pointer {
  position: fixed;
  top: 0;
  left: 0;
  width: var(--width, 32px);
  height: var(--height, 32px);
  margin-left: calc(var(--width, 32px) / -2);
  margin-top: calc(var(--height, 32px) / -2);
  pointer-events: none;
  z-index: 99999;
  opacity: 0;
  transition: opacity 0.2s;
  will-change: transform, width, height;
}
.magnetic-pointer.visible { opacity: 1; }

.corner {
  position: absolute;
  width: 8px;
  height: 8px;
  border-color: var(--primary-color, #1890ff);
  border-style: solid;
  border-width: 0;
  transition: border-color 0.3s;
}
.corner-tl { top: 0; left: 0; border-top-width: 2px; border-left-width: 2px; }
.corner-tr { top: 0; right: 0; border-top-width: 2px; border-right-width: 2px; }
.corner-bl { bottom: 0; left: 0; border-bottom-width: 2px; border-left-width: 2px; }
.corner-br { bottom: 0; right: 0; border-bottom-width: 2px; border-right-width: 2px; }

.pointer-dot {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 4px;
  height: 4px;
  background: var(--primary-color, #1890ff);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  opacity: 0;
  transition: opacity 0.2s;
}

.magnetic-pointer.hovering .corner {
  border-color: #00d4ff;
  box-shadow: 0 0 12px rgba(0, 212, 255, 0.4);
}
.magnetic-pointer.hovering .pointer-dot {
  opacity: 1;
  background: #00d4ff;
  box-shadow: 0 0 8px rgba(0, 212, 255, 0.6);
}

.magnetic-pointer.clicking {
  transform-origin: center;
}
.magnetic-pointer.clicking .corner {
  border-color: #722ed1;
}

/* 触屏设备隐藏 */
@media (hover: none) and (pointer: coarse) {
  .magnetic-pointer { display: none; }
}
</style>
