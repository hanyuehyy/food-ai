<script setup lang="ts">
import { onLoad, onReachBottom } from '@dcloudio/uni-app'
import { ref } from 'vue'
import { getIngredientList, getIngredientCategories } from '@/api/cloud'
import AppTabBar from '@/components/layout/AppTabBar.vue'
import type { IngredientCard, IngredientListQuery } from '@/types/cloud'
import { resolveCloudImageSources } from '@/utils/cloud-image'
import { trackEvent } from '@/utils/analytics'

const ingredients = ref<IngredientCard[]>([])
const loading = ref(true)
const errorMessage = ref('')
const imageErrors = ref<Record<string, boolean>>({})
const imageSources = ref<Record<string, string>>({})

const keyword = ref('')
const category = ref('')
const categories = ref<string[]>([])
const currentPage = ref(1)
const hasMore = ref(false)
const loadingMore = ref(false)
const conditionId = ref('')
const conditionName = ref('')
const showScrollHint = ref(true)
const lastAction = ref<'search' | 'category' | 'condition' | 'init'>('init')

function onCategoryScroll(e: any) {
  const { scrollLeft, scrollWidth } = e.detail
  const query = uni.createSelectorQuery()
  query.select('.category-tabs').boundingClientRect((rect) => {
    if (!rect) return
    const containerWidth = (rect as any).width
    showScrollHint.value = scrollWidth > containerWidth + 10 && scrollLeft + containerWidth < scrollWidth - 5
  }).exec()
}

function checkScrollHint() {
  setTimeout(() => {
    const query = uni.createSelectorQuery()
    query.select('.category-tabs').boundingClientRect((rect) => {
      if (!rect) return
      const containerWidth = (rect as any).width
      const scrollWidth = (rect as any).scrollWidth || containerWidth
      showScrollHint.value = scrollWidth > containerWidth + 10
    }).exec()
  }, 100)
}

async function loadCategories() {
  try {
    const res = await getIngredientCategories()
    if (res.success) {
      categories.value = res.data.categories
      if (!category.value && !conditionId.value && res.data.categories.length) {
        category.value = res.data.categories[0]
      }
      checkScrollHint()
    }
  } catch (error) {
    console.warn('[ingredient-library] load categories failed', error)
  }
}

