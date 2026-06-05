const cloud = require('wx-server-sdk')
const { success, fail, getCloudImageFileId, getDirectImageUrl, resolveIngredientImageUrls, escapeRegExp } = require('./utils')

const { mockGetTempFileURL } = cloud.__mocks

beforeEach(() => {
  jest.clearAllMocks()
})

describe('common/utils', () => {
  describe('success', () => {
    test('返回标准成功格式', () => {
      const result = success({ key: 'value' })

      expect(result).toEqual({
        success: true,
        code: 0,
        message: 'success',
        data: { key: 'value' }
      })
    })
  })

  describe('fail', () => {
    test('返回标准失败格式', () => {
      const result = fail(40001, '参数错误')

      expect(result).toEqual({
        success: false,
        code: 40001,
        message: '参数错误',
        data: null
      })
    })

    test('支持自定义 data', () => {
      const result = fail(50001, '错误', { detail: 'info' })

      expect(result.data).toEqual({ detail: 'info' })
    })
  })

  describe('getCloudImageFileId', () => {
    test('返回 cloud:// 开头的 imageFileId', () => {
      const item = { imageFileId: 'cloud://file-id', imageUrl: '' }
      expect(getCloudImageFileId(item)).toBe('cloud://file-id')
    })

    test('imageFileId 为空时回退到 imageUrl', () => {
      const item = { imageFileId: '', imageUrl: 'cloud://url-id' }
      expect(getCloudImageFileId(item)).toBe('cloud://url-id')
    })

    test('非 cloud:// URL 返回空字符串', () => {
      const item = { imageFileId: '', imageUrl: 'https://example.com/img.png' }
      expect(getCloudImageFileId(item)).toBe('')
    })

    test('两者都为空返回空字符串', () => {
      const item = { imageFileId: '', imageUrl: '' }
      expect(getCloudImageFileId(item)).toBe('')
    })
  })

  describe('getDirectImageUrl', () => {
    test('返回非 cloud:// 的 URL', () => {
      const item = { imageUrl: 'https://example.com/img.png' }
      expect(getDirectImageUrl(item)).toBe('https://example.com/img.png')
    })

    test('cloud:// URL 返回空字符串', () => {
      const item = { imageUrl: 'cloud://file-id' }
      expect(getDirectImageUrl(item)).toBe('')
    })

    test('空 URL 返回空字符串', () => {
      const item = { imageUrl: '' }
      expect(getDirectImageUrl(item)).toBe('')
    })
  })

  describe('resolveIngredientImageUrls', () => {
    test('无 cloud:// 文件时直接返回', async () => {
      const items = [
        { ingredientId: 'a', imageUrl: 'https://example.com/a.png' }
      ]

      const result = await resolveIngredientImageUrls(items)

      expect(result[0].imageUrl).toBe('https://example.com/a.png')
      expect(mockGetTempFileURL).not.toHaveBeenCalled()
    })

    test('有 cloud:// 文件时调用 getTempFileURL', async () => {
      mockGetTempFileURL.mockResolvedValue({
        fileList: [
          { fileID: 'cloud://f1', status: 0, tempFileURL: 'https://temp.url/f1' }
        ]
      })

      const items = [
        { ingredientId: 'a', imageFileId: 'cloud://f1', imageUrl: '' }
      ]

      const result = await resolveIngredientImageUrls(items)

      expect(result[0].imageUrl).toBe('https://temp.url/f1')
      expect(mockGetTempFileURL).toHaveBeenCalledWith({
        fileList: ['cloud://f1']
      })
    })

    test('getTempFileURL 失败时回退为空字符串', async () => {
      mockGetTempFileURL.mockRejectedValue(new Error('network error'))

      const items = [
        { ingredientId: 'a', imageFileId: 'cloud://f1', imageUrl: '' }
      ]

      const result = await resolveIngredientImageUrls(items)

      expect(result[0].imageUrl).toBe('')
    })

    test('去重 cloud file IDs', async () => {
      mockGetTempFileURL.mockResolvedValue({
        fileList: [
          { fileID: 'cloud://f1', status: 0, tempFileURL: 'https://temp.url/f1' }
        ]
      })

      const items = [
        { ingredientId: 'a', imageFileId: 'cloud://f1', imageUrl: '' },
        { ingredientId: 'b', imageFileId: 'cloud://f1', imageUrl: '' }
      ]

      await resolveIngredientImageUrls(items)

      expect(mockGetTempFileURL).toHaveBeenCalledWith({
        fileList: ['cloud://f1']
      })
    })

    test('空数组返回空数组', async () => {
      const result = await resolveIngredientImageUrls([])

      expect(result).toEqual([])
    })
  })

  describe('escapeRegExp', () => {
    test('转义特殊字符', () => {
      expect(escapeRegExp('a+b*c')).toBe('a\\+b\\*c')
    })

    test('转义括号和点', () => {
      expect(escapeRegExp('(a.b)')).toBe('\\(a\\.b\\)')
    })

    test('无特殊字符时原样返回', () => {
      expect(escapeRegExp('hello')).toBe('hello')
    })

    test('空字符串返回空字符串', () => {
      expect(escapeRegExp('')).toBe('')
    })
  })
})
