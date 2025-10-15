import type { IDoubleTokenRes } from '@/api/types/login'
import type { CustomRequestOptions, IResponse } from '@/http/types'
import { nextTick } from 'vue'
import { LOGIN_PAGE } from '@/router/config'
import { useTokenStore } from '@/store/token'
import { isDoubleTokenMode } from '@/utils'
import { ResultEnum } from './tools/enum'

// 刷新 token 状态管理
let refreshing = false // 防止重复刷新 token 标识
let taskQueue: (() => void)[] = [] // 刷新 token 请求队列

// 响应数据
export function http<T>(options: CustomRequestOptions) {
  // 1. 返回 Promise 对象
  return new Promise<T>((resolve, reject) => {
    // 注意：token会由interceptor.ts中的拦截器自动添加，这里不需要手动添加

    uni.request({
      ...options,
      dataType: 'json',
      // #ifndef MP-WEIXIN
      responseType: 'json',
      // #endif
      // 响应成功
      success: async (res) => {
        console.log('请求成功', res)
        // 状态码 2xx，参考 axios 的设计
        if (res.statusCode >= 200 && res.statusCode < 300) {
          // 2.1  处理业务逻辑错误
          const { code, message, data } = res.data as IResponse<T>
          // console.log('222:', res.data)
          // 429 业务码：请求过于频繁，专用提示并中止
          if (code === 429) {
            !options.hideErrorToast && uni.showToast({
              icon: 'none',
              title: message || '请求过于频繁，请稍后再试',
            })
            // eslint-disable-next-line prefer-promise-reject-errors
            return reject(res.data as any)
          }
          // 0和200当做成功都很普遍，这里直接兼容两者，见 ResultEnum
          if (code !== ResultEnum.Success0 && code !== ResultEnum.Success200) {
            throw new Error(`请求错误[${code}]：${message}`)
          }
          return resolve(res.data as T)
        }
        const resData: IResData<T> = res.data as IResData<T>
        if ((res.statusCode === 401) || (resData.code === 401)) {
          // 判断是否是登录相关请求
          const isLoginRequest = options.url.includes('/login')
            || options.url.includes('/auth')
            || options.url.includes('/register')

          // 如果是登录请求，直接返回错误，不进行token刷新
          if (isLoginRequest) {
            !options.hideErrorToast && uni.showToast({
              icon: 'none',
              title: resData.message || '登录失败，请检查账号密码',
            })
            return reject(resData)
          }

          const tokenStore = useTokenStore()
          if (!isDoubleTokenMode) {
            // 未启用双token策略，显示确认框询问用户是否前往登录
            uni.showModal({
              title: '登录提示',
              content: '您还未登录或登录已过期，无法进行此操作。是否前往登录页面？',
              confirmText: '去登录',
              cancelText: '取消',
              success: (modalRes) => {
                if (modalRes.confirm) {
                  // 用户选择去登录，清理用户信息并跳转
                  tokenStore.logout()
                  uni.navigateTo({ url: LOGIN_PAGE })
                }
                else {
                  // 用户选择取消，只清理用户信息，不跳转
                  tokenStore.logout()
                }
              }
            })
            return reject(resData)
          }

          /* -------- 无感刷新 token ----------- */
          const { refresh_token: refreshToken } = tokenStore.tokenInfo as IDoubleTokenRes || {}

          // 检查是否有有效的refreshToken
          if (!refreshToken) {
            // 没有refreshToken，显示确认框询问用户是否前往登录
            uni.showModal({
              title: '登录提示',
              content: '您的登录已过期，无法进行此操作。是否前往登录页面？',
              confirmText: '去登录',
              cancelText: '取消',
              success: (modalRes) => {
                if (modalRes.confirm) {
                  // 用户选择去登录，清理用户信息并跳转
                  tokenStore.logout()
                  uni.navigateTo({ url: LOGIN_PAGE })
                }
                else {
                  // 用户选择取消，只清理用户信息，不跳转
                  tokenStore.logout()
                }
              }
            })
            return reject(resData)
          }

          // token 失效的，且有刷新 token 的，才放到请求队列里
          console.log('token: ', refreshToken)
          if ((res.statusCode === 401 || resData.code === 401) && refreshToken) {
            taskQueue.push(() => {
              resolve(http<T>(options))
            })
          }
          // 如果有 refreshToken 且未在刷新中，发起刷新 token 请求
          if ((res.statusCode === 401 || resData.code === 401) && refreshToken && !refreshing) {
            refreshing = true
            try {
              // 发起刷新 token 请求（使用 store 的 refreshToken 方法）
              await tokenStore.refreshToken()
              // 刷新 token 成功
              refreshing = false
              nextTick(() => {
                // 关闭其他弹窗
                uni.hideToast()
                uni.showToast({
                  title: 'token 刷新成功',
                  icon: 'none',
                })
              })
              // 将任务队列的所有任务重新请求
              taskQueue.forEach(task => task())
            }
            catch (refreshErr) {
              console.error('刷新 token 失败:', refreshErr)
              refreshing = false
              // 刷新 token 失败，显示确认框询问用户是否前往登录
              nextTick(() => {
                // 关闭其他弹窗
                uni.hideToast()
                uni.showModal({
                  title: '登录提示',
                  content: '登录状态刷新失败，您的登录已过期。是否前往登录页面？',
                  confirmText: '去登录',
                  cancelText: '取消',
                  success: async (modalRes) => {
                    if (modalRes.confirm) {
                      // 用户选择去登录，清理用户信息并跳转
                      await tokenStore.logout()
                      uni.navigateTo({ url: LOGIN_PAGE })
                    }
                    else {
                      // 用户选择取消，只清理用户信息，不跳转
                      await tokenStore.logout()
                    }
                  }
                })
              })
            }
            finally {
              // 不管刷新 token 成功与否，都清空任务队列
              taskQueue = []
            }
          }
        }
        else {
          // 429 过于频繁：专用提示
          if (res.statusCode === 429 || (resData as any)?.code === 429) {
            !options.hideErrorToast && uni.showToast({
              icon: 'none',
              title: (resData as any)?.message || '请求过于频繁，请稍后再试',
            })
            return reject(res.data)
          }
          // 其他错误 -> 根据后端错误信息轻提示
          !options.hideErrorToast
          && uni.showToast({
            icon: 'none',
            title: (resData as any)?.message || '请求错误',
          })
          reject(res.data)
        }
      },
      // 响应失败
      fail(err) {
        uni.showToast({
          icon: 'none',
          title: '网络错误，换个网络试试',
        })
        reject(err)
      },
    })
  })
}

