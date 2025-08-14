<template>
    <view class="container">
        <view class="card">
            <text class="shop-name">M·Y 男士理发店</text>
            <text class="subtitle">欢迎预约理发服务</text>
        </view>
    </view>
    
</template>

<script>
    export default {
        name: 'HomeIndex'
    }
</script>

<style>
    .container {
        padding: 32rpx;
    }
    .card {
        margin-top: 40rpx;
        background: #ffffff;
        border-radius: 20rpx;
        padding: 32rpx;
        box-shadow: 0 12rpx 28rpx rgba(0,0,0,0.06);
        border: 1rpx solid #f3f4f6;
    }
    .shop-name {
        font-size: 40rpx;
        font-weight: 600;
        color: #222;
    }
    .subtitle {
        margin-top: 12rpx;
        color: #666;
        font-size: 28rpx;
    }
</style>
