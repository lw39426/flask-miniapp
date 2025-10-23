import { http } from '@/http/http'
import { useTokenStore } from '@/store/token'
import { getEnvBaseUrl } from '@/utils'

// 请求基准地址
const baseUrl = getEnvBaseUrl()
export interface IFoo {
  id: number
  name: string
}

export function foo() {
  return http.Get<IFoo>('/foo', {
    params: {
      name: '菲鸽',
      page: 1,
      pageSize: 10,
    },
  })
}

export interface IFooItem {
  id: string
  name: string
}

/** GET 请求 */
export function getFooAPI(name: string) {
  return http.get<IFooItem>('/foo', { name })
}
/** GET 请求；支持 传递 header 的范例 */
export function getFooAPI2(name: string) {
  return http.get<IFooItem>('/foo', { name }, { 'Content-Type-100': '100' })
}

/** POST 请求 */
export function postFooAPI(name: string) {
  return http.post<IFooItem>('/foo', { name })
}
/** POST 请求；需要传递 query 参数的范例；微信小程序经常有同时需要query参数和body参数的场景 */
export function postFooAPI2(name: string) {
  return http.post<IFooItem>('/foo', { name })
}
/** POST 请求；支持 传递 header 的范例 */
export function postFooAPI3(name: string) {
  return http.post<IFooItem>('/foo', { name }, { name }, { 'Content-Type-100': '100' })
}

/** 文件上传 */
export const formUpload = (data) => {
  return http.post<any>(
    '/system/upload-file',
    { data },
    {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    }
  )
}

/** 兼容 H5 和小程序的文件上传 */
export const uploadFile = async (filePath: string, name: string = 'file') => {
  // #ifdef H5
  // H5 端处理 blob URL 或 base64 数据
  if (filePath.startsWith('blob:') || filePath.startsWith('data:')) {
    try {
      // console.log('H5 端处理文件:', filePath);

      let file: File

      // 获取文件扩展名的辅助函数
      const getFileExtension = (mimeType: string): string => {
        const mimeToExt: Record<string, string> = {
          'image/jpeg': 'jpg',
          'image/jpg': 'jpg',
          'image/png': 'png',
          'image/gif': 'gif',
          'image/webp': 'webp',
          'image/bmp': 'bmp',
          'image/svg+xml': 'svg'
        }
        return mimeToExt[mimeType] || 'jpg' // 默认为 jpg
      }

      // 生成唯一文件名
      const generateFileName = (baseName: string, extension: string): string => {
        // 生成唯一文件名
        // const timestamp = Date.now();
        // const random = Math.random().toString(36).substring(2, 8);
        // return `${baseName}_${timestamp}_${random}.${extension}`;
        // 不唯一文件名
        return `${baseName}.${extension}`
      }

      if (filePath.startsWith('data:')) {
        // 处理 base64 数据
        console.log('处理 base64 数据')
        const response = await fetch(filePath)
        const blob = await response.blob()
        console.log('处理后的文件Blob: ', blob)

        // 从 MIME 类型确定文件扩展名
        const mimeType = blob.type || 'image/jpeg'
        const extension = getFileExtension(mimeType)
        console.log(`文件名是什么？: ${name}, MIME: ${mimeType}`)
        const fileName = generateFileName(name, extension)

        console.log(`文件信息: ${fileName}, MIME: ${mimeType}`)
        file = new File([blob], fileName, { type: mimeType })
      }
      else {
        // 处理 blob URL
        console.log('处理 blob URL')
        const response = await fetch(filePath)
        const blob = await response.blob()

        // 从 MIME 类型确定文件扩展名
        const mimeType = blob.type || 'image/jpeg'
        const extension = getFileExtension(mimeType)
        const fileName = generateFileName(name, extension)

        console.log(`文件信息: ${fileName}, MIME: ${mimeType}`)
        file = new File([blob], fileName, { type: mimeType })
      }

      const formData = new FormData()
      formData.append('file', file)

      console.log('FormData 创建完成，开始上传...')

      // H5 端使用原生 fetch 上传 FormData
      const uploadUrl = `${baseUrl}/system/upload-file`

      // 获取认证头
      const tokenStore = useTokenStore()
      const tokenInfo = tokenStore.tokenInfo
      let authHeader = ''

      if ('access_token' in tokenInfo) {
        authHeader = `Bearer ${tokenInfo.access_token}`
      }
      else {
        authHeader = `Bearer ${tokenInfo.token}`
      }

      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
        headers: {
          Authorization: authHeader,
          // 不要设置 Content-Type，让浏览器自动设置 multipart/form-data 和 boundary
        }
      })

      if (!uploadResponse.ok) {
        throw new Error(`上传失败: ${uploadResponse.status} ${uploadResponse.statusText}`)
      }

      const result = await uploadResponse.json()
      console.log('H5 上传成功:', result)

      return result
    }
    catch (error) {
      console.error('H5 文件上传失败:', error)
      throw error
    }
  }
  else {
    // H5 端的普通文件路径（如果有的话）
    console.log('H5 端不支持的文件格式:', filePath)
    throw new Error('H5 端仅支持 blob URL 或 base64 数据上传')
  }
  // #endif

  // #ifndef H5
  // 小程序端直接使用 uni.uploadFile
  console.log('小程序端上传文件:', filePath)

  return new Promise((resolve, reject) => {
    uni.uploadFile({
      url: '/system/upload-file', // 使用相对路径，让拦截器处理完整URL和认证头
      filePath,
      name: 'file',
      success: (res) => {
        console.log('小程序上传成功:', res)
        const data = JSON.parse(res.data)
        try {
          console.log('小程序上传成功111:', data)
          resolve(data)
        }
        catch (error) {
          resolve(data)
        }
      },
      fail: (error) => {
        console.error('小程序文件上传失败:', error)
        reject(error)
      }
    })
  })
  // #endif
}