/**
 * GET 请求
 * @param url 后台地址
 * @param query 请求query参数
 * @param header 请求头，默认为json格式
 * @returns
 */
export function httpGet<T>(url: string, query?: Record<string, any>, header?: Record<string, any>, options?: Partial<CustomRequestOptions>) {
  return http<T>({
    url,
    query,
    method: 'GET',
    header,
    ...options,
  })
}

/**
 * POST 请求
 * @param url 后台地址
 * @param data 请求body参数
 * @param query 请求query参数，post请求也支持query，很多微信接口都需要
 * @param header 请求头，默认为json格式
 * @returns
 */
export function httpPost<T>(url: string, data?: Record<string, any>, query?: Record<string, any>, header?: Record<string, any>, options?: Partial<CustomRequestOptions>) {
  return http<T>({
    url,
    query,
    data,
    method: 'POST',
    header,
    ...options,
  })
}
/**
 * PUT 请求
 */
export function httpPut<T>(url: string, data?: Record<string, any>, query?: Record<string, any>, header?: Record<string, any>, options?: Partial<CustomRequestOptions>) {
  return http<T>({
    url,
    data,
    query,
    method: 'PUT',
    header,
    ...options,
  })
}

/**
 * DELETE 请求（无请求体，仅 query）
 */
export function httpDelete<T>(url: string, query?: Record<string, any>, header?: Record<string, any>, options?: Partial<CustomRequestOptions>) {
  return http<T>({
    url,
    query,
    method: 'DELETE',
    header,
    ...options,
  })
}

// 支持与 axios 类似的API调用
http.get = httpGet
http.post = httpPost
http.put = httpPut
http.delete = httpDelete

// 支持与 alovaJS 类似的API调用
http.Get = httpGet
http.Post = httpPost
http.Put = httpPut
http.Delete = httpDelete
