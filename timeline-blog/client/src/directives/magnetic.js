/**
 * v-magnetic 指令
 * 用法：<button v-magnetic>按钮</button>
 * 标记元素为磁吸光标目标，鼠标悬停时光标会被吸引并放大
 */
export const magnetic = {
  mounted(el) {
    el.__magnetic__ = true
    el.style.cursor = 'none'
  },
  unmounted(el) {
    el.__magnetic__ = false
    el.style.cursor = ''
  }
}

export default magnetic
