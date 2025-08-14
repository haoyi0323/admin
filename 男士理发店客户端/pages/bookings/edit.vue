<template>
  <view class="uni-container">
    <uni-forms ref="form" :model="formData" validateTrigger="bind">
      <uni-forms-item name="userId" label="">
        <uni-easyinput placeholder="用户ID（可为空）" v-model="formData.userId"></uni-easyinput>
      </uni-forms-item>
      <uni-forms-item name="serviceId" label="">
        <undefined v-model="formData.serviceId"></undefined>
      </uni-forms-item>
      <uni-forms-item name="date" label="" required>
        <uni-easyinput placeholder="预约日期 YYYY-MM-DD" v-model="formData.date"></uni-easyinput>
      </uni-forms-item>
      <uni-forms-item name="time" label="" required>
        <uni-easyinput placeholder="预约时间 HH:mm" v-model="formData.time"></uni-easyinput>
      </uni-forms-item>
      <uni-forms-item name="durationMin" label="" required>
        <undefined v-model="formData.durationMin"></undefined>
      </uni-forms-item>
      <uni-forms-item name="remark" label="">
        <uni-easyinput v-model="formData.remark"></uni-easyinput>
      </uni-forms-item>
      <uni-forms-item name="contactPhone" label="">
        <uni-easyinput placeholder="联系电话" v-model="formData.contactPhone"></uni-easyinput>
      </uni-forms-item>
      <uni-forms-item name="status" label="">
        <uni-data-checkbox v-model="formData.status" :localdata="formOptions.status_localdata"></uni-data-checkbox>
      </uni-forms-item>
      <uni-forms-item name="createdAt" label="">
        <undefined v-model="formData.createdAt"></undefined>
      </uni-forms-item>
      <view class="uni-button-group">
        <button type="primary" class="uni-button" style="width: 100px;" @click="submit">提交</button>
        <navigator open-type="navigateBack" style="margin-left: 15px;">
          <button class="uni-button" style="width: 100px;">返回</button>
        </navigator>
      </view>
    </uni-forms>
  </view>
</template>

<script>
  import { validator } from '../../js_sdk/validator/bookings.js';

  const db = uniCloud.database();
  const dbCmd = db.command;
  const dbCollectionName = 'bookings';

  function getValidator(fields) {
    let result = {}
    for (let key in validator) {
      if (fields.includes(key)) {
        result[key] = validator[key]
      }
    }
    return result
  }

  

  export default {
    data() {
      let formData = {
        "userId": "",
        "serviceId": null,
        "date": "",
        "time": "",
        "durationMin": null,
        "remark": "",
        "contactPhone": "",
        "status": "",
        "createdAt": null
      }
      return {
        formData,
        formOptions: {
          "status_localdata": [
            {
              "value": "booked",
              "text": "booked"
            },
            {
              "value": "finished",
              "text": "finished"
            },
            {
              "value": "canceled",
              "text": "canceled"
            }
          ]
        },
        rules: {
          ...getValidator(Object.keys(formData))
        }
      }
    },
    onLoad(e) {
      if (e.id) {
        const id = e.id
        this.formDataId = id
        this.getDetail(id)
      }
    },
    onReady() {
      this.$refs.form.setRules(this.rules)
    },
    methods: {
      
      /**
       * 验证表单并提交
       */
      submit() {
        uni.showLoading({
          mask: true
        })
        this.$refs.form.validate().then((res) => {
          return this.submitForm(res)
        }).catch(() => {
        }).finally(() => {
          uni.hideLoading()
        })
      },

      /**
       * 提交表单
       */
      submitForm(value) {
        // 使用 clientDB 提交数据
        return db.collection(dbCollectionName).doc(this.formDataId).update(value).then((res) => {
          uni.showToast({
            title: '修改成功'
          })
          this.getOpenerEventChannel().emit('refreshData')
          setTimeout(() => uni.navigateBack(), 500)
        }).catch((err) => {
          uni.showModal({
            content: err.message || '请求服务失败',
            showCancel: false
          })
        })
      },

      /**
       * 获取表单数据
       * @param {Object} id
       */
      getDetail(id) {
        uni.showLoading({
          mask: true
        })
        db.collection(dbCollectionName).doc(id).field("userId,serviceId,date,time,durationMin,remark,contactPhone,status,createdAt").get().then((res) => {
          const data = res.result.data[0]
          if (data) {
            this.formData = data
            
          }
        }).catch((err) => {
          uni.showModal({
            content: err.message || '请求服务失败',
            showCancel: false
          })
        }).finally(() => {
          uni.hideLoading()
        })
      }
    }
  }
</script>
