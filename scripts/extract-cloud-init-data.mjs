import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const outputDir = resolve(root, 'src/data/cloud-init')

const files = [
  resolve(root, 'data/食补小查_MVP首批云数据库数据清单_第1批基础数据.md'),
  resolve(root, 'data/食补小查_MVP首批云数据库数据清单_第2批食材基础数据.md'),
  resolve(root, 'data/食补小查_MVP首批云数据库数据清单_第3批食材搭配数据.md'),
  resolve(root, 'data/食补小查_MVP首批云数据库数据清单_第4批状态食材推荐规则数据.md')
]

const collections = {
  knowledge_sources: [],
  tag_dicts: [],
  system_configs: [],
  body_conditions: [],
  ingredients: [],
  ingredient_pairings: [],
  condition_ingredient_rules: []
}

function extractJsonBlocks(markdown) {
  return Array.from(markdown.matchAll(/```json\s*([\s\S]*?)```/g))
    .map((match) => match[1].trim())
    .filter(Boolean)
    .map((raw) => JSON.parse(raw))
}

function appendByShape(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return
  }

  const sample = items[0]

  if ('sourceId' in sample) collections.knowledge_sources.push(...items)
  else if ('tagId' in sample) collections.tag_dicts.push(...items)
  else if ('configKey' in sample) collections.system_configs.push(...items)
  else if ('conditionId' in sample && 'conditionName' in sample) collections.body_conditions.push(...items)
  else if ('ingredientId' in sample && 'name' in sample) collections.ingredients.push(...items)
  else if ('pairingId' in sample) collections.ingredient_pairings.push(...items)
  else if ('ruleId' in sample) collections.condition_ingredient_rules.push(...items)
}

mkdirSync(outputDir, { recursive: true })

for (const file of files) {
  const markdown = readFileSync(file, 'utf8')
  for (const block of extractJsonBlocks(markdown)) {
    appendByShape(block)
  }
}

for (const [name, data] of Object.entries(collections)) {
  const jsonLines = data.map((item) => JSON.stringify(item)).join('\n')
  writeFileSync(resolve(outputDir, `${name}.json`), `${jsonLines}\n`)
}

writeFileSync(
  resolve(outputDir, 'README.md'),
  [
    '# 云数据库初始化数据',
    '',
    '本目录由 `npm run extract:cloud-data` 从 `data/` 下的四批 Markdown 数据清单提取生成。',
    '',
    '注意：这些文件内容使用 JSON Lines 格式，文件后缀仍保持 `.json`。每一行是一条可独立解析的 JSON 对象，不是 JSON 数组。',
    '',
    '建议导入顺序：',
    '',
    '1. `knowledge_sources.json`',
    '2. `tag_dicts.json`',
    '3. `system_configs.json`',
    '4. `body_conditions.json`',
    '5. `ingredients.json`',
    '6. `ingredient_pairings.json`',
    '7. `condition_ingredient_rules.json`',
    ''
  ].join('\n')
)

console.log(
  Object.entries(collections)
    .map(([name, data]) => `${name}: ${data.length}`)
    .join('\n')
)
