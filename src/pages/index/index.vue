<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app'
import { computed, ref } from 'vue'
import { getHomeDataByProvince } from '@/api/cloud'
import AppTabBar from '@/components/layout/AppTabBar.vue'
import type { HomeData, MonthlySeasonalIngredient } from '@/types/cloud'
import { resolveCloudImageSources } from '@/utils/cloud-image'
import { trackEvent, setupAnalyticsLifecycle } from '@/utils/analytics'

interface SelectedLocation {
  name?: string
  address?: string
  latitude?: number
  longitude?: number
}

const loading = ref(true)
const errorMessage = ref('')
const homeData = ref<HomeData>({
  conditions: [],
  recommendIngredients: [],
  recommendPairings: [],
  monthlySeasonal: null,
  configs: {
    searchPlaceholder: '输入食材名称，如鸡蛋、苹果、山药',
    globalDisclaimer: ''
  }
})

const chipStyles = ['night', 'tired', 'constipation', 'damp', 'sugar', 'immune']
const chipIcons = ['time', 'tips', 'chart', 'service', 'star', 'warning']
const topInset = ref(0)
const monthlySeasonalPopupVisible = ref(false)
const locationLoading = ref(false)
const currentProvince = ref('')
const LOCATION_CACHE_KEY = 'userGeoLocation'

const visibleConditions = computed(() => homeData.value.conditions.slice(0, 4))
const monthlySeasonal = computed(() => homeData.value.monthlySeasonal)
const monthlySeasonalIngredients = computed(() => monthlySeasonal.value?.list || [])
const homeMonthlySeasonalIngredients = computed(() => monthlySeasonalIngredients.value.slice(0, 4))
const hasMonthlySeasonal = computed(() => homeMonthlySeasonalIngredients.value.length > 0)
const monthlySeasonalSubtitle = computed(() => {
  if (!monthlySeasonal.value) {
    return ''
  }

  return `${monthlySeasonal.value.regionName} · ${monthlySeasonal.value.month}月`
})
const contentStyle = computed(() => ({
  paddingTop: `${topInset.value}px`
}))
const locationButtonText = computed(() => {
  if (locationLoading.value) {
    return '定位中...'
  }

  return currentProvince.value ? '切换地区' : '定位当前位置'
})

const seasonImageErrors = ref<Record<string, boolean>>({})
const seasonImageSources = ref<Record<string, string>>({})

function updateTopInset() {
  const info = uni.getSystemInfoSync()
  topInset.value = (info.statusBarHeight || 0) + 12
}

async function loadHomeData() {
  loading.value = true
  errorMessage.value = ''
  const province = currentProvince.value || getCachedProvince()
  currentProvince.value = province

  try {
    const res = await getHomeDataByProvince(province)
    if (!res.success) {
      throw new Error(res.message)
    }
    homeData.value = res.data
    currentProvince.value = res.data.monthlySeasonal?.regionName || province
    await resolveSeasonImages(res.data.monthlySeasonal?.list || [])
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '首页数据加载失败'
  } finally {
    loading.value = false
  }
}

function goDetail(ingredientId: string, ingredientName?: string) {
  if (!ingredientId) {
    return
  }

  trackEvent('home_seasonal_click', { ingredientId, ingredientName: ingredientName || '' })
  uni.navigateTo({
    url: `/pages/ingredient-detail/index?ingredientId=${encodeURIComponent(ingredientId)}`
  })
}

function goSearch() {
  trackEvent('home_search_click')
  uni.navigateTo({
    url: '/pages/ingredient-library/index'
  })
}

function goConditionDetail(condition: { conditionId: string; conditionName: string }) {
  if (!condition.conditionId) {
    return
  }

  trackEvent('home_condition_click', { conditionId: condition.conditionId, conditionName: condition.conditionName })
  uni.navigateTo({
    url: `/pages/ingredient-library/index?conditionId=${encodeURIComponent(condition.conditionId)}&conditionName=${encodeURIComponent(condition.conditionName)}`
  })
}

function getCachedProvince() {
  const storageKeys = ['userProvince', 'province', 'locationProvince']

  for (const key of storageKeys) {
    const value = uni.getStorageSync(key)
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }

  return ''
}

function cacheProvince(province: string, location?: SelectedLocation) {
  uni.setStorageSync('userProvince', province)
  uni.setStorageSync('province', province)
  uni.setStorageSync('locationProvince', province)

  if (location) {
    uni.setStorageSync(LOCATION_CACHE_KEY, {
      province,
      name: location.name || '',
      address: location.address || '',
      latitude: location.latitude,
      longitude: location.longitude,
      updatedAt: Date.now()
    })
  }
}

