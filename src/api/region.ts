/**
 * 地区角色模块 API
 * 前缀: /api/v1
 * 无鉴权要求
 * 基于 md/用户端接口对接文档.md
 */

import type { ApiResponse, Character, PaginationParams, Region } from './types/index'
import { http } from '@/http/http'

// 地区查询参数
export interface RegionParams {
  parent_id?: number
}

// 角色查询参数
export interface CharacterListParams extends PaginationParams {
  region_code?: string
}

/**
 * 获取地区列表
 * GET /api/v1/regions
 */
export function getRegions(params: RegionParams = {}): Promise<ApiResponse<Region[]>> {
  return http.get<ApiResponse<Region[]>>('/regions', params)
}

/**
 * 获取地区详情
 * GET /api/v1/regions/<region_code>
 */
export function getRegionDetail(regionCode: string): Promise<ApiResponse<Region>> {
  return http.get<ApiResponse<Region>>(`/regions/${regionCode}`)
}

/**
 * 获取角色列表
 * GET /api/v1/characters
 */
export function getCharacters(params: CharacterListParams = {}): Promise<ApiResponse<{
  characters: Character[]
  pagination: {
    page: number
    pageSize: number
    total: number
    pages: number
  }
}>> {
  return http.get<ApiResponse<{
    characters: Character[]
    pagination: {
      page: number
      pageSize: number
      total: number
      pages: number
    }
  }>>('/characters', params)
}

/**
 * 获取角色详情
 * GET /api/v1/characters/<character_code>
 */
export function getCharacterDetail(characterCode: string): Promise<ApiResponse<Character>> {
  return http.get<ApiResponse<Character>>(`/characters/${characterCode}`)
}
