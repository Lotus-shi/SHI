/**
 * 分类页：左侧分类列表 + 右侧对应商品网格
 * 支持两种进入方式：
 *   categoryId=xx  从首页九宫格进入，选中指定分类
 *   keyword=xx     从首页搜索进入，显示搜索结果
 */
const { get } = require('../../utils/request')

const PAGE_SIZE = 10

Page({
  data: {
    categories: [],
    activeCategoryId: 0,   // 当前选中分类（0 表示全部）
    keyword: '',           // 搜索关键词（非空时进入搜索模式）
    goodsList: [],
    page: 1,
    hasMore: true,
    loading: false,
    ready: false,
  },

  onLoad(options) {
    const keyword = decodeURIComponent(options.keyword || '')
    const categoryId = parseInt(options.categoryId) || 0
    this.setData({ keyword, activeCategoryId: categoryId })
    this.loadCategories()
    this.loadGoods(true)
  },

  // 左侧分类列表
  async loadCategories() {
    try {
      const categories = await get('/api/categories')
      this.setData({ categories })
      // 未指定分类时默认选中第一个
      if (!this.data.activeCategoryId && categories.length) {
        this.setData({ activeCategoryId: categories[0].id })
        this.loadGoods(true)
      }
    } catch (e) {
      /* 已统一提示 */
    }
  },

  // 加载商品（reset 重新加载第一页）
  async loadGoods(reset = false) {
    if (this.data.loading) return
    const page = reset ? 1 : this.data.page
    this.setData({ loading: true })

    try {
      const params = { page, page_size: PAGE_SIZE }
      // 搜索模式传 keyword，否则按分类过滤
      if (this.data.keyword) {
        params.keyword = this.data.keyword
      } else {
        params.category_id = this.data.activeCategoryId
      }
      const data = await get('/api/goods', params)

      this.setData({
        goodsList: reset ? data.list : [...this.data.goodsList, ...data.list],
        page: page + 1,
        hasMore: data.hasMore,
        ready: true,
      })
    } catch (e) {
      /* 已统一提示 */
    } finally {
      this.setData({ loading: false })
    }
  },

  // 切换左侧分类
  onCategoryTap(e) {
    const { id } = e.currentTarget.dataset
    if (id === this.data.activeCategoryId) return
    this.setData({ activeCategoryId: id, keyword: '' })
    this.loadGoods(true)
  },

  // 右侧滚动到底部加载更多
  onScrollToLower() {
    if (this.data.hasMore) {
      this.loadGoods(false)
    }
  },
})