function extractProvinceFromLocationText(text: string) {
  const value = text.trim()
  const provinceMatch = value.match(/([\u4e00-\u9fa5]{2,}(?:省|自治区|特别行政区))/)

  if (provinceMatch?.[1]) {
    return provinceMatch[1]
  }

  const cityMatch = value.match(/(北京市|天津市|上海市|重庆市)/)

  if (cityMatch?.[1]) {
    return cityMatch[1]
  }

  return ''
}

function chooseCurrentLocation(reloadOnFail = false) {
  if (locationLoading.value) {
    return
  }

  locationLoading.value = true
  uni.chooseLocation({
    success: (res) => {
      const selectedLocation = {
        name: res.name,
        address: res.address,
        latitude: res.latitude,
        longitude: res.longitude
      }
      const province = extractProvinceFromLocationText(`${res.address || ''}${res.name || ''}`)

      if (!province) {
        uni.showToast({
          title: '未识别到省份，请换个位置',
          icon: 'none'
        })
        if (reloadOnFail) {
          loadHomeData()
        }
        return
      }

      cacheProvince(province, selectedLocation)
      currentProvince.value = province
      trackEvent('home_location_set', { province })
      loadHomeData()
    },
    fail: () => {
      uni.showToast({
        title: '未获取位置，可手动选择附近地点',
        icon: 'none'
      })
      if (reloadOnFail) {
        loadHomeData()
      }
    },
    complete: () => {
      locationLoading.value = false
    }
  })
}

function handleLocationButtonClick() {
  chooseCurrentLocation()
}

function showMonthlySeasonalPopup() {
  monthlySeasonalPopupVisible.value = true
}

function closeMonthlySeasonalPopup() {
  monthlySeasonalPopupVisible.value = false
}

function getSeasonImage(ingredient: MonthlySeasonalIngredient) {
  if (seasonImageErrors.value[ingredient.ingredientId]) {
    return ''
  }

  return seasonImageSources.value[ingredient.ingredientId] || ''
}

function handleSeasonImageError(ingredientId: string) {
  seasonImageErrors.value = {
    ...seasonImageErrors.value,
    [ingredientId]: true
  }
}

async function resolveSeasonImages(list: MonthlySeasonalIngredient[]) {
  seasonImageErrors.value = {}

  try {
    const sources = await resolveCloudImageSources(list)
    seasonImageSources.value = sources
  } catch (error) {
    console.warn('[home] resolve season images failed', error)
    seasonImageSources.value = {}
  }
}

function retryLoad() {
  loadHomeData()
}

onLoad(() => {
  setupAnalyticsLifecycle()
  updateTopInset()
  currentProvince.value = getCachedProvince()
  trackEvent('page_view', { page: 'home', province: currentProvince.value || '' })
  loadHomeData()
})
</script>

