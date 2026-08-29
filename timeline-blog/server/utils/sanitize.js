const sanitizeHtml = require('sanitize-html');

/**
 * 富文本内容 XSS 清洗配置
 * 保留 wangEditor 常用标签和属性，过滤危险标签和事件
 */

// 允许的 HTML 标签
const allowedTags = [
  // 文本格式
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'p', 'br', 'hr',
  'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'del',
  'sub', 'sup',
  'span', 'font',
  'blockquote', 'pre', 'code',
  // 列表
  'ul', 'ol', 'li',
  // 链接和媒体
  'a', 'img', 'video', 'source',
  // 表格
  'table', 'thead', 'tbody', 'tr', 'th', 'td', 'caption',
  // 布局
  'div', 'section', 'figure', 'figcaption',
  // 其他
  'mark', 'ins'
];

// 允许的标签属性
const allowedAttributes = {
  '*': ['style', 'class', 'data-*'],
  'a': ['href', 'title', 'target', 'rel'],
  'img': ['src', 'alt', 'title', 'width', 'height', 'data-*'],
  'video': ['src', 'controls', 'width', 'height', 'poster', 'data-*'],
  'source': ['src', 'type'],
  'td': ['colspan', 'rowspan', 'align', 'valign'],
  'th': ['colspan', 'rowspan', 'align', 'valign'],
  'font': ['color', 'size', 'face'],
  'span': ['style']
};

// 允许的 CSS 样式属性（防止表达式注入）
const allowedStyles = [
  'color', 'background-color', 'background',
  'font-size', 'font-family', 'font-weight', 'font-style',
  'text-align', 'text-decoration', 'text-indent',
  'line-height', 'letter-spacing',
  'margin', 'margin-left', 'margin-right', 'margin-top', 'margin-bottom',
  'padding', 'padding-left', 'padding-right', 'padding-top', 'padding-bottom',
  'border', 'border-radius',
  'width', 'height', 'max-width', 'max-height',
  'float', 'clear',
  'list-style-type', 'list-style',
  'vertical-align',
  'opacity'
];

// 允许的 URI 协议（过滤 javascript: 等危险协议）
const allowedSchemes = ['http', 'https', 'mailto', 'tel', 'data'];

// 允许的协议属性
const allowedSchemesByTag = {
  'img': ['http', 'https', 'data'],
  'video': ['http', 'https', 'data'],
  'source': ['http', 'https', 'data'],
  'a': ['http', 'https', 'mailto', 'tel']
};

/**
 * 清洗富文本 HTML 内容，防止 XSS
 * @param {string} html - 原始 HTML 内容
 * @param {object} options - 额外配置
 * @returns {string} 清洗后的安全 HTML
 */
function sanitizeRichText(html, options = {}) {
  if (!html || typeof html !== 'string') return '';

  return sanitizeHtml(html, {
    allowedTags,
    allowedAttributes,
    allowedStyles,
    allowedSchemes,
    allowedSchemesByTag,
    // 自动给链接添加 rel="noopener noreferrer" 和 target="_blank"
    transformTags: {
      'a': sanitizeHtml.simpleTransform('a', {
        target: '_blank',
        rel: 'noopener noreferrer'
      })
    },
    // 允许空标签（如 <br/>）
    allowVulnerableTags: false,
    // 解析 HTML 实体
    decodeEntities: true,
    ...options
  });
}

/**
 * 从富文本 HTML 中提取纯文本（用于字数统计、非空校验等）
 * @param {string} html - HTML 内容
 * @returns {string} 纯文本内容
 */
function extractPlainText(html) {
  if (!html || typeof html !== 'string') return '';
  // 先清洗再去标签，确保安全
  const clean = sanitizeRichText(html, {
    allowedTags: [],
    allowedAttributes: {}
  });
  return clean.replace(/\s+/g, ' ').trim();
}

/**
 * 判断富文本内容是否为空（去除标签和空白后是否有内容）
 * @param {string} html - HTML 内容
 * @returns {boolean} 是否为空
 */
function isRichTextEmpty(html) {
  return extractPlainText(html).length === 0;
}

module.exports = {
  sanitizeRichText,
  extractPlainText,
  isRichTextEmpty
};
