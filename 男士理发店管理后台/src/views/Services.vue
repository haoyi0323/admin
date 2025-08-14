<template>
  <div class="services-page">
    <div class="page-header">
      <h1>服务管理</h1>
      <button class="btn-primary" @click="showModal = true">
        <span>+</span> 新增服务
      </button>
    </div>

    <!-- 服务列表 -->
    <div class="services-grid">
      <div v-for="service in services" :key="service._id" class="service-card">
        <div class="card-image">
          <img :src="service.image || '/placeholder-service.svg'" 
               :alt="service.name" 
               @error="handleImageError">
        </div>
        <div class="card-content">
          <h3>{{ service.name }}</h3>
          <p class="description">{{ service.description || '暂无描述' }}</p>
          <div class="meta">
            <span class="price">¥{{ service.price }}</span>
            <span class="duration">{{ service.duration }}分钟</span>
          </div>
          <div class="status">
            <span :class="['status-badge', service.isActive ? 'active' : 'inactive']">
              {{ service.isActive ? '启用' : '禁用' }}
            </span>
          </div>
          <div class="actions">
            <button class="btn-secondary" @click="editService(service)">编辑</button>
            <button class="btn-danger" @click="deleteService(service)">删除</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 服务表单弹窗 -->
    <div v-if="showModal" class="modal-overlay" @click="closeModal">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h2>{{ isEdit ? '编辑服务' : '新增服务' }}</h2>
          <button class="btn-close" @click="closeModal">×</button>
        </div>
        
        <form @submit.prevent="saveService" class="modal-body">
          <div class="form-group">
            <label>服务名称 *</label>
            <input v-model="form.name" type="text" required placeholder="请输入服务名称">
          </div>
          
          <div class="form-group">
            <label>服务描述</label>
            <textarea v-model="form.description" placeholder="请输入服务描述" rows="3"></textarea>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label>价格 *</label>
              <input v-model="form.price" type="number" min="0" step="0.01" required placeholder="0.00">
            </div>
            <div class="form-group">
              <label>时长（分钟）*</label>
              <input v-model="form.duration" type="number" min="1" required placeholder="30">
            </div>
          </div>
          
          <div class="form-group">
            <label>服务图片</label>
            <div class="image-upload">
              <input type="file" ref="fileInput" @change="handleFileSelect" accept="image/*" style="display: none">
              <div class="upload-area" @click="$refs.fileInput.click()">
                <img v-if="form.image" :src="form.image" alt="预览图" class="preview-image">
                <div v-else class="upload-placeholder">
                  <span>点击上传图片</span>
                </div>
              </div>
              <button v-if="form.image" type="button" class="btn-remove" @click="form.image = ''">移除图片</button>
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label>状态</label>
              <select v-model="form.isActive">
                <option :value="true">启用</option>
                <option :value="false">禁用</option>
              </select>
            </div>
            <div class="form-group">
              <label>排序值</label>
              <input v-model="form.sortOrder" type="number" min="0" placeholder="0">
            </div>
          </div>
        </form>
        
        <div class="modal-footer">
          <button type="button" class="btn-secondary" @click="closeModal">取消</button>
          <button type="submit" class="btn-primary" @click="saveService" :disabled="saving">
            {{ saving ? '保存中...' : '保存' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { callFunction } from '../webapi/unicloud'

export default {
  name: 'Services',
  data() {
    return {
      services: [],
      showModal: false,
      isEdit: false,
      saving: false,
      uploading: false,
      form: {
        _id: '',
        name: '',
        description: '',
        price: '',
        duration: '',
        image: '',
        isActive: true,
        sortOrder: 0
      }
    }
  },
  mounted() {
    this.loadServices()
  },
  methods: {
    async loadServices() {
      try {
        const res = await callFunction('services', {
          action: 'list',
          includeInactive: true
        })
        this.services = res.data || []
      } catch (error) {
        console.error('加载服务列表失败:', error)
        alert('加载服务列表失败: ' + (error.message || '网络错误'))
      }
    },
    
    editService(service) {
      this.isEdit = true
      this.form = { ...service }
      this.showModal = true
    },
    
    async deleteService(service) {
      if (!confirm(`确定要删除服务"${service.name}"吗？`)) return
      
      try {
        await callFunction('services', {
          action: 'delete',
          id: service._id
        })
        alert('删除成功')
        this.loadServices()
      } catch (error) {
        console.error('删除服务失败:', error)
        alert('删除服务失败: ' + (error.message || '网络错误'))
      }
    },
    
    async saveService() {
      if (this.saving || this.uploading) return
      this.saving = true
      
      try {
        const action = this.isEdit ? 'update' : 'create'
        const payload = { action, ...this.form }
        if (this.isEdit) payload.id = this.form._id
        
        await callFunction('services', payload)
        alert(this.isEdit ? '更新成功' : '创建成功')
        this.closeModal()
        this.loadServices()
      } catch (error) {
        console.error('保存服务失败:', error)
        alert('保存服务失败: ' + (error.message || '网络错误'))
      } finally {
        this.saving = false
      }
    },
    
    closeModal() {
      this.showModal = false
      this.isEdit = false
      this.form = {
        _id: '',
        name: '',
        description: '',
        price: '',
        duration: '',
        image: '',
        isActive: true,
        sortOrder: 0
      }
    },
    
    async handleFileSelect(event) {
      const file = event.target.files[0]
      if (!file) return
      
      // 真实上传逻辑
      this.uploading = true
      try {
        const toBase64 = (file) => new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result)
          reader.onerror = reject
          reader.readAsDataURL(file)
        })
        const base64 = await toBase64(file)
        const res = await callFunction('upload', {
          action: 'upload',
          fileBase64: base64,
          fileName: file.name,
          fileType: file.type
        })
        if (res && (res.url || res.data?.url)) {
          this.form.image = res.url || res.data.url
        } else if (res?.data?.fileID) {
          this.form.image = res.data.fileID
        } else {
          throw new Error('上传失败')
        }
      } catch (e) {
        console.error('图片上传失败', e)
        alert('图片上传失败，请重试: ' + (e.message || '网络错误'))
      } finally {
        this.uploading = false
      }
    },
    
    handleImageError(event) {
      event.target.src = '/placeholder-service.svg'
    },
  }
}
</script>