<template>
  <view class="home-page">
    <scroll-view class="app-content" scroll-y :style="contentStyle">
      <view class="header">
        <view class="title-row">
          <text class="page-title">食材小查</text>
        </view>
        <view class="tagline">
          <wd-icon name="check-circle" size="30rpx" />
          <text>轻松查食材</text>
        </view>

        <view class="search-box" @click="goSearch">
          <wd-icon custom-class="search-icon" name="search" size="44rpx" />
          <text class="search-placeholder">{{ homeData.configs.searchPlaceholder }}</text>
        </view>
      </view>

      <view v-if="loading" class="skeleton-wrap">
        <wd-skeleton :row-col="[{ height: '80rpx', width: '40%' }]" animation="gradient" />
        <wd-skeleton :row-col="[{ height: '108rpx', borderRadius: '40rpx' }]" animation="gradient" />
        <wd-skeleton :row-col="[{ height: '48rpx', width: '50%', marginBottom: '24rpx' }, [1, 1], [1, 1]]" animation="gradient" />
        <wd-skeleton theme="image" :row-col="[{ height: '48rpx', width: '50%', marginBottom: '24rpx' }, [{ width: '100%', height: '220rpx' }], [{ width: '100%', height: '220rpx' }]]" animation="gradient" />
      </view>

      <view v-else-if="errorMessage" class="state-panel">
        <text>{{ errorMessage }}</text>
        <button class="retry-button" type="button" @click="retryLoad">重试</button>
      </view>

      <template v-else>
        <view class="state-section">
          <text class="section-title">按身体状态找食材</text>

          <view class="state-card">
            <view
              v-for="(condition, index) in visibleConditions"
              :key="condition.conditionId"
              class="chip"
              :class="`chip-${chipStyles[index % chipStyles.length]}`"
              @click="goConditionDetail(condition)"
            >
              <wd-icon
                :name="chipIcons[index % chipIcons.length]"
                size="30rpx"
              />
              <text>{{ condition.conditionName }}</text>
            </view>
          </view>
        </view>

        <view v-if="!currentProvince" class="season-section season-section--cta">
          <view class="season-title-row">
            <view class="season-title">
              <text class="season-heading">本月正当季</text>
              <view class="green-dot"></view>
            </view>
          </view>
          <button class="season-cta-button" type="button" @click="handleLocationButtonClick">
            <wd-icon name="location" size="32rpx" />
            <text>{{ locationLoading ? '定位中...' : '点击获取位置，获取本月当季食材信息' }}</text>
          </button>
        </view>

        <view v-else-if="hasMonthlySeasonal" class="season-section">
          <view class="season-title-row">
            <view class="season-title">
              <text class="season-heading">本月正当季</text>
              <view class="green-dot"></view>
            </view>

            <button class="more-button" type="button" @click="showMonthlySeasonalPopup">
              <text>查看更多</text>
              <wd-icon name="chevron-right" size="26rpx" />
            </button>
          </view>

          <view class="season-location-row">
            <view class="season-location-copy">
              <wd-icon name="location" size="28rpx" />
              <text class="season-desc">{{ monthlySeasonalSubtitle }}</text>
            </view>
            <button class="location-button" type="button" @click="handleLocationButtonClick">
              <text>{{ locationButtonText }}</text>
            </button>
          </view>

          <view class="food-row">
            <view
              v-for="ingredient in homeMonthlySeasonalIngredients"
              :key="ingredient.ingredientId"
              class="food-card"
              @click="goDetail(ingredient.ingredientId, ingredient.name)"
            >
              <image
                v-if="getSeasonImage(ingredient)"
                class="food-image"
                mode="aspectFill"
                :src="getSeasonImage(ingredient)"
                @error="handleSeasonImageError(ingredient.ingredientId)"
              />
              <view v-else class="food-image food-image-placeholder">
                <text>{{ ingredient.name.slice(0, 1) }}</text>
              </view>
              <view class="food-copy">
                <text class="food-name">{{ ingredient.name }}</text>
                <text class="food-tag">{{ ingredient.seasonTag }}</text>
                <text class="food-reason">{{ ingredient.displayReason }}</text>
              </view>
            </view>
          </view>
        </view>

        <view v-if="homeData.configs.globalDisclaimer" class="disclaimer">
          {{ homeData.configs.globalDisclaimer }}
        </view>
      </template>
    </scroll-view>

    <AppTabBar active="home" />

    <view
      v-if="monthlySeasonalPopupVisible && monthlySeasonal"
      class="season-popup-mask"
      @click="closeMonthlySeasonalPopup"
    >
      <view class="season-popup" @click.stop>
        <view class="popup-handle"></view>
        <view class="popup-title-row">
          <view class="popup-title-copy">
            <text class="popup-title">本月正当季</text>
            <text class="popup-subtitle">{{ monthlySeasonalSubtitle }}</text>
          </view>
          <button class="popup-close" type="button" @click="closeMonthlySeasonalPopup">
            <wd-icon name="close" size="32rpx" />
          </button>
        </view>

        <view class="popup-disclaimer">
          <wd-icon name="info-circle" size="24rpx" />
          <text>{{ monthlySeasonal.disclaimer }}</text>
        </view>

        <scroll-view class="popup-list" scroll-y>
          <view
            v-for="ingredient in monthlySeasonalIngredients"
            :key="ingredient.ingredientId"
            class="popup-item"
            @click="goDetail(ingredient.ingredientId, ingredient.name)"
          >
            <image
              v-if="getSeasonImage(ingredient)"
              class="popup-image"
              mode="aspectFill"
              :src="getSeasonImage(ingredient)"
              @error="handleSeasonImageError(ingredient.ingredientId)"
            />
            <view v-else class="popup-image popup-image-placeholder">
              <text>{{ ingredient.name.slice(0, 1) }}</text>
            </view>
            <view class="popup-item-copy">
              <text class="popup-item-name">{{ ingredient.name }}</text>
              <text class="popup-item-tag">{{ ingredient.seasonTag }}</text>
              <text class="popup-item-reason">{{ ingredient.displayReason }}</text>
            </view>
            <wd-icon name="chevron-right" size="30rpx" />
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
@import '@/styles/variables.scss';

