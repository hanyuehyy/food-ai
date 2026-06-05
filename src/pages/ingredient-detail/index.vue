<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad, onShareAppMessage } from '@dcloudio/uni-app'
import { getIngredientDetail } from '@/api/cloud'
import type {
  IngredientDetail,
  IngredientDetailData,
  IngredientPairingDetail,
  PairingIngredient,
  KnowledgeSource
} from '@/types/cloud'
import { trackEvent } from '@/utils/analytics'

interface NutritionFeature {
  title: string
  desc: string
  tone: 'green' | 'cream' | 'sand' | 'blue'
}

interface ConditionTag {
  conditionId: string
  label: string
  icon: string
  tone: 'green' | 'gold'
}

interface PairingItem {
  title: string
  scene: string
  desc: string
  tone: 'orange' | 'green' | 'soft'
  ingredients: PairingVisualIngredient[]
}

interface PairingVisualIngredient {
  ingredientId: string
  name: string
  initial: string
  imageUrl: string
}

const topInset = ref(0)
const ingredientId = ref('egg')
const detailData = ref<IngredientDetailData | null>(null)
const loading = ref(true)
const errorMessage = ref('')
const showSources = ref(false)
const ingredientImageError = ref(false)
const ingredientImageSrc = ref('')
const pairingImageErrors = ref<Record<string, boolean>>({})

const tagMeta: Record<string, NutritionFeature> = {
  protein_rich: { title: '优质蛋白', desc: '日常补充参考', tone: 'green' },
  iron_source: { title: '含铁来源', desc: '饮食多样参考', tone: 'blue' },
  fiber_source: { title: '膳食纤维', desc: '增加蔬菜谷物', tone: 'green' },
  vitamin_c_source: { title: '维生素C', desc: '蔬果补充参考', tone: 'blue' },
  light_hydrating: { title: '清爽补水', desc: '少油搭配参考', tone: 'cream' },
  vegetable: { title: '常见蔬菜', desc: '正餐搭配友好', tone: 'sand' },
  fruit: { title: '日常水果', desc: '适合作为加餐', tone: 'cream' },
  staple_food: { title: '主食来源', desc: '注意整体份量', tone: 'sand' }
}

const sceneMeta: Record<string, NutritionFeature> = {
  breakfast_friendly: { title: '早餐常见', desc: '简单好搭配', tone: 'sand' },
  easy_to_cook: { title: '容易料理', desc: '日常操作简单', tone: 'cream' },
  soup_friendly: { title: '适合煮汤', desc: '清淡餐食参考', tone: 'green' },
  salad_friendly: { title: '轻食友好', desc: '清爽搭配参考', tone: 'blue' }
}

const conditionIconMap: Record<string, string> = {
  stay_up_late: 'time',
  tired: 'tips',
  qi_blood_weak_feeling: 'heart',
  sugar_control: 'chart',
  poor_sleep: 'time',
  low_appetite: 'smile',
  constipation: 'refresh',
  dry_mouth_heat: 'water'
}

const contentStyle = computed(() => ({
  paddingTop: `${topInset.value + 24}rpx`
}))

const ingredient = computed<IngredientDetail | null>(() => detailData.value?.ingredient || null)

const nutritionFeatures = computed<NutritionFeature[]>(() => {
  const item = ingredient.value
  if (!item) {
    return []
  }

  const features = [
    ...item.nutritionTags.map((tag) => tagMeta[tag]).filter(Boolean),
    ...item.sceneTags.map((tag) => sceneMeta[tag]).filter(Boolean)
  ]

  return features.slice(0, 4)
})

const suitableConditions = computed<ConditionTag[]>(() => (
  (detailData.value?.conditions || []).slice(0, 2).map((condition, index) => ({
    conditionId: condition.conditionId,
    label: condition.conditionName,
    icon: conditionIconMap[condition.conditionId] || 'check-circle',
    tone: index % 2 === 0 ? 'green' : 'gold'
  }))
))

const pairings = computed<PairingItem[]>(() => (
  (detailData.value?.pairings || []).slice(0, 3).map((pairing, index) => ({
    title: formatPairingTitle(pairing),
    scene: formatPairingScene(pairing),
    desc: pairing.pairingReason,
    tone: (['orange', 'green', 'soft'] as PairingItem['tone'][])[index % 3],
    ingredients: formatPairingIngredients(pairing)
  }))
))

