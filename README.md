# r05En1cU.github.io

RosenIcu 的个人博客和项目入口。

## 本地开发

```bash
npm install
npm run dev
```

## 本地内容工作台

公开站点不包含 GitHub 登录和在线修改功能。内容修改在本地完成：

```bash
npm run studio
```

Studio 默认运行在 `http://127.0.0.1:4177/`，用于编辑 `src/content/blog/` 和 `src/content/activity/`。当前支持：

- Markdown 实时预览。
- LaTeX 公式预览，支持 `$...$` 和 `$$...$$`。
- 通过本地图片路径复制到 `public/uploads/`，并插入可调宽高的 `<img>`。
- 保存首页重点展示和轮播配置到 `src/lib/featured.ts`。

## 构建

```bash
npm run build
```

## 页面结构

- `/`：首页，总览身份、近况和最新内容。
- `/blog/`：博客文章，放完整笔记和阶段性总结。
- `/projects/`：项目入口，聚合仓库链接和项目动态。

## 内容目录

- `src/content/blog/`：博客文章，适合完整笔记和阶段性总结。
- `src/content/activity/`：项目动态，作为项目页里的短记录数据源。
- `src/pages/projects/index.astro`：项目与仓库入口。

## 发布

推送到 `main` 分支后，GitHub Actions 会构建并部署到 GitHub Pages。
