<template>
  <div class="rich-text-editor-wrapper" :class="{ 'simple-mode': mode === 'simple' }">
    <Toolbar
      class="editor-toolbar"
      :editor="editorRef"
      :defaultConfig="toolbarConfig"
      :mode="editorMode"
    />
    <Editor
      class="editor-content"
      v-model="valueHtml"
      :defaultConfig="editorConfig"
      :mode="editorMode"
      @onCreated="handleCreated"
      @onChange="handleChange"
    />
  </div>
</template>

<script setup>
import { ref, shallowRef, onBeforeUnmount, watch, computed } from 'vue'
import { Editor, Toolbar } from '@wangeditor/editor-for-vue'
import '@wangeditor/editor/dist/css/style.css'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  mode: {
    type: String,
    default: 'full',
    validator: (val) => ['full', 'simple'].includes(val)
  },
  placeholder: {
    type: String,
    default: '请输入内容...'
  },
  height: {
    type: Number,
    default: 400
  }
})

const emit = defineEmits(['update:modelValue', 'change'])

const editorRef = shallowRef()
const valueHtml = ref(props.modelValue || '')

const editorMode = computed(() => (props.mode === 'simple' ? 'simple' : 'default'))

// 完整工具栏配置（文章编辑用）
const fullToolbarKeys = [
  'headerSelect',
  'blockquote',
  '|',
  'bold', 'underline', 'italic', 'through', 'code', 'sub', 'sup', 'clearStyle',
  '|',
  'fontFamily', 'fontSize', 'color', 'bgColor',
  '|',
  'justifyLeft', 'justifyRight', 'justifyCenter', 'justifyJustify',
  '|',
  'lineHeight', 'indent', 'delIndent',
  '|',
  'bulletedList', 'numberedList',
  '|',
  'insertLink', 'insertImage', 'insertVideo', 'insertTable', 'divider', 'emotion',
  '|',
  'codeBlock', 'undo', 'redo'
]

// 简化工具栏配置（评论用）
const simpleToolbarKeys = [
  'bold', 'italic', 'underline', 'through',
  '|',
  'color', 'bgColor',
  '|',
  'bulletedList', 'numberedList',
  '|',
  'insertLink', 'emotion', 'code', 'blockquote',
  '|',
  'undo', 'redo'
]

const toolbarConfig = computed(() => ({
  excludeKeys: [],
  toolbarKeys: props.mode === 'simple' ? simpleToolbarKeys : fullToolbarKeys
}))

const editorConfig = computed(() => ({
  placeholder: props.placeholder,
  MENU_CONF: {
    // 图片上传配置：使用base64内嵌，无需额外上传接口
    uploadImage: {
      base64LimitSize: 5 * 1024 * 1024 // 5MB 以内转 base64
    },
    // 视频上传配置
    uploadVideo: {
      base64LimitSize: 10 * 1024 * 1024 // 10MB 以内转 base64
    }
  },
  // 粘贴时过滤样式，保留语义标签
  pasteFilterStyle: true,
  pasteIgnoreImg: false
}))

function handleCreated(editor) {
  editorRef.value = editor
}

function handleChange(editor) {
  const html = editor.getHtml()
  emit('update:modelValue', html)
  emit('change', html)
}

// 监听外部值变化（如编辑时回填）
watch(
  () => props.modelValue,
  (newVal) => {
    if (newVal !== valueHtml.value) {
      valueHtml.value = newVal || ''
    }
  }
)

onBeforeUnmount(() => {
  const editor = editorRef.value
  if (editor) {
    editor.destroy()
  }
})
</script>

<style scoped>
.rich-text-editor-wrapper {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
  background: var(--card-bg);
  transition: border-color 0.3s;
}

.rich-text-editor-wrapper:focus-within {
  border-color: var(--primary-color);
}

.editor-toolbar {
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-color);
  z-index: 1;
}

.editor-content {
  height: v-bind('height + "px"');
  overflow-y: auto;
  background: var(--card-bg);
}

/* 简单模式下更紧凑 */
.simple-mode .editor-content {
  min-height: 120px;
}

/* 适配暗色主题 */
:global(.dark) .rich-text-editor-wrapper,
:global(.dark) .w-e-text-container,
:global(.dark) .w-e-toolbar {
  background-color: var(--card-bg) !important;
  color: var(--text-color) !important;
}

:global(.dark) .w-e-text-container [data-slate-editor] {
  color: var(--text-color) !important;
}

:global(.dark) .w-e-toolbar .w-e-bar-item button {
  color: var(--text-secondary) !important;
}

:global(.dark) .w-e-toolbar .w-e-bar-item button:hover {
  background-color: var(--bg-color) !important;
  color: var(--primary-color) !important;
}

:global(.dark) .w-e-text-placeholder {
  color: var(--text-muted) !important;
}

:global(.dark) .w-e-scroll::-webkit-scrollbar-thumb {
  background: var(--border-color);
}
</style>