const cautions = computed(() => {
  const item = ingredient.value
  if (!item) {
    return []
  }

  return item.cautions.map((caution) => caution.text)
})

const sources = computed<KnowledgeSource[]>(() => detailData.value?.sources || [])

function updateTopInset() {
  const info = uni.getSystemInfoSync()
  topInset.value = (info.statusBarHeight || 0) * 2
}

function formatPairingTitle(pairing: IngredientPairingDetail) {
  if (pairing.ingredientNames.length >= 2) {
    return pairing.ingredientNames.join(' + ')
  }

  return pairing.pairingName
}

function formatPairingScene(pairing: IngredientPairingDetail) {
  if (pairing.cookingMethod && pairing.cookingTime) {
    return `${pairing.cookingMethod} / ${pairing.cookingTime}`
  }

  return pairing.cookingMethod || pairing.cookingTime || '日常搭配'
}

function formatPairingIngredients(pairing: IngredientPairingDetail) {
  const pairingIngredients = pairing.ingredients?.length
    ? pairing.ingredients
    : pairing.ingredientNames.map<PairingIngredient>((name, index) => ({
      ingredientId: pairing.ingredientIds[index] || `${pairing.pairingId}-${index}`,
      name,
      imageUrl: ''
    }))

  return pairingIngredients.slice(0, 3).map((item, index) => ({
    ingredientId: item.ingredientId || `${pairing.pairingId}-${index}`,
    name: item.name,
    initial: item.name.slice(0, 1) || pairing.ingredientInitials[index] || '',
    imageUrl: item.imageUrl || ''
  }))
}

async function loadDetail() {
  loading.value = true
  errorMessage.value = ''

  try {
    const res = await getIngredientDetail(ingredientId.value)
    if (!res.success) {
      throw new Error(res.message)
    }

    detailData.value = res.data
    resolveIngredientImage(res.data.ingredient)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '食材详情加载失败'
  } finally {
    loading.value = false
  }
}

function goBack() {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack()
    return
  }

  uni.reLaunch({
    url: '/pages/index/index'
  })
}

function retryLoad() {
  loadDetail()
}

function getIngredientImageSrc() {
  if (ingredientImageError.value) {
    return ''
  }

  return ingredientImageSrc.value
}

function handleIngredientImageError() {
  ingredientImageError.value = true
}

function resolveIngredientImage(item: IngredientDetail) {
  ingredientImageError.value = false
  ingredientImageSrc.value = item.imageUrl || ''
}

function getPairingImageSrc(item: PairingVisualIngredient) {
  if (pairingImageErrors.value[item.ingredientId]) {
    return ''
  }

  return item.imageUrl
}

function handlePairingImageError(ingredientId: string) {
  pairingImageErrors.value = {
    ...pairingImageErrors.value,
    [ingredientId]: true
  }
}

function toggleSources() {
  if (!sources.value.length) {
    return
  }

  if (!showSources.value) {
    trackEvent('detail_source_expand', { ingredientId: ingredientId.value })
  }
  showSources.value = !showSources.value
}

onLoad((query) => {
  updateTopInset()
  ingredientId.value = String(query?.ingredientId || 'egg')
  trackEvent('page_view', { page: 'detail', ingredientId: ingredientId.value })
  loadDetail()
})

onShareAppMessage(() => {
  const name = detailData.value?.ingredient?.name || '食材'
  const sharePath = `/pages/ingredient-detail/index?ingredientId=${encodeURIComponent(ingredientId.value)}`
  trackEvent('detail_share', { ingredientId: ingredientId.value, ingredientName: name })
  return {
    title: `${name} - 食材小查`,
    path: sharePath
  }
})
</script>