.home-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: $color-bg;
  color: $color-text;
}

.app-content {
  width: 100%;
  max-width: 750rpx;
  flex: 1;
  min-height: 0;
  margin: 0 auto;
  padding-right: 36rpx;
  padding-bottom: 190rpx;
  padding-left: 36rpx;
  box-sizing: border-box;
}

.header,
.state-section,
.combo-section,
.season-section {
  width: 100%;
  display: flex;
  flex-direction: column;
}

.header {
  gap: 28rpx;
}

.title-row {
  display: flex;
  align-items: center;
}

.page-title {
  color: $color-text;
  font-size: 50rpx;
  font-weight: 700;
  line-height: 1.2;
}

.tagline {
  margin-top: -8rpx;
  padding: 14rpx 20rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
  border: 1rpx solid #ede5d9;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.6);
  color: $color-muted;
  font-size: 24rpx;
  font-weight: 500;
}

.tagline :deep(.wd-icon) {
  color: $color-primary;
}

.search-box {
  height: 108rpx;
  padding: 0 36rpx;
  display: flex;
  align-items: center;
  gap: 24rpx;
  border-radius: 40rpx;
  background: $color-surface;
  box-shadow: 0 16rpx 44rpx rgba(72, 96, 53, 0.09);
}

.search-box :deep(.search-icon) {
  color: $color-primary;
}

.search-placeholder {
  flex: 1;
  min-width: 0;
  color: #9aa28f;
  font-size: 28rpx;
  font-weight: 500;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.state-panel {
  min-height: 360rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24rpx;
  color: $color-muted;
  font-size: 26rpx;
}

.skeleton-wrap {
  display: flex;
  flex-direction: column;
  gap: 28rpx;
  margin-top: 28rpx;
}

.retry-button {
  height: 64rpx;
  padding: 0 28rpx;
  border-radius: 999rpx;
  background: $color-primary;
  color: #ffffff;
  font-size: 26rpx;
  font-weight: 700;
}

.state-section {
  gap: 22rpx;
  margin-top: 28rpx;
}

.section-title {
  color: $color-text;
  font-size: 36rpx;
  font-weight: 700;
  line-height: 1.25;
}

.state-card {
  width: 100%;
  padding: 24rpx;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16rpx;
  border-radius: 36rpx;
  background: rgba(255, 255, 255, 0.8);
  box-shadow: 0 10rpx 28rpx rgba(0, 0, 0, 0.03);
}

.chip {
  height: 76rpx;
  padding: 0 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  border-radius: 999rpx;
  font-size: 26rpx;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
}

.chip:active {
  opacity: 0.7;
  transform: scale(0.96);
}

.chip-night {
  background: #eef5d8;
  color: #667b32;
}

.chip-tired {
  background: #fff2cf;
  color: #946b22;
}

.chip-constipation {
  background: #fdebd9;
  color: #9a6736;
}

.chip-damp {
  background: #e6f5f1;
  color: #387d72;
}

.chip-sugar {
  background: #f3f4de;
  color: #727d3d;
}

.chip-immune {
  background: #eaf2ff;
  color: #4d6e9e;
}

.season-section {
  gap: 24rpx;
  margin-top: 28rpx;
  padding-bottom: 16rpx;
}

.season-section--cta {
  padding: 28rpx;
  border-radius: 28rpx;
  background: rgba(255, 255, 255, 0.8);
  box-shadow: 0 10rpx 28rpx rgba(0, 0, 0, 0.03);
}

.season-cta-button {
  height: 88rpx;
  padding: 0 28rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  border-radius: 20rpx;
  background: $color-primary;
  color: #ffffff;
  font-size: 28rpx;
  font-weight: 600;
}

.season-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.season-title {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.season-heading {
  color: $color-text;
  font-size: 38rpx;
  font-weight: 700;
  line-height: 1.25;
}

.green-dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 999rpx;
  background: #72d350;
}

.more-button {
  height: 56rpx;
  padding: 0 16rpx;
  display: flex;
  align-items: center;
  gap: 4rpx;
  border-radius: 999rpx;
  background: #e9f6e5;
  color: $color-primary;
  font-size: 24rpx;
  font-weight: 600;
}

.season-desc {
  color: $color-muted;
  font-size: 26rpx;
  line-height: 1.45;
}

.season-location-row {
  min-height: 64rpx;
  padding: 14rpx 18rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18rpx;
  border-radius: 22rpx;
  background: rgba(255, 255, 255, 0.74);
}

.season-location-copy {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10rpx;
  color: $color-primary;
}

.season-location-copy .season-desc {
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.location-button {
  height: 52rpx;
  padding: 0 18rpx;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999rpx;
  background: $color-primary;
  color: #ffffff;
  font-size: 23rpx;
  font-weight: 700;
}

.food-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16rpx;
}

.food-card {
  min-width: 0;
  padding: 18rpx;
  display: grid;
  grid-template-columns: 108rpx minmax(0, 1fr);
  align-items: center;
  gap: 16rpx;
  border-radius: 24rpx;
  background: $color-surface;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
}

.food-image {
  width: 108rpx;
  height: 108rpx;
  border-radius: 18rpx;
  background: #eef5d8;
}

.food-image-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  color: $color-primary;
  font-size: 42rpx;
  font-weight: 700;
}

