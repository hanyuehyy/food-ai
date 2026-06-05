# 食材小查 (Food Ingredient Lookup)

微信小程序 MVP，帮助用户查询食材营养信息、按身体状况筛选食材、查看时令食材推荐和食材搭配方案。

## 技术栈

- **前端**: uni-app CLI + Vue 3 + TypeScript + Vite
- **目标平台**: 微信小程序 (mp-weixin)
- **后端**: 微信云开发 (cloud functions + cloud database)
- **状态管理**: Pinia
- **UI 组件库**: wot-design-uni (easycom 自动导入 `wd-*`)
- **样式**: SCSS，单位 rpx

**AppID**: `wxcadf76a84943b5cc`
**云环境 ID**: 配置在 `src/config/cloud.ts` 中

## 构建与运行

```bash
npm run dev:mp-weixin       # 开发构建，输出到 dist/dev/mp-weixin/
npm run build:mp-weixin     # 生产构建
npm run type-check          # TypeScript 类型检查
npm run extract:cloud-data  # 从 data/ 提取种子数据到 src/data/cloud-init/
```

开发构建产物在 `dist/dev/mp-weixin/`，用微信开发者工具打开即可调试。云函数需在开发者工具中单独部署。

## 目录结构

```
src/
  api/cloud.ts              # 云函数调用封装（类型安全）
  config/cloud.ts           # 云环境 ID 和函数名常量
  pages/
    index/                  # 首页（体质筛选、时令推荐、搜索）
    ingredient-library/     # 食材库（分类浏览、关键词搜索）
    ingredient-detail/      # 食材详情（营养、搭配、来源）
  stores/ingredient.ts      # Pinia store
  types/cloud.ts            # 所有云数据的 TypeScript 接口定义
  styles/variables.scss     # 设计 token（颜色、圆角、阴影）
  utils/cloud-image.ts      # 云文件 ID 转临时 URL
  data/cloud-init/          # JSON Lines 格式种子数据（仅初始导入用）

cloudfunctions/             # 微信云函数
  getHomeData/              # 首页数据聚合
  getIngredientList/        # 食材列表（分页、搜索、筛选）
  getIngredientDetail/      # 食材详情（含搭配、来源）
  getIngredientCategories/  # 食材分类列表
  importKnowledgeData/      # 批量数据导入工具（append/upsert）
  updateIngredientImageFileIds/  # 批量更新食材图片 ID
  renameCloudFile/          # 云存储文件重命名工具

scripts/                    # 数据管理 JSON 文件（供 importKnowledgeData 调用）
  templates/                # 数据模板（食材、搭配、规则等）
```

## 云数据库集合

| 集合 | 主键 | 说明 |
|------|------|------|
| `ingredients` | `ingredientId` | 食材实体，含营养、标签、搭配引用 |
| `body_conditions` | `conditionId` | 身体状况（熬夜、疲劳、便秘等） |
| `ingredient_pairings` | `pairingId` | 食材搭配方案 |
| `condition_ingredient_rules` | `ruleId` | 体质-食材推荐规则 |
| `knowledge_sources` | `sourceId` | 知识来源引用 |
| `tag_dicts` | `tagId` + `tagType` | 标签字典 |
| `system_configs` | `configKey` | 系统配置 |
| `monthly_seasonal_rules` | `id` | 时令食材规则 |
| `region_mappings` | - | 省份-区域映射 |

**集合间关系**（双向 ID 数组引用）:
- `ingredients.pairingIds[]` <-> `ingredient_pairings.ingredientIds[]`
- `ingredients.suitableConditionIds[]` -> `body_conditions.conditionId`
- `ingredients.sourceIds[]` -> `knowledge_sources.sourceId`
- `ingredient_pairings.suitableConditionIds[]` -> `body_conditions.conditionId`

## 云函数统一响应格式

```javascript
{ success: boolean, code: number, message: string, data: any }
```

## 关键约定

- **数据源**: 云数据库是唯一真实数据源。`src/data/cloud-init/` 和 `scripts/` 下的本地 JSON 是初始种子数据或导入工具，会随时间过时，不能用于判断当前数据量或内容。
- **条件编译**: 微信相关代码用 `#ifdef MP-WEIXIN` / `#ifndef MP-WEIXIN` 包裹
- **图片处理**: 云存储 `cloud://` 文件 ID 通过 `cloud.getTempFileURL()` 转临时 URL
- **数据导入**: 通过 `importKnowledgeData` 云函数，支持 `append`（追加）和 `upsert`（按主键更新或插入）两种模式
- **设计风格**: 暖色调（`$color-bg: #faf7f2`），绿色主色（`$color-primary: #57a867`）
