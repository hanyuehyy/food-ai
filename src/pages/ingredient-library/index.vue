<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app'
import { ref } from 'vue'
import { getIngredientList } from '@/api/cloud'
import AppTabBar from '@/components/layout/AppTabBar.vue'
import type { IngredientCard } from '@/types/cloud'
import { resolveCloudImageSources } from '@/utils/cloud-image'

const ingredients = ref<IngredientCard[]>([])
const loading = ref(true)
const errorMessage = ref('')
const imageErrors = ref<Record<string, boolean>>({})
const imageSources = ref<Record<string, string>>({})

async function loadIngredients() {
  loading.value = true
  errorMessage.value = ''

  try {
    const res = await getIngredientList({ page: 1, pageSize: 50 })
    if (!res.success) {
      throw new Error(res.message)
    }
    ingredients.value = res.data.list
    await resolveIngredientImages(res.data.list)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '食材列表加载失败'
  } finally {
    loading.value = false
  }
}

function goDetail(ingredientId: string) {
  if (!ingredientId) {
    return
  }

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

async function resolveIngredientImages(list: IngredientCard[]) {
  try {
    imageSources.value = await resolveCloudImageSources(list)
  } catch (error) {
    console.warn('[ingredient-library] resolve images failed', error)
    imageSources.value = {}
  }
}

onLoad(loadIngredients)
</script>

<template>
  <view class="page library-page">
    <view class="section-title">食材库</view>

    <view v-if="loading" class="state-text">正在加载...</view>
    <view v-else-if="errorMessage" class="state-text">{{ errorMessage }}</view>

    <view v-else class="grid">
      <view
        v-for="ingredient in ingredients"
        :key="ingredient.ingredientId"
        class="card"
        @click="goDetail(ingredient.ingredientId)"
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
  border: 1rpx solid $color-line;
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
</style>
