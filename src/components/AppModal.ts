import type { DialogOptions } from 'sard-uniapp'
import { dialog } from 'sard-uniapp'

/** 弹窗返回结果 */
export interface AppModalResult {
  confirm: boolean
  cancel: boolean
}

/** 二次封装弹窗参数（兼容 uni.showModal 常用字段） */
export interface AppModalOptions {
  title?: string
  content?: string
  showCancel?: boolean
  cancelText?: string
  confirmText?: string
  cancelColor?: string
  confirmColor?: string
  icon?: string
  duration?: number
  success?: (res: AppModalResult) => void
  fail?: (err: unknown) => void
  complete?: (res: AppModalResult) => void
  [key: string]: unknown
}

/**
 * @description 统一弹窗调用入口（基于 sard-uniapp dialog 二次封装）
 * @param {AppModalOptions} options 弹窗参数
 * @returns {Promise<AppModalResult>} 交互结果（confirm/cancel）
 */
export function showAppModal(options: AppModalOptions): Promise<AppModalResult> {
  return new Promise((resolve, reject) => {
    try {
      const {
        title = '提示',
        content = '',
        showCancel = true,
        cancelText,
        confirmText,
        cancelColor,
        confirmColor,
        success,
        fail,
        complete,
      } = options

      let settled = false
      const settle = (result: AppModalResult) => {
        if (settled)
          return
        settled = true
        success?.(result)
        complete?.(result)
        resolve(result)
      }

      const dialogOptions: DialogOptions = {
        id: 'app-dialog',
        title,
        message: content,
        showCancel,
        cancelText,
        confirmText,
        cancelProps: cancelColor
          ? { rootStyle: { color: cancelColor } }
          : undefined,
        confirmProps: confirmColor
          ? { rootStyle: { color: confirmColor } }
          : undefined,
        onConfirm: () => settle({ confirm: true, cancel: false }),
        onCancel: () => settle({ confirm: false, cancel: true }),
        onClose: () => settle({ confirm: false, cancel: true }),
      }

      if (showCancel) {
        dialog.confirm(dialogOptions)
      }
      else {
        dialog.alert(dialogOptions)
      }
    }
    catch (error) {
      options.fail?.(error)
      reject(error)
    }
  })
}
