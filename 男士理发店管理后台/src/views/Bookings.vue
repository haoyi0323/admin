<template>
  <div class="bookings-page">
    <!-- 顶部统一由 Layout 提供，这里去掉 PageHeader，避免重复与错位 -->

    <!-- 筛选栏 -->
    <div class="filters">
      <el-date-picker v-model="filters.date" type="date" placeholder="选择日期" clearable />
      <el-select v-model="filters.status" placeholder="选择状态" clearable style="width: 140px">
        <el-option label="全部状态" :value="''" />
        <el-option label="待处理" value="pending" />
        <el-option label="已确认" value="confirmed" />
        <el-option label="已完成" value="completed" />
        <el-option label="已取消" value="cancelled" />
      </el-select>
      <el-input v-model="filters.keyword" placeholder="搜索(服务/手机号)" clearable style="width: 220px" />
      <el-button type="primary" @click="onSearch">查询</el-button>
      <el-button @click="onReset">重置</el-button>
    </div>

    <el-card>
      <template #header>
        <div class="header-row">
          <div>预约列表</div>
          <div class="actions">
            <el-button size="small" :disabled="multipleSelection.length===0" @click="batchUpdate('confirmed')">批量设为已确认</el-button>
            <el-button size="small" type="success" :disabled="multipleSelection.length===0" @click="batchUpdate('completed')">批量完成</el-button>
            <el-button size="small" type="danger" :disabled="multipleSelection.length===0" @click="batchCancel">批量取消</el-button>
          </div>
        </div>
      </template>

      <el-table :data="pagedData" size="small" :loading="loading" @selection-change="handleSelectionChange" @row-dblclick="openDetail">
        <el-table-column type="selection" width="45" />
        <el-table-column prop="date" label="日期" width="120" />
        <el-table-column prop="time" label="时间" width="100" />
        <el-table-column prop="serviceName" label="服务" min-width="160" />
        <el-table-column prop="contactPhone" label="手机号" width="130" />
        <el-table-column label="状态" width="110">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)">{{ row.statusText }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="380">
          <template #default="{ row }">
            <el-button size="small" @click="openDetail(row)">详情</el-button>
            <el-button size="small" @click="setStatus(row, 'confirmed')" :disabled="row.status==='confirmed'">设为已确认</el-button>
            <el-button size="small" type="success" @click="setStatus(row, 'completed')" :disabled="row.status==='completed'">完成</el-button>
            <el-button size="small" type="danger" @click="cancel(row)" :disabled="row.status==='cancelled'">取消</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="footer-row">
        <div class="tip">共 {{ total }} 条</div>
        <el-pagination
          background
          layout="total, sizes, prev, pager, next, jumper"
          :total="total"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50]"
          v-model:current-page="currentPage"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>

    <!-- 详情抽屉 -->
    <el-drawer v-model="drawerVisible" :title="detailTitle" size="40%">
      <div v-if="current">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="预约日期">{{ current.date }}</el-descriptions-item>
          <el-descriptions-item label="预约时间">{{ current.time }}</el-descriptions-item>
          <el-descriptions-item label="服务">{{ serviceMap.get(current.serviceId) || current.serviceId }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="statusTagType(current.status)">{{ statusText(current.status) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="手机号">{{ current.contactPhone || '-' }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ formatDateTime(current.createdAt) }}</el-descriptions-item>
        </el-descriptions>
        <div class="drawer-actions">
          <el-button @click="drawerVisible=false">关闭</el-button>
          <el-button type="primary" @click="setStatus(current, 'confirmed')" :disabled="current.status==='confirmed'">设为已确认</el-button>
          <el-button type="success" @click="setStatus(current, 'completed')" :disabled="current.status==='completed'">完成</el-button>
          <el-button type="danger" @click="cancel(current)" :disabled="current.status==='cancelled'">取消</el-button>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import { ref, computed, onMounted } from 'vue'
import { fetchAllBookings, fetchServices, updateBookingStatus, cancelBooking } from '../webapi/unicloud'

interface BookingItem {
  _id: string
  date: string
  time: string
  serviceId: string
  contactPhone?: string
  status: 'pending'|'confirmed'|'completed'|'cancelled'
  createdAt?: number
  [key: string]: any
}

const loading = ref(false)
const rawList = ref<BookingItem[]>([])
const serviceMap = ref<Map<string,string>>(new Map())
const multipleSelection = ref<any[]>([])

const filters = ref<{ date: Date | null; status: ''|'pending'|'confirmed'|'completed'|'cancelled'; keyword: string }>(
  { date: null, status: '', keyword: '' }
)

const currentPage = ref(1)
const pageSize = ref(10)

const filtered = computed(() => {
  let list = rawList.value.slice().sort((a:any,b:any) => (b.createdAt || 0) - (a.createdAt || 0))
  if (filters.value.date) {
    const d = filters.value.date
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth()+1).padStart(2,'0')
    const dd = String(d.getDate()).padStart(2,'0')
    const dayStr = `${yyyy}-${mm}-${dd}`
    list = list.filter(i => i.date === dayStr)
  }
  if (filters.value.status) {
    list = list.filter(i => i.status === filters.value.status)
  }
  if (filters.value.keyword?.trim()) {
    const k = filters.value.keyword.trim()
    list = list.filter(i => (serviceMap.value.get(i.serviceId) || '').includes(k) || (i.contactPhone || '').includes(k))
  }
  return list
})

const total = computed(() => filtered.value.length)

const pagedData = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filtered.value.slice(start, end).map(i => ({
    ...i,
    serviceName: serviceMap.value.get(i.serviceId) || `服务ID:${i.serviceId}`,
    statusText: statusText(i.status)
  }))
})

