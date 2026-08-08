/**
 * 种子数据脚本：npm run db:seed
 * 插入测试分类与商品数据（已存在数据则跳过，--force 可清空重灌）
 */
const { Category, Goods, sequelize } = require('../models')

// 测试分类（按电商生鲜常见类目设计）
const categories = [
  { name: '时令水果', sort_order: 1 },
  { name: '新鲜蔬菜', sort_order: 2 },
  { name: '肉禽蛋品', sort_order: 3 },
  { name: '海鲜水产', sort_order: 4 },
  { name: '粮油副食', sort_order: 5 },
  { name: '乳品烘焙', sort_order: 6 },
]

// 测试商品（价格单位：元；图片用 picsum 占位图，开发阶段可替换为真实图片）
// [分类名, 名称, 价格, 划线价, 单位, 库存, 热销, 新品]
const goodsSeed = [
  ['时令水果', '海南金钻凤梨 1个装', 19.9, 29.9, '个', 200, true, true],
  ['时令水果', '烟台红富士苹果 5斤装', 24.8, 35.0, '5斤', 150, true, false],
  ['时令水果', '智利车厘子 2斤礼盒装', 59.9, 89.9, '2斤', 80, true, true],
  ['时令水果', '云南高山蓝莓 125g', 9.9, 15.9, '盒', 300, false, false],
  ['新鲜蔬菜', '有机上海青 500g', 5.9, 8.9, '500g', 500, true, false],
  ['新鲜蔬菜', '云南小番茄 250g', 7.9, 11.9, '250g', 400, false, false],
  ['新鲜蔬菜', '水果黄瓜 3根装', 8.8, 12.8, '3根', 350, true, false],
  ['新鲜蔬菜', '云南菌菇拼盘 400g', 16.9, 22.9, '400g', 120, false, true],
  ['肉禽蛋品', '土鸡蛋 30枚装', 29.9, 39.9, '30枚', 100, true, false],
  ['肉禽蛋品', '黑猪五花肉 500g', 25.8, 32.0, '500g', 180, true, false],
  ['肉禽蛋品', '三黄鸡 1只约1.2kg', 36.9, 46.9, '只', 90, false, false],
  ['海鲜水产', '鲜活基围虾 500g', 39.9, 52.0, '500g', 60, true, true],
  ['海鲜水产', '挪威三文鱼刺身 300g', 55.0, 68.0, '300g', 40, false, true],
  ['粮油副食', '五常大米 5kg装', 49.9, 59.9, '5kg', 200, false, false],
  ['粮油副食', '金龙鱼花生油 1.8L', 39.9, 49.9, '1.8L', 150, false, false],
  ['乳品烘焙', '鲜牛奶 950ml', 12.9, 16.9, '瓶', 300, true, false],
  ['乳品烘焙', '全麦吐司面包 400g', 15.9, 19.9, '袋', 250, false, true],
]

async function main() {
  const force = process.argv.includes('--force')

  const categoryCount = await Category.count()
  if (categoryCount > 0 && !force) {
    console.log('[种子] 分类数据已存在（共 ' + categoryCount + ' 条），跳过插入。如需重灌请使用 --force')
    await sequelize.close()
    process.exit(0)
  }

  if (force) {
    // 注意删除顺序：先清空有外键依赖的表
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0')
    await Goods.destroy({ where: {} })
    await Category.destroy({ where: {} })
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1')
    console.log('[种子] 已清空旧数据')
  }

  // 插入分类，建立 分类名 -> id 映射
  const createdCategories = await Category.bulkCreate(categories)
  const categoryMap = {}
  createdCategories.forEach((c) => {
    categoryMap[c.name] = c.id
  })
  console.log(`[种子] 已插入 ${createdCategories.length} 个分类`)

  // 插入商品
  // 图片使用本地静态资源（server/public/images/goods-N.jpg，与商品名对应的真实图片），
  // 相对路径由前端 request.js 自动拼接 API 地址，真机预览时无需改图片
  const goodsList = goodsSeed.map(([categoryName, name, price, originalPrice, unit, stock, isHot, isNew], i) => ({
    category_id: categoryMap[categoryName],
    name,
    price,
    original_price: originalPrice,
    unit,
    stock,
    is_hot: isHot,
    is_new: isNew,
    sales: Math.floor(Math.random() * 500) + 10, // 随机初始销量
    image: `/images/goods-${i + 1}.jpg`,
    images: JSON.stringify([`/images/goods-${i + 1}.jpg`]),
    detail: `<p>${name}，产地直采，新鲜到家。</p><p><img src="/images/goods-${i + 1}.jpg" /></p>`,
  }))
  await Goods.bulkCreate(goodsList)
  console.log(`[种子] 已插入 ${goodsList.length} 个商品`)

  console.log('[种子] 完成')
  await sequelize.close()
  process.exit(0)
}

main().catch((err) => {
  console.error('[种子] 失败：', err)
  process.exit(1)
})