<style scoped>
.services-page {
  padding: 24px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-header h1 {
  margin: 0;
  color: #333;
}

.btn-primary {
  background: #007AFF;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
}

.btn-primary:hover {
  background: #0056CC;
}

.services-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 24px;
}

.service-card {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  transition: transform 0.2s;
}

.service-card:hover {
  transform: translateY(-2px);
}

.card-image {
  height: 200px;
  overflow: hidden;
}

.card-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.card-content {
  padding: 20px;
}

.card-content h3 {
  margin: 0 0 8px 0;
  color: #333;
}

.description {
  color: #666;
  margin: 0 0 12px 0;
  font-size: 14px;
}

.meta {
  display: flex;
  gap: 16px;
  margin-bottom: 12px;
}

.price {
  color: #FF6B35;
  font-weight: bold;
  font-size: 18px;
}

.duration {
  color: #666;
}

.status {
  margin-bottom: 16px;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: bold;
}

.status-badge.active {
  background: #E8F5E8;
  color: #2E7D2E;
}

.status-badge.inactive {
  background: #FEE;
  color: #D63384;
}

.actions {
  display: flex;
  gap: 8px;
}

.btn-secondary {
  background: #6C757D;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
}

.btn-secondary:hover {
  background: #5A6268;
}

.btn-danger {
  background: #DC3545;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
}

.btn-danger:hover {
  background: #C82333;
}

/* 弹窗样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #eee;
}

.modal-header h2 {
  margin: 0;
  color: #333;
}

.btn-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #999;
}

.btn-close:hover {
  color: #333;
}

.modal-body {
  padding: 20px;
}

.form-group {
  margin-bottom: 20px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: #333;
  font-weight: 500;
}

.form-group input,
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
}

.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
  outline: none;
  border-color: #007AFF;
}

.image-upload {
  position: relative;
}

.upload-area {
  border: 2px dashed #ddd;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.2s;
}

.upload-area:hover {
  border-color: #007AFF;
}

.preview-image {
  max-width: 100%;
  max-height: 200px;
  border-radius: 6px;
}

.upload-placeholder {
  color: #666;
}

.btn-remove {
  position: absolute;
  top: 8px;
  right: 8px;
  background: #DC3545;
  color: white;
  border: none;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px;
  border-top: 1px solid #eee;
}
</style>