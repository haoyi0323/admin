<template>
  <div class="p-6">
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900">系统设置</h1>
      <p class="text-gray-600 mt-2">管理系统配置和安全设置</p>
    </div>

    <!-- 管理员Token管理 -->
    <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h2 class="text-lg font-semibold text-gray-900">管理员Token管理</h2>
          <p class="text-sm text-gray-600 mt-1">管理可以访问后台的Token列表</p>
        </div>
        <button
          @click="addNewToken"
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          添加Token
        </button>
      </div>

      <!-- Token列表 -->
      <div class="space-y-3">
        <div
          v-for="(token, index) in tokens"
          :key="index"
          class="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
        >
          <div class="flex-1">
            <input
              v-model="tokens[index]"
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="请输入Token（至少6位字符）"
              :class="{
                'border-red-300 focus:ring-red-500': !isValidToken(token)
              }"
            />
            <p v-if="!isValidToken(token)" class="text-red-500 text-xs mt-1">
              Token必须是至少6位的字符串
            </p>
          </div>
          <button
            @click="removeToken(index)"
            class="ml-3 px-3 py-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
            :disabled="tokens.length <= 1"
            :class="{
              'opacity-50 cursor-not-allowed': tokens.length <= 1
            }"
          >
            删除
          </button>
        </div>
      </div>

      <!-- 保存按钮 -->
      <div class="mt-6 flex justify-end space-x-3">
        <button
          @click="loadTokens"
          class="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          :disabled="loading"
        >
          重置
        </button>
        <button
          @click="saveTokens"
          class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="loading || !isFormValid"
        >
          {{ loading ? '保存中...' : '保存设置' }}
        </button>
      </div>
    </div>

    <!-- 当前登录Token信息 -->
    <div class="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div class="flex items-start">
        <div class="flex-shrink-0">
          <svg class="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
          </svg>
        </div>
        <div class="ml-3">
          <h3 class="text-sm font-medium text-blue-800">当前登录Token</h3>
          <p class="text-sm text-blue-700 mt-1">{{ currentToken || '未获取到Token' }}</p>
          <p class="text-xs text-blue-600 mt-1">请确保当前Token在上述列表中，否则保存后将无法继续访问系统</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getAdminTokens, setAdminTokens, getAdminToken } from '../webapi/unicloud'
import { toast } from 'sonner'

const tokens = ref<string[]>([])
const loading = ref(false)
const currentToken = ref('')

// 验证Token格式
const isValidToken = (token: string): boolean => {
  return token && typeof token === 'string' && token.length >= 6
}

// 验证表单是否有效
const isFormValid = computed(() => {
  return tokens.value.length > 0 && tokens.value.every(token => isValidToken(token))
})

// 加载Token列表
const loadTokens = async () => {
  try {
    loading.value = true
    const tokenList = await getAdminTokens()
    tokens.value = [...tokenList]
  } catch (error) {
    console.error('加载Token列表失败:', error)
    toast.error('加载Token列表失败: ' + (error as Error).message)
  } finally {
    loading.value = false
  }
}

// 保存Token列表
const saveTokens = async () => {
  if (!isFormValid.value) {
    toast.error('请检查Token格式，每个Token至少需要6位字符')
    return
  }
  
  // 检查当前Token是否在新列表中
  if (currentToken.value && !tokens.value.includes(currentToken.value)) {
    const confirmed = confirm(
      '警告：当前登录的Token不在新的Token列表中，保存后您将无法继续访问系统。\n\n确定要继续吗？'
    )
    if (!confirmed) {
      return
    }
  }
  
  try {
    loading.value = true
    await setAdminTokens(tokens.value)
    toast.success('Token设置保存成功')
  } catch (error) {
    console.error('保存Token设置失败:', error)
    toast.error('保存失败: ' + (error as Error).message)
  } finally {
    loading.value = false
  }
}

// 添加新Token
const addNewToken = () => {
  tokens.value.push('')
}

// 删除Token
const removeToken = (index: number) => {
  if (tokens.value.length > 1) {
    tokens.value.splice(index, 1)
  }
}

// 获取当前Token
const getCurrentToken = () => {
  currentToken.value = getAdminToken() || ''
}

// 页面加载时初始化
onMounted(() => {
  getCurrentToken()
  loadTokens()
})
</script>