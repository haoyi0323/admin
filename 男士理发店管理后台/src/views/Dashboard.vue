<template>
  <div class="page">
    <div class="page-title">
      仪表盘
      <div class="shop-switch">
        <span class="label">店铺状态：</span>
        <el-switch v-model="shopOpen" active-text="营业中" inactive-text="已关店" @change="onToggleShop" />
      </div>
    </div>
    <div class="cards">
      <el-card class="card">
        <div class="card-title">今日预约</div>
        <div class="card-value">{{ stats.todayTotal }}</div>
      </el-card>
      <el-card class="card">
        <div class="card-title">待处理</div>
        <div class="card-value">{{ stats.pending }}</div>
      </el-card>
      <el-card class="card">
        <div class="card-title">已完成</div>
        <div class="card-value">{{ stats.completed }}</div>
      </el-card>
    </div>
    <el-card>
      <template #header>
        <div class="card-title">最近预约记录</div>
      </template>
      <el-table :data="records" size="small" v-loading="loadingRecords">
        <el-table-column prop="date" label="日期" width="120"/>
        <el-table-column prop="time" label="时间" width="100"/>
        <el-table-column prop="serviceName" label="服务"/>
        <el-table-column prop="status" label="状态" width="100"/>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { fetchStats, fetchRecentBookings, fetchShopOpen, setShopOpen } from '../webapi/unicloud'

const stats = reactive({ todayTotal: 0, pending: 0, completed: 0 })
const records = ref<any[]>([])
const loadingRecords = ref(false)
const shopOpen = ref<boolean>(true)

async function loadAll() {
  try {
    const s = await fetchStats()
    Object.assign(stats, s)
  } catch (error:any) {
    console.error('加载统计数据失败:', error)
    Object.assign(stats, { todayTotal: 0, pending: 0, completed: 0 })
    ElMessage.error(error?.message || '加载统计数据失败')
  }

  loadingRecords.value = true
  try {
    records.value = await fetchRecentBookings()
  } catch (error:any) {
    console.error('加载最近预约失败:', error)
    records.value = []
    ElMessage.error(error?.message || '加载最近预约失败')
  } finally {
    loadingRecords.value = false
  }
}

onMounted(async () => {
  await loadAll()
  try {
    shopOpen.value = await fetchShopOpen()
  } catch (e) {
    console.warn('获取店铺开关状态失败:', e)
    shopOpen.value = true
  }
})

async function onToggleShop(val: boolean) {
  try {
    const result = await setShopOpen(val)
    shopOpen.value = result
    ElMessage.success(result ? '已切换为营业' : '已切换为关店')
  } catch (e:any) {
    ElMessage.error(e?.message || '设置失败')
    // 回退到原状态
    shopOpen.value = !val
  }
}
</script>

<style scoped>
.page { padding:16px; }
.page-title { font-size:18px; font-weight:600; margin-bottom: 12px; display:flex; align-items:center; justify-content:space-between; }
.shop-switch { display:flex; align-items:center; gap:8px; font-weight:400; font-size:14px; }
.cards { display:grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px; }
.card { text-align:center; }
.card-title { color:#666; margin-bottom:6px; }
.card-value { font-size:28px; font-weight:700; }
</style>