# AGENTS.md

## 项目说明

本项目是「食材小查」微信小程序 MVP。

本项目不是单纯的作品集 Demo，而是一个真实可运行、可持续扩展的微信小程序产品。

当前技术栈：

- uni-app CLI / Vite
- Vue3
- TypeScript
- 微信小程序端
- wot-design-uni
- Pinia
- SCSS
- 微信云开发

---

## 一、AI 工作原则

1. 默认只读取用户明确指定的文件。
2. 不要扫描整个项目。
3. 不要为了理解项目而自动读取所有目录。
4. 修改代码前，先说明准备读取哪些文件、准备修改哪些文件。
5. 如果认为需要额外读取文件，必须先说明原因，等待用户确认后再读取。
6. 不要擅自修改与当前任务无关的文件。
7. 不要擅自重构项目结构，除非用户明确要求。

---

## 二、默认禁止读取的目录

除非用户明确指定，否则不要读取以下目录：

- node_modules/
- dist/
- unpackage/
- .vite/
- .cache/
- coverage/
- docs/
- data/
- design-source/
- archive/
- backup/
- .history/
- old/

说明：

- docs/ 用于存放产品文档、技术文档、规则说明，默认不读取。
- data/ 用于存放食材数据、云数据库数据清单，默认不读取。
- design-source/ 用于存放 Pencil / PenSource 原始设计稿、大量设计素材，默认不读取。
- dist/、unpackage/ 是构建产物，禁止读取和修改。
- node_modules/ 是依赖目录，禁止读取和修改。

---

## 三、默认禁止读取的文件类型

除非用户明确指定，否则不要读取以下文件类型：

- .pen
- .fig
- .sketch
- .xd
- .html
- .svg
- .map
- .pdf
- .zip
- .mp4
- .mov
- .png
- .jpg
- .jpeg
- .webp
- .gif
- .ico
- .log

说明：

- .pen 是设计稿源文件，可能非常大，默认禁止读取。
- 图片文件只在用户明确要求参考某张图时读取。
- .html、.svg、.map 可能包含大量生成代码，默认禁止读取。
- package-lock.json 不要读取或修改，除非任务明确涉及依赖安装或版本调整。
- project.private.config.json 不要读取或修改。

---

## 四、源码读取规则

### 1. 修改页面时

优先只读取当前页面相关文件，例如：

- src/pages/xxx/xxx.vue
- src/pages/xxx/xxx.scss
- 当前页面直接引用的组件

不要因为修改一个页面而读取整个 src 目录。

### 2. 修改组件时

只读取：

- 当前组件文件
- 当前组件直接引用的子组件
- 当前组件直接使用的工具函数或类型文件

### 3. 修改状态管理时

只读取：

- 当前相关 Pinia store
- 与该 store 直接相关的接口文件或类型文件

### 4. 修改接口请求时

只读取：

- 当前接口文件
- 当前接口直接依赖的 request 封装文件
- 当前接口相关类型定义

### 5. 修改云函数时

只读取：

- cloudfunctions/ 下对应云函数目录
- 当前云函数直接依赖的文件

不要读取所有云函数目录。

### 6. 修改数据结构时

只有在用户明确指定时，才允许读取 data/ 或 docs/ 中的指定文件。

---

## 五、UI 开发规则

1. UI 页面开发时，优先基于当前页面代码和用户明确指定的设计参考。
2. 不要默认读取 Pencil / PenSource 的 .pen 原始设计稿。
3. 如果用户明确要求参考设计稿，只读取用户指定的单个设计稿或截图。
4. 不要把手机状态栏、电池、信号栏写进小程序页面代码。
5. 不要把设计稿中的演示性内容当成真实业务功能。
6. 不要为了还原视觉效果而破坏现有业务逻辑。
7. 不要擅自引入新的 UI 库或动画库。
8. 样式修改应尽量限制在当前页面或当前组件范围内。

---

## 六、图片与素材规则

1. 小程序真正运行时使用的图片，应放在 src/static/images/。
2. 原始设计素材、大量 AI 生成图片，应放在 design-source/，默认不读取。
3. 少量最终参考截图可以放在 design-reference/screenshots/。
4. 只有用户明确指定某张截图时，才允许读取该截图。
5. 不要批量读取 design-reference/ 或 design-source/。

---

## 七、文档与数据规则

1. docs/ 中的文档默认不读取。
2. data/ 中的数据清单默认不读取。
3. 如果任务涉及产品规则、知识库、食材数据、云数据库初始化，必须只读取用户指定的单个文档或数据文件。
4. 不要为了回答代码问题而读取全部产品文档。
5. 不要把 Markdown 数据清单直接当成运行时代码文件修改。

---

## 八、修改前确认规则

每次修改前，先输出：

1. 本次准备读取的文件
2. 本次准备修改的文件
3. 是否需要额外读取 docs、data、design-source 或 design-reference

如果不需要额外读取，应明确说明：

“不需要读取 docs、data、design-source、design-reference。”

---

## 九、禁止行为

禁止以下行为：

1. 扫描整个项目。
2. 读取 node_modules。
3. 读取 dist 或 unpackage。
4. 默认读取 .pen 设计稿。
5. 默认读取所有 docs 文档。
6. 默认读取所有 data 数据。
7. 批量读取图片素材。
8. 修改 package-lock.json，除非明确涉及依赖安装。
9. 修改 project.private.config.json。
10. 把构建产物当成源码修改。
11. 把手机状态栏、电池、信号栏写入小程序页面。
12. 未经确认大范围重构目录或代码。

---

## 十、推荐任务提问格式

用户每次任务建议明确指定读取范围，例如：

```txt
只读取以下文件：

src/pages/index/index.vue
src/pages/index/index.scss

不要读取 docs、data、design-source、design-reference、dist、node_modules。

任务：优化首页 Hero 区样式，不要修改其他页面。
修改前先说明你准备读取和修改哪些文件。