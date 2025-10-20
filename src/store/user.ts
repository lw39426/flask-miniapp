import type { IUserInfoRes } from '@/api/types/login'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  getUserInfo,
  updateInfo,
} from '@/api/login'

// 初始化状态
const userInfoState: IUserInfoRes = {
  id: null,
  username: '',
  nickname: '',
  avatar: '/static/images/default-avatar.png',
}

export const useUserStore = defineStore(
  'user',
  () => {
    // 定义用户信息
    const userInfo = ref<IUserInfoRes>({ ...userInfoState })
    // 设置用户信息
    const setUserInfo = (val: IUserInfoRes) => {
      console.log('设置用户信息', val)
      // 若头像为空 则使用默认头像
      if (!val.avatar) {
        val.avatar = userInfoState.avatar
      }
      userInfo.value = val
    }
    const setUserAvatar = (avatar: string) => {
      userInfo.value.avatar = avatar
      console.log('设置用户头像', avatar)
      console.log('userInfo', userInfo.value)
    }
    // 删除用户信息
    const clearUserInfo = () => {
      userInfo.value = { ...userInfoState }
      uni.removeStorageSync('user')
    }

    /**
     * 获取用户信息
     */
    const fetchUserInfo = async () => {
      // 调用获取用户接口
      const res = await getUserInfo()
      console.log('获取用户信息-res: ', res)
      setUserInfo(res.data)
      return res
    }

    /**
     * 更新用户信息
     */
    const updateUserInfo = async (data: Partial<IUserInfoRes>) => {
      try {
        console.log('更新用户信息-data: ', data)

        // 构造API需要的格式，至少需要id
        const apiPayload = {
          id: userInfo.value.id,
          ...data, // 将需要更新的字段动态传递给API
        }

        // 调用API更新用户信息
        const res = await updateInfo(apiPayload as any)
        console.log('更新用户信息-res: ', res)

        // API调用成功后，更新本地状态
        const updatedInfo = { ...userInfo.value, ...data }
        setUserInfo(updatedInfo)

        return res
      }
      catch (error) {
        console.error('更新用户信息失败:', error)
        throw error
      }
    }

    return {
      userInfo,
      clearUserInfo,
      fetchUserInfo,
      updateUserInfo,
      setUserInfo,
      setUserAvatar,
    }
  },
  {
    persist: true,
  },
)