function statusText(s: BookingItem['status']) {
  return s === 'pending' ? '待处理' : s === 'confirmed' ? '已确认' : s === 'completed' ? '已完成' : s === 'cancelled' ? '已取消' : '未知'
}

function statusTagType(s: BookingItem['status']): 'info'|'success'|'warning'|'danger'|'' {
  if (s === 'pending') return 'warning'
  if (s === 'confirmed') return 'info'
  if (s === 'completed') return 'success'
  if (s === 'cancelled') return 'danger'
  return ''
}

function formatDateTime(ts?: number) {
  if (!ts) return '-'
  const d = new Date(ts)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth()+1).padStart(2,'0')
  const dd = String(d.getDate()).padStart(2,'0')
  const hh = String(d.getHours()).padStart(2,'0')
  const mi = String(d.getMinutes()).padStart(2,'0')
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`
}

async function load() {
  loading.value = true
  try {
    const [bookings, services] = await Promise.all([
      fetchAllBookings(),
      fetchServices(true)
    ])
    rawList.value = bookings
    const map = new Map<string,string>()
    services.forEach((s: any) => map.set(s._id, s.name))
    serviceMap.value = map
  } catch (e:any) {
    console.error('加载预约失败', e)
    ElMessage.error('加载预约数据失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

function onSearch() {
  currentPage.value = 1
  // 这里的过滤由 computed 实时生效，无需额外处理
  load() // 同步刷新服务映射与数据，避免陈旧数据
}

function onReset() {
  filters.value = { date: null, status: '', keyword: '' }
  currentPage.value = 1
  load()
}

function handleSelectionChange(val: any[]) {
  multipleSelection.value = val
}

async function setStatus(row: any, status: 'confirmed'|'completed') {
  try {
    await updateBookingStatus(row._id || row.id, status)
    row.status = status
    ElMessage.success('已更新')
  } catch (e:any) {
    console.error(e)
    ElMessage.error(e?.message || '操作失败')
  }
}

async function cancel(row: any) {
  try {
    await ElMessageBox.confirm('确定要取消该预约吗？', '提示', { type: 'warning' })
    await cancelBooking(row._id || row.id)
    row.status = 'cancelled'
    ElMessage.success('已取消')
  } catch (e:any) {
    if (e !== 'cancel') {
      console.error(e)
      ElMessage.error(e?.message || '操作失败')
    }
  }
}

async function batchUpdate(status: 'confirmed'|'completed') {
  if (multipleSelection.value.length === 0) return
  loading.value = true
  try {
    await Promise.all(multipleSelection.value.map((row) => updateBookingStatus(row._id || row.id, status)))
    multipleSelection.value.forEach(row => row.status = status)
    ElMessage.success('批量更新成功')
  } catch (e:any) {
    console.error(e)
    ElMessage.error(e?.message || '批量更新失败')
  } finally {
    loading.value = false
  }
}

async function batchCancel() {
  if (multipleSelection.value.length === 0) return
  try {
    await ElMessageBox.confirm(`确定取消选中的 ${multipleSelection.value.length} 条预约吗？`, '提示', { type: 'warning' })
  } catch {
    return
  }
  loading.value = true
  try {
    await Promise.all(multipleSelection.value.map((row) => cancelBooking(row._id || row.id)))
    multipleSelection.value.forEach(row => row.status = 'cancelled')
    ElMessage.success('批量取消成功')
  } catch (e:any) {
    console.error(e)
    ElMessage.error(e?.message || '批量取消失败')
  } finally {
    loading.value = false
  }
}

function handleSizeChange() {
  currentPage.value = 1
}

function handlePageChange() {
  // 无需额外逻辑，分页由 computed 处理
}

const drawerVisible = ref(false)
const current = ref<BookingItem | null>(null)
const detailTitle = computed(() => current.value ? `预约详情 - ${serviceMap.value.get(current.value.serviceId) || ''}` : '预约详情')

function openDetail(row: BookingItem) {
  current.value = row
  drawerVisible.value = true
}

onMounted(load)
</script>

<style scoped>
.bookings-page { padding:16px; }
.filters { display:flex; gap:12px; margin-bottom: 12px; align-items: center; }
.header-row { display:flex; align-items:center; justify-content: space-between; }
.footer-row { display:flex; justify-content: space-between; padding-top: 8px; align-items: center; }
.tip { color:#909399; font-size: 12px; }
.drawer-actions { margin-top: 16px; display: flex; gap: 8px; }
</style>