<template>
  <div class="login">
    <el-card class="box">
      <h2 class="title">后台登录</h2>
      <el-form :model="form" @submit.prevent>
        <el-form-item label="管理员Token">
          <el-input v-model="form.token" placeholder="请输入管理员Token" />
        </el-form-item>
        <el-button type="primary" @click="login" block>登录</el-button>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const form = reactive({ token: '' })

function login() {
  if (!form.token) return
  localStorage.setItem('ADMIN_TOKEN', form.token)
  router.push('/')
}
</script>

<style scoped>
.login { display:flex; align-items:center; justify-content:center; height:100vh; background:#f5f7fa; }
.box { width: 360px; }
.title { text-align:center; margin-bottom:16px; }
</style>