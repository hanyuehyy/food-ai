import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getIngredientList } from '@/api/cloud'
import type { IngredientCard } from '@/types/cloud'

export const useIngredientStore = defineStore('ingredient', () => {
  const list = ref<IngredientCard[]>([])
  const loading = ref(false)

  async function fetchIngredients() {
    loading.value = true

    try {
      const res = await getIngredientList({ page: 1, pageSize: 50 })
      list.value = res.success ? res.data.list : []
    } finally {
      loading.value = false
    }
  }

  return {
    list,
    loading,
    fetchIngredients
  }
})
