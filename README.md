# 食材小查 MVP

uni-app CLI / Vite + Vue3 + TypeScript + 微信云开发的小程序工程。

## 当前已完成

1. 项目初始化：补齐 `package.json`、`vite.config.ts`、`tsconfig.json`、`src/manifest.json`、`src/pages.json`。
2. 目录结构：建立 `src/pages`、`src/api`、`src/config`、`src/stores`、`src/styles`、`src/types`、`src/data/cloud-init`。
3. 微信云开发初始化：在 `src/main.ts` 中调用 `wx.cloud.init`。
4. 数据库读取链路：前端通过 `src/api/cloud.ts` 调用云函数，云函数读取云数据库集合。

## 云开发配置

云环境 ID 集中配置在：

```text
src/config/cloud.ts
```

拿到真实环境 ID 后，将 `CLOUD_ENV_ID` 改成微信云开发控制台里的环境 ID。

## 云函数

```text
cloudfunctions/
  getHomeData/
  getIngredientList/
  importKnowledgeData/
```

微信云数据库需要创建以下集合：

```text
ingredients
body_conditions
condition_ingredient_rules
ingredient_pairings
knowledge_sources
tag_dicts
system_configs
```

## 初始化数据

已从 `data/` 下四批 Markdown 数据清单提取为：

```text
src/data/cloud-init/*.json
```

这些文件内容是 JSON Lines 格式，文件后缀仍保持 `.json`。每一行是一条独立 JSON 对象。

导入顺序见 `src/data/cloud-init/README.md`。

## 常用命令

```bash
npm run extract:cloud-data
npm run dev:mp-weixin
npm run build:mp-weixin
```
