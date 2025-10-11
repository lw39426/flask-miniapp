<template>
  <view class="profile-page">
    <!-- 自定义导航栏 -->
    <view class="custom-nav">
      <view class="nav-left" @tap="goBack">
        <text class="nav-icon">←</text>
      </view>
      <view class="nav-title">
        个人资料
      </view>
      <view class="nav-right">
        <text class="nav-icon">⋮</text>
      </view>
    </view>
    <!-- 个人资料表单 -->
    <wd-form ref="formRef" :model="form" class="profile-form">
      <view class="section-title">
        个人资料信息
      </view>
      <wd-cell-group :border="true">
        <wd-input
          v-model="form.nickname"
          label="用户名"
          marker-side="after"
          placeholder="请输入用户名"
          :rules="[{ required: true, message: '用户名不能为空' }]"
        />
        <wd-picker
          v-model="form.gender"
          label="性别"
          :columns="genderOptions"
          placeholder="请选择性别"
        />
        <wd-datetime-picker
          v-model="birthdayStr"
          label="生日"
          title="选择生日"
          type="date"
        />
        <wd-input
          v-model="form.phone"
          label="关联手机"
          type="tel"
          marker-side="after"
          placeholder="请输入手机号"
          :rules="[{ required: true, pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确' }]"
        />
        <wd-col-picker
          v-model="addressArr"
          label="地址"
          placeholder="请选择地址"
          label-width="100px"
          prop="address"
          :columns="area"
          :column-change="areaChange"
          @confirm="handleConfirm"
        />
        <wd-textarea
          v-model="form.description"
          label="个人简介"
          label-width="100px"
          type="textarea"
          :maxlength="300"
          show-word-limit
          placeholder="请输入活动细则信息"
          clearable
          prop="content"
        />
      </wd-cell-group>
    </wd-form>

    <!-- 保存按钮 -->
    <view class="save-button-container">
      <wd-button type="primary" block @click="handleSave">
        保存
      </wd-button>
    </view>
  </view>
</template>

<script lang="ts" setup>
import dayjs from 'dayjs'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useToast } from 'wot-design-uni'
// 导入头像上传 API
// 导入路径根据自己实际情况调整，万不可一贴了之
import { useColPickerData } from '@/hooks/useColPickerData'

import { useTokenStore } from '@/store/token'

import { useUserStore } from '@/store/user'

const { colPickerData, findChildrenByCode } = useColPickerData()

// 定义页面配置
definePage({
  style: {
    navigationStyle: 'custom',
    navigationBarTitleText: '个人资料',
  },
})

// 获取store
const tokenStore = useTokenStore()
const userStore = useUserStore()
const toast = useToast()

// 表单实例
const formRef = ref<any>()

// 表单数据
const form = reactive<{
  nickname: string
  gender: number
  birthday: string | number
  address?: string
  province?: string
  city?: string
  description: string
  phone: string | number
}>({
  nickname: '',
  gender: 0,
  birthday: '',
  address: '',
  phone: '',
  province: '',
  city: '',
  description: '',
})

// 根据地址文本查找对应的地址码数组（用于回显）
const findAddressCodesByText = (addressText: string): string[] => {
  if (!addressText)
    return []

  const addressParts = addressText.split('/')
  const codes: string[] = []

  // 查找省份代码
  if (addressParts[0]) {
    const province = colPickerData.find(item => item.text === addressParts[0])
    if (province) {
      codes.push(province.value)

      // 查找城市代码
      if (addressParts[1]) {
        const cityData = findChildrenByCode(colPickerData, province.value)
        const city = cityData?.find(item => item.text === addressParts[1])
        if (city) {
          codes.push(city.value)

          // 查找区县代码
          if (addressParts[2]) {
            const districtData = findChildrenByCode(colPickerData, city.value)
            const district = districtData?.find(item => item.text === addressParts[2])
            if (district) {
              codes.push(district.value)
            }
          }
        }
      }
    }
  }

  return codes
}

// 将地址码数组转换为地址文本
const convertCodesToAddressText = (codes: string[]): string => {
  if (!codes || codes.length === 0)
    return ''

  const addressParts: string[] = []

  // 获取省份名称
  if (codes[0]) {
    const province = colPickerData.find(item => item.value === codes[0])
    if (province) {
      addressParts.push(province.text)

      // 获取城市名称
      if (codes[1]) {
        const cityData = findChildrenByCode(colPickerData, codes[0])
        const city = cityData?.find(item => item.value === codes[1])
        if (city) {
          addressParts.push(city.text)

          // 获取区县名称
          if (codes[2]) {
            const districtData = findChildrenByCode(colPickerData, codes[1])
            const district = districtData?.find(item => item.value === codes[2])
            if (district) {
              addressParts.push(district.text)
            }
          }
        }
      }
    }
  }

  return addressParts.join('/')
}
const area = ref<any[]>([
  colPickerData.map((item) => {
    return {
      value: item.value,
      label: item.text
    }
  })
])

const areaChange = ({ selectedItem, resolve, finish }) => {
  const areaData = findChildrenByCode(colPickerData, selectedItem.value)
  if (areaData && areaData.length) {
    resolve(
      areaData.map((item) => {
        return {
          value: item.value,
          label: item.text
        }
      })
    )
  }
  else {
    finish()
  }
}

