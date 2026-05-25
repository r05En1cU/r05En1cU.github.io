import { createServer } from 'node:http';
import { mkdir, readFile, readdir, writeFile, copyFile } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(root, 'public');
const contentDir = path.join(root, 'src', 'content');
const configPath = path.join(root, 'src', 'lib', 'featured.ts');
const assetDir = path.join(publicDir, 'uploads');
const port = Number(process.env.STUDIO_PORT || 4177);

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
};

const json = (response, status, body) => {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(body));
};

const text = async (request) => {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
};

const slugify = (value) => value
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
  .replace(/^-+|-+$/g, '') || 'untitled';

const formatDate = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const listMarkdown = async (collection) => {
  const dir = path.join(contentDir, collection);
  await mkdir(dir, { recursive: true });
  const files = (await readdir(dir)).filter((file) => file.endsWith('.md')).sort();
  return Promise.all(files.map(async (file) => ({
    collection,
    file,
    path: `src/content/${collection}/${file}`,
    content: await readFile(path.join(dir, file), 'utf8')
  })));
};

const buildMarkdown = ({ type, title, description, project, status, tags, body }) => {
  const titleValue = String(title || '').trim() || '未命名内容';
  const typeValue = type === 'blog' ? 'blog' : 'activity';
  const tagList = String(tags || '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
  const slug = slugify(titleValue);
  const filePath = `src/content/${typeValue}/${slug}.md`;
  const frontmatter = typeValue === 'blog'
    ? [
        '---',
        `title: ${titleValue}`,
        `description: ${String(description || titleValue).trim()}`,
        `date: ${formatDate()}`,
        'featured: false',
        'carousel: false',
        'tags:',
        ...(tagList.length ? tagList.map((tag) => `  - ${tag}`) : ['  - notes']),
        '---'
      ]
    : [
        '---',
        `title: ${titleValue}`,
        `date: ${formatDate()}`,
        `status: ${status || 'active'}`,
        ...(project ? [`project: ${String(project).trim()}`] : []),
        'tags:',
        ...(tagList.length ? tagList.map((tag) => `  - ${tag}`) : ['  - project']),
        '---'
      ];

  return {
    filePath,
    markdown: [...frontmatter, '', String(body || '').trim() || '正文内容。', ''].join('\n')
  };
};

const saveMarkdown = async (payload) => {
  const { filePath, markdown } = payload.filePath && payload.markdown
    ? payload
    : buildMarkdown(payload);
  const normalized = filePath.replaceAll('\\', '/');
  if (!normalized.startsWith('src/content/blog/') && !normalized.startsWith('src/content/activity/')) {
    throw new Error('只允许写入 src/content/blog 或 src/content/activity');
  }
  const absolute = path.join(root, normalized);
  await mkdir(path.dirname(absolute), { recursive: true });
  await writeFile(absolute, markdown, 'utf8');
  return { filePath: normalized };
};

const saveFeatured = async (payload) => {
  const featuredPosts = Array.isArray(payload.featuredPosts) ? payload.featuredPosts : [];
  const carouselPosts = Array.isArray(payload.carouselPosts) ? payload.carouselPosts : [];
  const source = `export const featuredContent = {\n  featuredPosts: ${JSON.stringify(featuredPosts, null, 2)},\n  carouselPosts: ${JSON.stringify(carouselPosts, null, 2)}\n};\n`;
  await writeFile(configPath, source, 'utf8');
  return { filePath: 'src/lib/featured.ts' };
};

const readFeatured = async () => {
  try {
    const source = await readFile(configPath, 'utf8');
    const readArray = (key) => {
      const match = source.match(new RegExp(`${key}:\\s*(\\[[\\s\\S]*?\\])`));
      return match ? JSON.parse(match[1]) : [];
    };
    return {
      featuredPosts: readArray('featuredPosts'),
      carouselPosts: readArray('carouselPosts')
    };
  } catch {
    return { featuredPosts: [], carouselPosts: [] };
  }
};

const uploadImage = async (payload) => {
  const source = String(payload.source || '').trim();
  if (!source) throw new Error('缺少图片路径');
  const absoluteSource = path.resolve(root, source);
  const name = slugify(path.basename(source, path.extname(source)));
  const ext = path.extname(source).toLowerCase() || '.png';
  const fileName = `${name}${ext}`;
  await mkdir(assetDir, { recursive: true });
  await copyFile(absoluteSource, path.join(assetDir, fileName));
  return { url: `/uploads/${fileName}` };
};

const serveStatic = async (response, requestPath) => {
  if (requestPath === '/vendor/marked.esm.js') {
    await serveFile(response, path.join(root, 'node_modules', 'marked', 'lib', 'marked.esm.js'));
    return;
  }

  if (requestPath === '/vendor/auto-render.mjs') {
    await serveFile(response, path.join(root, 'node_modules', 'katex', 'dist', 'contrib', 'auto-render.mjs'));
    return;
  }

  if (requestPath === '/katex.mjs') {
    await serveFile(response, path.join(root, 'node_modules', 'katex', 'dist', 'katex.mjs'));
    return;
  }

  if (requestPath === '/vendor/katex.min.css') {
    await serveFile(response, path.join(root, 'node_modules', 'katex', 'dist', 'katex.min.css'));
    return;
  }

  if (requestPath.startsWith('/vendor/fonts/')) {
    await serveFile(response, path.join(root, 'node_modules', 'katex', 'dist', 'fonts', path.basename(requestPath)));
    return;
  }

  const filePath = requestPath === '/' ? '/studio/index.html' : requestPath;
  await serveFile(response, path.normalize(path.join(root, filePath)));
};

const serveFile = async (response, absolute) => {
  if (!absolute.startsWith(root)) {
    json(response, 403, { error: 'Forbidden' });
    return;
  }
  const ext = path.extname(absolute);
  try {
    const file = await readFile(absolute);
    response.writeHead(200, { 'content-type': contentTypes[ext] || 'application/octet-stream' });
    response.end(file);
  } catch {
    json(response, 404, { error: 'Not found' });
  }
};

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || '/', `http://${request.headers.host}`);

    if (request.method === 'GET' && url.pathname === '/api/content') {
      json(response, 200, {
        blog: await listMarkdown('blog'),
        activity: await listMarkdown('activity')
      });
      return;
    }

    if (request.method === 'GET' && url.pathname === '/api/featured') {
      json(response, 200, await readFeatured());
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/content') {
      json(response, 200, await saveMarkdown(JSON.parse(await text(request))));
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/featured') {
      json(response, 200, await saveFeatured(JSON.parse(await text(request))));
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/image') {
      json(response, 200, await uploadImage(JSON.parse(await text(request))));
      return;
    }

    if (request.method === 'GET') {
      await serveStatic(response, url.pathname);
      return;
    }

    json(response, 405, { error: 'Method not allowed' });
  } catch (error) {
    json(response, 500, { error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

server.listen(port, () => {
  console.log(`RosenIcu Studio: http://127.0.0.1:${port}`);
});
