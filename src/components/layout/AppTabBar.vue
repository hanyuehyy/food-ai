<script setup lang="ts">
type TabKey = 'home' | 'library'

const props = defineProps<{
  active: TabKey
}>()

const tabs: Array<{
  key: TabKey
  label: string
  icon: string
  url: string
}> = [
  {
    key: 'home',
    label: '首页',
    icon: 'home',
    url: '/pages/index/index'
  },
  {
    key: 'library',
    label: '食材库',
    icon: 'bags',
    url: '/pages/ingredient-library/index'
  }
]

function handleTabClick(key: TabKey, url: string) {
  if (key === props.active) {
    return
  }

  uni.reLaunch({ url })
}
</script>

<template>
  <view class="app-tabbar">
    <view class="tabbar-inner">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="tab-item"
        :class="{ active: tab.key === active }"
        type="button"
        @click="handleTabClick(tab.key, tab.url)"
      >
        <wd-icon :name="tab.icon" size="38rpx" />
        <text>{{ tab.label }}</text>
      </button>
    </view>
  </view>
</template>

<style scoped lang="scss">
.app-tabbar {
  width: 100%;
  padding: 20rpx 42rpx calc(24rpx + env(safe-area-inset-bottom));
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 50;
  box-sizing: border-box;
  background: #ffffff;
  border-top: 1rpx solid #ece6da;
  box-shadow: 0 -10rpx 30rpx rgba(0, 0, 0, 0.06);
}

.tabbar-inner {
  width: 100%;
  max-width: 666rpx;
  height: 100rpx;
  margin: 0 auto;
  padding: 8rpx;
  display: flex;
  gap: 16rpx;
  border-radius: 64rpx;
  background: #ffffff;
  box-sizing: border-box;
}

.tab-item {
  flex: 1;
  min-width: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
  border-radius: 52rpx;
  background: #ffffff;
  color: #75806f;
  font-size: 22rpx;
  font-weight: 600;
  line-height: 1.2;
  transition: background-color 0.18s ease, color 0.18s ease;
}

.tab-item.active {
  background: #57a867;
  color: #ffffff;
  font-weight: 700;
}

.tab-item :deep(.wd-icon) {
  color: currentColor;
}
</style>
