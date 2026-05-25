import { marked } from '/vendor/marked.esm.js';
import renderMathInElement from '/vendor/auto-render.mjs';

const state = {
  items: [],
  currentPath: '',
  featuredPosts: new Set(),
  carouselPosts: new Set()
};

const elements = {
  type: document.querySelector('[name="type"]'),
  title: document.querySelector('[name="title"]'),
  description: document.querySelector('[name="description"]'),
  project: document.querySelector('[name="project"]'),
  status: document.querySelector('[name="status"]'),
  tags: document.querySelector('[name="tags"]'),
  body: document.querySelector('[name="body"]'),
  imageSource: document.querySelector('[name="imageSource"]'),
  imageWidth: document.querySelector('[name="imageWidth"]'),
  imageHeight: document.querySelector('[name="imageHeight"]'),
  imageAlt: document.querySelector('[name="imageAlt"]'),
  list: document.querySelector('[data-content-list]'),
  featuredList: document.querySelector('[data-featured-list]'),
  preview: document.querySelector('[data-preview]'),
  count: document.querySelector('[data-count]'),
  path: document.querySelector('[data-path]'),
  statusText: document.querySelector('[data-status]')
};

const request = async (url, options) => {
  const response = await fetch(url, options);
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || response.statusText);
  return payload;
};

const slugify = (value) => value
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
  .replace(/^-+|-+$/g, '') || 'untitled';

const parseFrontmatter = (content) => {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { data: {}, body: content };
  const data = {};
  let currentKey = '';
  for (const line of match[1].split('\n')) {
    const pair = line.match(/^([\w-]+):\s*(.*)$/);
    const listItem = line.match(/^\s+-\s*(.*)$/);
    if (pair) {
      currentKey = pair[1];
      data[currentKey] = pair[2] || [];
    } else if (listItem && currentKey) {
      if (!Array.isArray(data[currentKey])) data[currentKey] = [];
      data[currentKey].push(listItem[1]);
    }
  }
  return { data, body: match[2].trim() };
};

const setTypeFields = () => {
  const isBlog = elements.type.value === 'blog';
  document.querySelectorAll('[data-blog-field]').forEach((item) => item.hidden = !isBlog);
  document.querySelectorAll('[data-activity-field]').forEach((item) => item.hidden = isBlog);
};

const buildMarkdown = () => {
  const title = elements.title.value.trim() || '未命名内容';
  const tags = elements.tags.value.split(',').map((tag) => tag.trim()).filter(Boolean);
  const date = new Date().toISOString().slice(0, 10);
  const frontmatter = elements.type.value === 'blog'
    ? [
        '---',
        `title: ${title}`,
        `description: ${elements.description.value.trim() || title}`,
        `date: ${date}`,
        'tags:',
        ...(tags.length ? tags.map((tag) => `  - ${tag}`) : ['  - notes']),
        '---'
      ]
    : [
        '---',
        `title: ${title}`,
        `date: ${date}`,
        `status: ${elements.status.value}`,
        ...(elements.project.value.trim() ? [`project: ${elements.project.value.trim()}`] : []),
        'tags:',
        ...(tags.length ? tags.map((tag) => `  - ${tag}`) : ['  - project']),
        '---'
      ];
  return [...frontmatter, '', elements.body.value.trim() || '正文内容。', ''].join('\n');
};

const currentFilePath = () => {
  if (state.currentPath) return state.currentPath;
  return `src/content/${elements.type.value}/${slugify(elements.title.value || 'untitled')}.md`;
};

const renderPreview = () => {
  const markdown = elements.body.value || '';
  elements.preview.innerHTML = marked.parse(markdown, { gfm: true, breaks: false });
  renderMathInElement(elements.preview, {
    delimiters: [
      { left: '$$', right: '$$', display: true },
      { left: '$', right: '$', display: false },
      { left: '\\(', right: '\\)', display: false },
      { left: '\\[', right: '\\]', display: true }
    ],
    throwOnError: false
  });
};

const loadItem = (item) => {
  const parsed = parseFrontmatter(item.content);
  state.currentPath = item.path;
  elements.type.value = item.collection;
  elements.title.value = parsed.data.title || '';
  elements.description.value = parsed.data.description || '';
  elements.project.value = parsed.data.project || '';
  elements.status.value = parsed.data.status || 'active';
  elements.tags.value = Array.isArray(parsed.data.tags) ? parsed.data.tags.join(', ') : '';
  elements.body.value = parsed.body;
  elements.path.textContent = item.path;
  elements.statusText.textContent = '已载入';
  setTypeFields();
  renderPreview();
};