<template>
  <view class="detail-page">
    <scroll-view class="app-content" scroll-y :style="contentStyle">
      <view class="top-nav">
        <button class="nav-button" type="button" aria-label="返回" @click="goBack">
          <wd-icon name="arrow-left" size="34rpx" />
        </button>
        <text class="nav-title">食材详情</text>
        <view class="nav-spacer"></view>
      </view>

      <view v-if="loading" class="state-panel">
        <wd-loading color="#57a867" />
        <text>正在加载...</text>
      </view>

      <view v-else-if="errorMessage" class="state-panel">
        <text>{{ errorMessage }}</text>
        <button class="retry-button" type="button" @click="retryLoad">重试</button>
      </view>

      <template v-else-if="ingredient">
        <view class="hero-card">
          <view class="hero-copy">
            <text class="ingredient-name">{{ ingredient.name }}</text>
            <text class="ingredient-desc">{{ ingredient.shortDescription }}</text>
          </view>

          <view class="egg-visual" aria-label="食材示意图">
            <image
              v-if="getIngredientImageSrc()"
              class="ingredient-image"
              mode="aspectFit"
              :src="getIngredientImageSrc()"
              @error="handleIngredientImageError"
            />
            <view v-else class="ingredient-image-placeholder">
              <text>{{ ingredient.name.slice(0, 1) }}</text>
            </view>
          </view>
        </view>

        <view class="section">
          <text class="section-title">主要营养特点</text>
          <view v-if="nutritionFeatures.length" class="nutrition-panel">
            <view
              v-for="(_, rowIndex) in Math.ceil(nutritionFeatures.length / 2)"
              :key="rowIndex"
              class="nutrition-row"
            >
              <view
                v-for="feature in nutritionFeatures.slice(rowIndex * 2, rowIndex * 2 + 2)"
                :key="feature.title"
                class="nutrition-card"
                :class="`nutrition-${feature.tone}`"
              >
                <text class="nutrition-title">{{ feature.title }}</text>
                <text class="nutrition-desc">{{ feature.desc }}</text>
              </view>
            </view>
          </view>
          <view v-else class="empty-panel">
            <text>暂无营养标签信息</text>
          </view>
        </view>

        <view class="section">
          <text class="section-title">适合这些状态</text>
          <view v-if="suitableConditions.length" class="condition-row">
            <view
              v-for="condition in suitableConditions"
              :key="condition.conditionId"
              class="condition-chip"
              :class="`condition-${condition.tone}`"
            >
              <wd-icon :name="condition.icon" size="34rpx" />
              <text>{{ condition.label }}</text>
            </view>
          </view>
          <view v-else class="empty-panel">
            <text>暂无适合状态信息</text>
          </view>
          <text class="condition-note">作为日常饮食搭配参考，按个人习惯适量选择。</text>
        </view>

        <view class="section pairing-section">
          <text class="section-title">常见食材搭配</text>
          <view v-if="pairings.length" class="pairing-list">
            <view
              v-for="item in pairings"
              :key="item.title"
              class="pairing-card"
              :class="`pairing-${item.tone}`"
            >
              <view class="pairing-visual" :class="{ stacked: item.ingredients.length > 2 }">
                <view
                  v-for="pairingIngredient in item.ingredients"
                  :key="`${item.title}-${pairingIngredient.ingredientId}`"
                  class="ingredient-dot"
                >
                  <image
                    v-if="getPairingImageSrc(pairingIngredient)"
                    class="pairing-ingredient-image"
                    mode="aspectFill"
                    :src="getPairingImageSrc(pairingIngredient)"
                    @error="handlePairingImageError(pairingIngredient.ingredientId)"
                  />
                  <text v-else>{{ pairingIngredient.initial }}</text>
                </view>
              </view>

              <view class="pairing-copy">
                <view class="pairing-heading">
                  <text class="pairing-title">{{ item.title }}</text>
                  <view class="scene-tag">
                    <text>{{ item.scene }}</text>
                  </view>
                </view>
                <text class="pairing-desc">{{ item.desc }}</text>
              </view>
            </view>
          </view>
          <view v-else class="empty-panel">
            <text>暂无搭配建议</text>
          </view>
        </view>

        <view class="section">
          <text class="section-title">食用提醒</text>
          <view v-if="cautions.length" class="caution-panel">
            <view v-for="text in cautions" :key="text" class="caution-row">
              <wd-icon name="warning" size="30rpx" />
              <text>{{ text }}</text>
            </view>
          </view>
          <view v-else class="empty-panel">
            <text>暂无特殊提醒</text>
          </view>
        </view>

        <button class="source-link" type="button" @click="toggleSources">
          <text>{{ ingredient.disclaimer || '内容仅供日常饮食参考，' }}</text>
          <text v-if="sources.length" class="source-action">查看依据</text>
          <wd-icon v-if="sources.length" name="chevron-right" size="28rpx" />
        </button>

        <view v-if="showSources && sources.length" class="source-panel">
          <text class="source-panel-title">内容依据</text>
          <view v-for="source in sources" :key="source.sourceId" class="source-item">
            <text class="source-name">{{ source.sourceName }}</text>
            <text class="source-meta">
              {{ source.organization }}{{ source.publishYear ? ` · ${source.publishYear}` : '' }}
            </text>
          </view>
        </view>
      </template>
    </scroll-view>
  </view>