// 处理地址选择
const handleConfirm = ({ selectedItems }) => {
  // 存储地址文本到 form.address
  form.address = selectedItems.map(item => item.label).join('/')
  // 同时更新省市字段（如果后端需要）
  form.province = selectedItems[0]?.label || ''
  form.city = selectedItems[1]?.label || ''
  console.log('选择的地址文本:', form.address)
}
// 初始化地址列数据（用于回显）
const initAddressColumns = (addressText: string) => {
  if (!addressText)
    return

  // 根据地址文本查找对应的地址码
  const codes = findAddressCodesByText(addressText)
  if (codes.length === 0)
    return

  // 重新构建完整的 columns 数据
  const newColumns = []

  // 第一级：省份
  newColumns.push(colPickerData.map(item => ({
    value: item.value,
    label: item.text
  })))

  // 如果有第二级代码，添加城市数据
  if (codes.length > 1) {
    const cityData = findChildrenByCode(colPickerData, codes[0])
    if (cityData && cityData.length) {
      newColumns.push(cityData.map(item => ({
        value: item.value,
        label: item.text
      })))
    }
  }

  // 如果有第三级代码，添加区县数据
  if (codes.length > 2) {
    const districtData = findChildrenByCode(colPickerData, codes[1])
    if (districtData && districtData.length) {
      newColumns.push(districtData.map(item => ({
        value: item.value,
        label: item.text
      })))
    }
  }

  // 更新 area 数据
  area.value = newColumns
}

// 监听 userInfo 的变化，同步到 form
watch(
  () => userStore.userInfo,
  (newUserInfo) => {
    if (newUserInfo) {
      form.nickname = newUserInfo.nickname || newUserInfo.username || ''
      form.gender = newUserInfo.gender || 0
      form.birthday = newUserInfo.birthday || ''
      form.phone = newUserInfo.phone || ''
      form.province = newUserInfo.province || ''
      form.city = newUserInfo.city || ''
      form.address = newUserInfo.address || ''
      form.description = newUserInfo.description || ''

      // 如果有地址数据，需要初始化完整的层级数据
      if (newUserInfo.address) {
        initAddressColumns(newUserInfo.address)
      }
    }
  },
  { immediate: true, deep: true }
)

/* 给组件用的计算属性 */
const birthdayStr = computed<string>({
  get() { return form.birthday ? dayjs(form.birthday).format('YYYY-MM-DD') : '' },
  set(val) { form.birthday = val ? dayjs(val).valueOf() : 0 }
})

// 选择地址数据
/* 2. 组件真正绑定的计算属性 */
const addressArr = computed<string[]>({
  get() {
    // 如果 form.address 是地址文本，需要转换为地址码数组用于回显
    if (form.address) {
      return findAddressCodesByText(form.address)
    }
    return []
  },
  set(val: string[]) {
    // 选完列后，将地址码数组转换为地址文本存储
    form.address = convertCodesToAddressText(val)
  }
})

// 性别选项
const genderOptions = [
  { label: '男', value: 1 },
  { label: '女', value: 2 },
  { label: '其他', value: 0 }
]

// 计算属性
const regionText = computed(() => {
  const { province, city } = form
  if (!province && !city)
    return '未设置'
  return `${province || ''} ${city || ''}`.trim()
})

// 格式化函数
const dateFormatter = (type: string, val: number) => {
  if (type === 'year')
    return `${val}年`
  if (type === 'month')
    return `${val}月`
  if (type === 'day')
    return `${val}日`
  return val
}

const formatPhone = (phone?: string) => {
  if (!phone)
    return '未绑定'
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
}

// 导航
const goBack = () => uni.navigateBack()

// 核心更新逻辑
const handleSave = async () => {
  if (!formRef.value)
    return

  const { valid, errors } = await formRef.value.validate()

  if (valid) {
    try {
      uni.showLoading({ title: '保存中...' })
      const newForms = {
        ...form,
        birthday: dayjs(form.birthday).format('YYYY-MM-DD')
      }

      // 更新后端数据
      await userStore.updateUserInfo(newForms as any)

      // 重新获取最新的用户信息，确保本地状态同步
      await userStore.fetchUserInfo()

      uni.hideLoading()
      toast.success({ msg: '保存成功' })
    }
    catch (error) {
      uni.hideLoading()
      toast.error({ msg: '保存失败' })
      console.error('更新用户信息失败:', error)
    }
  }
  else {
    if (errors && errors[0] && errors[0].message) {
      toast.error({ msg: errors[0].message })
    }
    console.log('表单校验失败', errors)
  }
}

const onBirthdayConfirm = ({ value }: { value: Date }) => {
  const date = value
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  form.birthday = `${year}-${month}-${day}`
}

onMounted(() => {
  if (!tokenStore.hasLogin) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    setTimeout(() => uni.navigateTo({ url: '/pages/login/login' }), 1500)
  }
  else {
    userStore.fetchUserInfo()
  }
})
</script>

<style lang="scss" scoped>
.profile-page {
  background-color: #f8f8f8;
  min-height: 100vh;
  padding-bottom: 200rpx; /* 为底部保存按钮和安全区域留出空间 */
}

.custom-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  padding: var(--status-bar-height) 30rpx 0;
  background-color: #fff;
  position: sticky;
  top: 0;
  z-index: 100;

  .nav-left,
  .nav-right {
    width: 60rpx;
    height: 60rpx;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .nav-title {
    font-size: 32rpx;
    font-weight: 500;
  }
  .nav-icon {
    font-size: 36rpx;
  }
}

.profile-form {
  margin-top: 20rpx;
  .section-title {
    padding: 20rpx 30rpx 10rpx;
    font-size: 24rpx;
    color: #999;
    background-color: transparent;
  }
}

.save-button-container {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 20rpx 30rpx;
  padding-bottom: calc(20rpx + constant(safe-area-inset-bottom));
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  background-color: #f8f8f8;
  box-shadow: 0 -2rpx 10rpx rgba(0, 0, 0, 0.05);
  // z-index: 100;
}
</style>
