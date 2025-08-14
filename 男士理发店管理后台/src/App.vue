<template>
  <el-config-provider namespace="ep">
    <router-view />
  </el-config-provider>
</template>

<script setup lang="ts"></script>

<style>
html, body, #app { height: 100%; margin: 0; }
/* 强制隐藏 Element Plus PageHeader 的返回箭头图标，避免异常放大覆盖页面 */
.ep-page-header .ep-icon,
.ep-page-header svg {
  display: none !important;
}
</style>