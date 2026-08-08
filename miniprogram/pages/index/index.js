/**
 * 首页：搜索栏 + 轮播图 + 分类九宫格 + 热销横向滚动 + 商品瀑布流
 */
const { get } = require('../../utils/request')

const PAGE_SIZE = 10

Page({
  data: {
    keyword: '',          // 搜索关键词
    banners: [],          // 轮播图（取热销商品图）
    categories: [],       // 分类九宫格
    hotGoods: [],         // 热销商品（横向滚动）
    leftList: [],         // 瀑布流左列
    rightList: [],        // 瀑布流右列
    page: 1,
    hasMore: true,
    loading: false,       // 加载中标记，防止重复请求
    ready: false,         // 首屏是否加载完成（控制空态展示）
  },

  onLoad() {
    this.loadCategories()
    this.loadHot()
    this.loadGoods(true)
  },

  // ===== 数据加载 =====

  // 分类九宫格
  async loadCategories() {
    try {
      const categories = await get('/api/categories')
      // 九宫格展示前 8 个分类；暂无图标，用分类名首字占位
      const list = categories.slice(0, 8).map((c) => ({
        ...c,
        iconChar: c.name.charAt(0),
      }))
      this.setData({ categories: list })
    } catch (e) {
      // request.js 已统一提示
    }
  },

  // 热销商品（同时作轮播推荐位）
  async loadHot() {
    try {
      const hotGoods = await get('/api/goods/hot')
      this.setData({
        hotGoods,
        banners: hotGoods.slice(0, 3).map((g) => ({ id: g.id, image: g.image })),
      })
    } catch (e) {
      /* 忽略 */
    }
  },

  // 瀑布流商品列表（reset 为 true 时重新加载第一页）
  async loadGoods(reset = false) {
    if (this.data.loading) return
    const page = reset ? 1 : this.data.page
    this.setData({ loading: true })

    try {
      const data = await get('/api/goods', { page, page_size: PAGE_SIZE })
      // 按奇偶拆分左右列，形成瀑布流
      const split = (list) =>
        list.reduce(
          (acc, item, i) => {
            acc[i % 2].push(item)
            return acc
          },
          [[], []]
        )
      const [left, right] = split(data.list)

      this.setData({
        leftList: reset ? left : [...this.data.leftList, ...left],
        rightList: reset ? right : [...this.data.rightList, ...right],
        page: page + 1,
        hasMore: data.hasMore,
        ready: true,
      })
    } catch (e) {
      /* 已统一提示 */
    } finally {
      this.setData({ loading: false })
      wx.stopPullDownRefresh()
    }
  },

  // ===== 事件 =====

  // 搜索框输入
  onKeywordInput(e) {
    this.setData({ keyword: e.detail.value })
  },

  // 搜索/回车：跳分类页并传关键词
  onSearch() {
    const keyword = this.data.keyword.trim()
    wx.navigateTo({
      url: `/pages/category/category?keyword=${encodeURIComponent(keyword)}`,
    })
  },

  // 分类入口点击：跳分类页并选中该分类
  onCategoryTap(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({ url: `/pages/category/category?categoryId=${id}` })
  },

  // 轮播图点击：跳商品详情
  onBannerTap(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({ url: `/pages/goods-detail/goods-detail?id=${id}` })
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadCategories()
    this.loadHot()
    this.loadGoods(true)
  },

  // 上拉加载更多
  onReachBottom() {
    if (this.data.hasMore) {
      this.loadGoods(false)
    }
  },
})