</template>

<style scoped lang="scss">
@import '@/styles/variables.scss';

.detail-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: $color-bg;
  color: $color-text;
}

.app-content {
  width: 100%;
  max-width: 780rpx;
  flex: 1;
  min-height: 0;
  padding-right: 36rpx;
  padding-bottom: 36rpx;
  padding-left: 36rpx;
  box-sizing: border-box;
}

.top-nav {
  width: 100%;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.nav-button,
.nav-spacer {
  width: 72rpx;
  height: 72rpx;
}

.nav-button {
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2rpx solid #ece4d7;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.67);
  color: $color-text;
}

.nav-title {
  color: $color-text;
  font-size: 30rpx;
  font-weight: 700;
  line-height: 1.2;
}

.hero-card {
  width: 100%;
  height: 328rpx;
  margin-top: 24rpx;
  padding: 36rpx 32rpx;
  display: flex;
  align-items: center;
  gap: 20rpx;
  border-radius: 48rpx;
  background: linear-gradient(90deg, #ecf8e5 0%, #fff4d8 100%);
  box-shadow: 0 16rpx 36rpx rgba(73, 98, 63, 0.07);
}

.hero-copy {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.ingredient-name {
  color: $color-text;
  font-size: 60rpx;
  font-weight: 800;
  line-height: 1.1;
}

.ingredient-desc {
  color: $color-muted;
  font-size: 26rpx;
  font-weight: 500;
  line-height: 1.35;
}

.state-panel,
.empty-panel {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: $color-muted;
  font-size: 26rpx;
  font-weight: 500;
}

.state-panel {
  min-height: 520rpx;
  flex-direction: column;
  gap: 24rpx;
}

.retry-button {
  height: 72rpx;
  padding: 0 32rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999rpx;
  background: $color-primary;
  color: #ffffff;
  font-size: 26rpx;
  font-weight: 700;
}

.empty-panel {
  min-height: 104rpx;
  border-radius: 28rpx;
  background: rgba(255, 255, 255, 0.56);
}

.egg-visual {
  position: relative;
  width: 240rpx;
  height: 240rpx;
  flex: 0 0 240rpx;
  overflow: hidden;
  border: 2rpx solid #eee6d6;
  border-radius: 44rpx;
  background: #fffdf8;
}

.egg-shapes {
  position: absolute;
  inset: 0;
}

.ingredient-image {
  width: 100%;
  height: 100%;
}

.ingredient-image-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: $color-primary;
  font-size: 72rpx;
  font-weight: 800;
}

.egg {
  position: absolute;
  border: 2rpx solid $color-surface;
  border-radius: 50%;
}

.egg-left {
  left: 36rpx;
  top: 50rpx;
  width: 102rpx;
  height: 136rpx;
  transform: rotate(-8deg);
  background: #f6e6c7;
}

.egg-right {
  left: 98rpx;
  top: 40rpx;
  width: 110rpx;
  height: 148rpx;
  transform: rotate(10deg);
  background: #f2ddb7;
}

.egg-shadow {
  position: absolute;
  left: 78rpx;
  top: 158rpx;
  width: 96rpx;
  height: 18rpx;
  border-radius: 50%;
  background: rgba(233, 223, 207, 0.67);
}

.section {
  width: 100%;
  margin-top: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 18rpx;
}

.section-title {
  color: $color-text;
  font-size: 34rpx;
  font-weight: 800;
  line-height: 1.2;
}

.nutrition-panel {
  padding: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  border-radius: 36rpx;
  background: $color-surface;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.03);
}

.nutrition-row,
.condition-row {
  display: flex;
  gap: 16rpx;
}

.nutrition-card {
  min-width: 0;
  flex: 1;
  padding: 20rpx;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  border-radius: 28rpx;
}

.nutrition-title {
  font-size: 26rpx;
  font-weight: 800;
  line-height: 1.2;
}

.nutrition-desc {
  color: #7a7f70;
  font-size: 22rpx;
  font-weight: 500;
  line-height: 1.25;
}

.nutrition-green {
  background: #eaf6e4;

  .nutrition-title {
    color: #4f8d48;
  }
}

.nutrition-cream {
  background: #fff3d5;

  .nutrition-title {
    color: #8a6725;
  }
}

.nutrition-sand {
  background: #f7f0e3;

  .nutrition-title {
    color: #7b6849;
  }
}

.nutrition-blue {
  background: #eaf2ff;

  .nutrition-title {
    color: #526e9c;
  }
}

.condition-chip {
  height: 84rpx;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14rpx;
  border: 2rpx solid $color-surface;
  border-radius: 999rpx;
  font-size: 28rpx;
  font-weight: 700;
}

.condition-green {
  background: #eef5d8;
  color: #667b32;
}

.condition-gold {
  background: #fff2cf;
  color: #946b22;
}

.condition-note {
  color: $color-muted;
  font-size: 24rpx;
  font-weight: 500;
  line-height: 1.3;
}

.pairing-section {
  gap: 16rpx;
}

.pairing-list {
  display: flex;
  flex-direction: column;
  gap: 14rpx;
}

.pairing-card {
  width: 100%;
  padding: 20rpx;
  display: flex;
  align-items: center;
  gap: 20rpx;
  border-radius: 28rpx;
  box-shadow: 0 4rpx 16rpx rgba(185, 169, 140, 0.12);
}

.pairing-orange {
  background: #fff8ed;
}

.pairing-green {
  background: #f6faf0;
}

.pairing-soft {
  background: #f1faf3;
}

.pairing-visual {
  width: 136rpx;
  height: 96rpx;
  flex: 0 0 136rpx;
  padding: 8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  border: 2rpx solid #efe5d8;
  border-radius: 28rpx;
  background: $color-surface;
}

.pairing-visual.stacked {
  position: relative;
  display: block;
  height: 116rpx;

  .ingredient-dot:nth-child(1) {
    position: absolute;
    left: 44rpx;
    top: 8rpx;
  }

  .ingredient-dot:nth-child(2) {
    position: absolute;
    left: 16rpx;
    top: 60rpx;
  }

  .ingredient-dot:nth-child(3) {
    position: absolute;
    right: 16rpx;
    top: 60rpx;
  }
}

.ingredient-dot {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2rpx solid #f1e8da;
  border-radius: 18rpx;
  background: #fff8ed;
  color: #8a6725;
  font-size: 22rpx;
  font-weight: 800;
  overflow: hidden;
}

.pairing-ingredient-image {
  width: 100%;
  height: 100%;
}

.pairing-copy {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.pairing-heading {
  display: flex;
  align-items: center;
  gap: 14rpx;
}

.pairing-title {
  min-width: 0;
  flex: 1;
  color: $color-text;
  font-size: 30rpx;
  font-weight: 700;
  line-height: 1.18;
}

.scene-tag {
  flex: 0 0 auto;
  padding: 6rpx 14rpx;
  border-radius: 999rpx;
  background: #fff4d8;
  color: $color-muted;
  font-size: 22rpx;
  font-weight: 600;
  line-height: 1.1;
}

.pairing-desc {
  color: $color-muted;
  font-size: 22rpx;
  line-height: 1.32;
}

.caution-panel {
  padding: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 14rpx;
  border-radius: 36rpx;
  background: #fff4de;
}

.caution-row {
  display: flex;
  gap: 14rpx;
  color: #765b38;
  font-size: 24rpx;
  font-weight: 500;
  line-height: 1.3;

  :deep(.wd-icon) {
    flex: 0 0 auto;
    color: #b47a30;
  }
}

.source-link {
  height: 72rpx;
  margin-top: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  color: #9a9f91;
  font-size: 24rpx;
  font-weight: 500;
  line-height: 1.3;
  text-align: center;
}

.source-action,
.source-link :deep(.wd-icon) {
  color: $color-primary;
  font-weight: 700;
}

.source-panel {
  margin-top: 12rpx;
  padding: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  border-radius: 28rpx;
  background: $color-surface;
}

.source-panel-title {
  color: $color-text;
  font-size: 28rpx;
  font-weight: 800;
  line-height: 1.2;
}

.source-item {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.source-name {
  color: $color-text;
  font-size: 24rpx;
  font-weight: 700;
}

.source-meta {
  color: $color-muted;
  font-size: 22rpx;
  line-height: 1.3;
}
</style>