.food-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.food-name {
  max-width: 100%;
  color: $color-text;
  font-size: 26rpx;
  font-weight: 700;
  line-height: 1.2;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.food-tag {
  align-self: flex-start;
  max-width: 100%;
  padding: 4rpx 10rpx;
  border-radius: 999rpx;
  background: #e9f6e5;
  color: $color-primary;
  font-size: 20rpx;
  font-weight: 700;
  line-height: 1.25;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.food-reason {
  color: $color-muted;
  font-size: 22rpx;
  line-height: 1.35;
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.disclaimer {
  padding: 12rpx 0 32rpx;
  color: #9aa28f;
  font-size: 22rpx;
  line-height: 1.5;
}

.season-popup-mask {
  position: fixed;
  inset: 0;
  z-index: 20;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgba(36, 49, 39, 0.36);
}

.season-popup {
  width: 100%;
  max-width: 750rpx;
  height: 70vh;
  min-height: 65vh;
  max-height: 75vh;
  padding: 16rpx 32rpx 140rpx;
  display: flex;
  flex-direction: column;
  border-radius: 36rpx 36rpx 0 0;
  background: $color-bg;
  box-sizing: border-box;
}

.popup-handle {
  width: 72rpx;
  height: 8rpx;
  margin: 0 auto 24rpx;
  border-radius: 999rpx;
  background: #ded6ca;
}

.popup-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24rpx;
}

.popup-title-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.popup-title {
  color: $color-text;
  font-size: 38rpx;
  font-weight: 700;
  line-height: 1.25;
}

.popup-subtitle {
  color: $color-muted;
  font-size: 24rpx;
  line-height: 1.35;
}

.popup-close {
  width: 64rpx;
  height: 64rpx;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999rpx;
  background: $color-surface;
  color: $color-muted;
}

.popup-list {
  flex: 1;
  min-height: 0;
  margin-top: 20rpx;
  padding-bottom: 24rpx;
}

.popup-item {
  min-height: 132rpx;
  margin-bottom: 16rpx;
  padding: 18rpx;
  display: grid;
  grid-template-columns: 96rpx minmax(0, 1fr) 32rpx;
  align-items: center;
  gap: 18rpx;
  border-radius: 24rpx;
  background: $color-surface;
}

.popup-image {
  width: 96rpx;
  height: 96rpx;
  border-radius: 18rpx;
  background: #eef5d8;
}

.popup-image-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  color: $color-primary;
  font-size: 38rpx;
  font-weight: 700;
}

.popup-item-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.popup-item-name {
  color: $color-text;
  font-size: 30rpx;
  font-weight: 700;
  line-height: 1.25;
}

.popup-item-tag {
  align-self: flex-start;
  max-width: 100%;
  padding: 4rpx 12rpx;
  border-radius: 999rpx;
  background: #e9f6e5;
  color: $color-primary;
  font-size: 21rpx;
  font-weight: 700;
  line-height: 1.25;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.popup-item-reason {
  color: $color-muted;
  font-size: 24rpx;
  line-height: 1.35;
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.popup-disclaimer {
  margin-top: 20rpx;
  padding: 14rpx 18rpx;
  display: flex;
  align-items: center;
  gap: 8rpx;
  border-radius: 16rpx;
  background: rgba(87, 168, 103, 0.08);
  color: #8a9a7e;
  font-size: 22rpx;
  line-height: 1.5;
}

.popup-disclaimer :deep(.wd-icon) {
  color: $color-primary;
  flex-shrink: 0;
}
</style>
