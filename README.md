# r05En1cU.github.io

RosenIcu 的个人博客、进度记录和项目入口。

## 本地开发

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
```

## 内容目录

- `src/content/blog/`：博客文章，适合完整笔记和阶段性总结。
- `src/content/progress/`：进度记录，适合高频短日志。
- `src/pages/projects/index.astro`：项目与仓库入口。

## 账号系统

站点左上角账号菜单支持发起 GitHub OAuth 登录。由于 GitHub Pages 是纯静态托管，前端不会保存 `client_secret`，需要额外配置一个 OAuth exchange 服务来用 GitHub 返回的 `code` 换取用户资料和可选的提交 token。

需要的公开环境变量：

```bash
PUBLIC_GITHUB_CLIENT_ID=your_github_oauth_client_id
PUBLIC_GITHUB_OAUTH_EXCHANGE_URL=https://your-worker.example.com/auth/github/exchange
```

白名单账号配置在 `src/lib/auth.ts`。白名单账号登录后会显示 `/admin/` 内容编辑入口。若 exchange 服务返回 `access_token`，编辑页可以通过 GitHub Contents API 新增 Markdown；同名文件已存在时会读取现有 `sha` 后更新内容。否则只生成可手动提交的 Markdown 草稿。

## 发布

推送到 `main` 分支后，GitHub Actions 会构建并部署到 GitHub Pages。