const renderLists = () => {
  elements.count.textContent = String(state.items.length);
  elements.list.innerHTML = state.items.map((item) => {
    const parsed = parseFrontmatter(item.content);
    return `<button class="item" data-path="${item.path}"><strong>${parsed.data.title || item.file}</strong><span>${item.path}</span></button>`;
  }).join('');
  elements.featuredList.innerHTML = state.items.map((item) => {
    const parsed = parseFrontmatter(item.content);
    const isBlog = item.collection === 'blog';
    return `<label class="choice"><span><strong>${parsed.data.title || item.file}</strong><small>${item.path}</small></span><span><input type="checkbox" data-featured="${item.path}" ${state.featuredPosts.has(item.path) ? 'checked' : ''} ${isBlog ? '' : 'disabled'} /> 重点</span><span><input type="checkbox" data-carousel="${item.path}" ${state.carouselPosts.has(item.path) ? 'checked' : ''} ${isBlog ? '' : 'disabled'} /> 轮播</span></label>`;
  }).join('');
};

const loadContent = async () => {
  const [data, featured] = await Promise.all([
    request('/api/content'),
    request('/api/featured')
  ]);
  state.items = [...data.blog, ...data.activity];
  state.featuredPosts = new Set(featured.featuredPosts || []);
  state.carouselPosts = new Set(featured.carouselPosts || []);
  renderLists();
};

const insertAtCursor = (text) => {
  const start = elements.body.selectionStart;
  const end = elements.body.selectionEnd;
  elements.body.setRangeText(text, start, end, 'end');
  elements.body.focus();
  renderPreview();
};

const saveContent = async () => {
  const markdown = buildMarkdown();
  const filePath = currentFilePath();
  const result = await request('/api/content', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ filePath, markdown })
  });
  state.currentPath = result.filePath;
  elements.path.textContent = result.filePath;
  elements.statusText.textContent = `已保存 ${result.filePath}`;
  await loadContent();
};

const uploadImage = async () => {
  const result = await request('/api/image', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ source: elements.imageSource.value })
  });
  const width = elements.imageWidth.value.trim();
  const height = elements.imageHeight.value.trim();
  const alt = elements.imageAlt.value.trim() || 'image';
  const size = [width ? `width="${width}"` : '', height ? `height="${height}"` : ''].filter(Boolean).join(' ');
  insertAtCursor(`<img src="${result.url}" alt="${alt}" ${size} />`);
  elements.statusText.textContent = `已插入 ${result.url}`;
};

const saveFeatured = async () => {
  const featuredPosts = [...document.querySelectorAll('[data-featured]:checked')].map((item) => item.dataset.featured);
  const carouselPosts = [...document.querySelectorAll('[data-carousel]:checked')].map((item) => item.dataset.carousel);
  const result = await request('/api/featured', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ featuredPosts, carouselPosts })
  });
  elements.statusText.textContent = `已保存 ${result.filePath}`;
};

document.addEventListener('click', async (event) => {
  const target = event.target.closest('button, a, input');
  if (!target) return;

  if (target.matches('[data-path]')) {
    loadItem(state.items.find((item) => item.path === target.dataset.path));
  }

  if (target.matches('[data-insert]')) {
    insertAtCursor(target.dataset.insert);
  }

  if (target.matches('[data-action="new"]')) {
    state.currentPath = '';
    document.querySelectorAll('input, textarea').forEach((item) => item.value = '');
    elements.type.value = 'blog';
    elements.status.value = 'active';
    elements.path.textContent = '新内容';
    setTypeFields();
    renderPreview();
  }

  if (target.matches('[data-action="save"]')) await saveContent();
  if (target.matches('[data-action="reload"]')) await loadContent();
  if (target.matches('[data-action="image"]')) document.querySelector('details').open = true;
  if (target.matches('[data-action="upload-image"]')) await uploadImage();
  if (target.matches('[data-action="save-featured"]')) await saveFeatured();
});

document.addEventListener('input', (event) => {
  if (event.target === elements.type) setTypeFields();
  if (event.target === elements.body) renderPreview();
  if (event.target.matches?.('[data-featured]')) {
    event.target.checked ? state.featuredPosts.add(event.target.dataset.featured) : state.featuredPosts.delete(event.target.dataset.featured);
  }
  if (event.target.matches?.('[data-carousel]')) {
    event.target.checked ? state.carouselPosts.add(event.target.dataset.carousel) : state.carouselPosts.delete(event.target.dataset.carousel);
  }
});

setTypeFields();
renderPreview();
loadContent().catch((error) => elements.statusText.textContent = error.message);