async function loadIngredients() {
  loading.value = true
  errorMessage.value = ''
  currentPage.value = 1

  try {
    const hasKeyword = !!keyword.value.trim()
    const query: IngredientListQuery = { page: 1, pageSize: 50 }
    if (hasKeyword) {
      query.keyword = keyword.value.trim()
    } else if (category.value) {
      query.category = category.value
    }
    if (conditionId.value) {
      query.conditionId = conditionId.value
    }

    const res = await getIngredientList(query)
    if (!res.success) {
      throw new Error(res.message)
    }
    ingredients.value = res.data.list
    hasMore.value = res.data.pagination.hasMore
    await resolveIngredientImages(res.data.list)

    if (lastAction.value === 'search') {
      const kw = keyword.value.trim()
      if (res.data.list.length === 0) {
        trackEvent('library_search_empty', { keyword: kw })
      } else {
        trackEvent('library_search', { keyword: kw, resultCount: res.data.list.length })
      }
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '食材列表加载失败'
  } finally {
    loading.value = false
  }
}

async function loadMore() {
  if (!hasMore.value || loadingMore.value) return

  loadingMore.value = true
  const nextPage = currentPage.value + 1

  try {
    const hasKeyword = !!keyword.value.trim()
    const query: IngredientListQuery = { page: nextPage, pageSize: 50 }
    if (hasKeyword) {
      query.keyword = keyword.value.trim()
    } else if (category.value) {
      query.category = category.value
    }
    if (conditionId.value) {
      query.conditionId = conditionId.value
    }

    const res = await getIngredientList(query)
    if (!res.success) {
      throw new Error(res.message)
    }
    ingredients.value = [...ingredients.value, ...res.data.list]
    currentPage.value = nextPage
    hasMore.value = res.data.pagination.hasMore
    await resolveIngredientImages(res.data.list, true)
  } catch (error) {
    console.warn('[ingredient-library] load more failed', error)
  } finally {
    loadingMore.value = false
  }
}

function handleSearch() {
  lastAction.value = 'search'
  loadIngredients()
}

function handleClear() {
  keyword.value = ''
  loadIngredients()
}

function selectCategory(cat: string) {
  if (category.value === cat) {
    return
  }
  category.value = cat
  lastAction.value = 'category'
  trackEvent('library_category_switch', { category: cat })
  loadIngredients()
}

function clearCondition() {
  trackEvent('library_condition_clear', { conditionId: conditionId.value })
  conditionId.value = ''
  conditionName.value = ''
  loadIngredients()
}

function goDetail(ingredientId: string, ingredientName?: string) {
  if (!ingredientId) {
    return
  }

  trackEvent('library_card_click', { ingredientId, ingredientName: ingredientName || '' })
  uni.navigateTo({
    url: `/pages/ingredient-detail/index?ingredientId=${encodeURIComponent(ingredientId)}`
  })
}

function getIngredientImageSrc(ingredient: IngredientCard) {
  if (imageErrors.value[ingredient.ingredientId]) {
    return ''
  }

  return imageSources.value[ingredient.ingredientId] || ''
}

function handleImageError(ingredientId: string) {
  imageErrors.value = {
    ...imageErrors.value,
    [ingredientId]: true
  }
}

async function resolveIngredientImages(list: IngredientCard[], merge = false) {
  try {
    const resolved = await resolveCloudImageSources(list)
    imageSources.value = merge ? { ...imageSources.value, ...resolved } : resolved
  } catch (error) {
    console.warn('[ingredient-library] resolve images failed', error)
    if (!merge) {
      imageSources.value = {}
    }
  }
}

onLoad(async (options: Record<string, string> | undefined) => {
  if (options && options.conditionId) {
    conditionId.value = decodeURIComponent(options.conditionId)
  }
  if (options && options.conditionName) {
    conditionName.value = decodeURIComponent(options.conditionName)
  }

  trackEvent('page_view', { page: 'library', conditionId: conditionId.value, conditionName: conditionName.value })
  await loadCategories()
  loadIngredients()
})

onReachBottom(() => {
  loadMore()
})
</script>

<template>
  <view class="page library-page">
    <view class="section-title">食材库</view>

    <wd-search
      v-model="keyword"
      placeholder="搜索食材名称"
      hide-cancel
      custom-class="search-bar"
      @change="handleSearch"
      @clear="handleClear"
    />

    <view v-if="categories.length" class="category-wrapper">
      <scroll-view class="category-tabs" scroll-x enable-flex :show-scrollbar="false" @scroll="onCategoryScroll">
        <view
          v-for="cat in categories"
          :key="cat"
          class="tab"
          :class="{ active: category === cat }"
          @click="selectCategory(cat)"
        >{{ cat }}</view>
      </scroll-view>
      <view v-if="showScrollHint" class="category-fade" />
      <view v-if="showScrollHint" class="category-arrow">
        <wd-icon name="arrow-right" size="24rpx" />
      </view>
    </view>

    <view v-if="conditionId" class="condition-banner">
      <text class="condition-label">按身体状态筛选：</text>
      <text class="condition-value">{{ conditionName || conditionId }}</text>
      <view class="condition-clear" @click="clearCondition">
        <wd-icon name="close" size="28rpx" />
      </view>
    </view>

    <view v-if="loading" class="skeleton-grid">
      <view v-for="n in 6" :key="n" class="skeleton-card">
        <wd-skeleton theme="image" :row-col="[{ width: '100%', height: '220rpx', borderRadius: '18rpx' }]" animation="gradient" />
        <wd-skeleton :row-col="[{ width: '60%', height: '32rpx' }, { width: '40%', height: '24rpx' }]" animation="gradient" />
      </view>
    </view>
    <view v-else-if="errorMessage" class="state-text">{{ errorMessage }}</view>

    <view v-else-if="ingredients.length">
      <view class="grid">
        <view
          v-for="ingredient in ingredients"
          :key="ingredient.ingredientId"
          class="card"
          @click="goDetail(ingredient.ingredientId, ingredient.name)"
        >
          <image
            v-if="getIngredientImageSrc(ingredient)"
            class="image"
            mode="aspectFill"
            :src="getIngredientImageSrc(ingredient)"
            @error="handleImageError(ingredient.ingredientId)"
          />
          <view v-else class="image image-placeholder">
            <text>{{ ingredient.name.slice(0, 1) }}</text>
          </view>
          <text class="name">{{ ingredient.name }}</text>
          <text class="category">{{ ingredient.category }}</text>
        </view>
      </view>
      <view v-if="loadingMore" class="load-more">
        <text>加载中...</text>
      </view>
    </view>

    <view v-else class="state-text">未找到相关食材</view>

    <AppTabBar active="library" />
  </view>
</template>

<style scoped lang="scss">
@import '@/styles/variables.scss';

.library-page {
  display: flex;
  flex-direction: column;
  gap: 28rpx;
  padding-bottom: 190rpx;
}

.condition-banner {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 18rpx 24rpx;
  background: #e9f6e5;
  border-radius: $radius-card;
}

.condition-label {
  font-size: 24rpx;
  color: $color-muted;
}

.condition-value {
  flex: 1;
  font-size: 26rpx;
  font-weight: 600;
  color: #57a867;
}

.condition-clear {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: $color-muted;
}

:deep(.search-bar) {
  padding: 20rpx 24rpx;
  background: $color-surface;
  border-radius: $radius-card;
  box-shadow: $shadow-card;
}

:deep(.wd-search__block) {
  background: #f5f2ed;
  border-radius: 36rpx;
  height: 76rpx;
}

:deep(.wd-search__cancel) {
  display: none;
}

.category-wrapper {
  position: relative;
  margin: 0 -32rpx;
  padding: 0 32rpx;
}

.category-tabs {
  white-space: nowrap;
  padding-right: 80rpx;
}

.tab {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 60rpx;
  padding: 0 28rpx;
  margin-right: 16rpx;
  font-size: 26rpx;
  color: $color-muted;
  border: 1rpx solid $color-line;
  border-radius: 30rpx;
  background: $color-surface;
  flex-shrink: 0;

  &.active {
    color: #ffffff;
    background: $color-primary;
    border-color: $color-primary;
  }
}

.category-fade {
  position: absolute;
  top: 0;
  right: 72rpx;
  width: 80rpx;
  height: 100%;
  background: linear-gradient(to right, transparent, $color-bg);
  pointer-events: none;
}

.category-arrow {
  position: absolute;
  top: 50%;
  right: 24rpx;
  transform: translateY(-50%);
  width: 44rpx;
  height: 44rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: $color-surface;
  border-radius: 50%;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.08);
  color: $color-muted;
}

.grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20rpx;
}

.card {
  padding: 18rpx;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  border-radius: $radius-card;
  background: $color-surface;
  box-shadow: $shadow-card;
}

.image {
  width: 100%;
  height: 220rpx;
  border-radius: 18rpx;
  background: #eef5d8;
}

.image-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #57a867;
  font-size: 56rpx;
  font-weight: 700;
}

.name {
  color: $color-text;
  font-size: 30rpx;
  font-weight: 700;
}

.category,
.state-text {
  color: $color-muted;
  font-size: 24rpx;
}

.state-text {
  padding: 40rpx 0;
  text-align: center;
}

.load-more {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32rpx 0;
  color: $color-muted;
  font-size: 26rpx;
}

.skeleton-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20rpx;
}

.skeleton-card {
  padding: 18rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  border: 1rpx solid $color-line;
  border-radius: $radius-card;
  background: $color-surface;
}
</style>
