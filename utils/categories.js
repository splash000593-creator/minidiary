const EXPENSE_CATEGORIES = [
  { name: '餐饮', icon: '🍜', color: '#F2994A' },
  { name: '交通', icon: '🚌', color: '#56CCF2' },
  { name: '购物', icon: '🛍️', color: '#BB6BD9' },
  { name: '居住', icon: '🏠', color: '#6FCF97' },
  { name: '娱乐', icon: '🎮', color: '#F2C94C' },
  { name: '医疗', icon: '💊', color: '#EB5757' },
  { name: '教育', icon: '📚', color: '#2F80ED' },
  { name: '人情', icon: '🎁', color: '#D98C5F' },
  { name: '其他', icon: '📦', color: '#BDBDBD' }
]

const INCOME_CATEGORIES = [
  { name: '工资', icon: '💰', color: '#27AE60' },
  { name: '兼职', icon: '💼', color: '#6FCF97' },
  { name: '理财', icon: '📈', color: '#2D9CDB' },
  { name: '红包', icon: '🧧', color: '#E05555' },
  { name: '其他', icon: '📦', color: '#BDBDBD' }
]

const getCategories = type => (type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES)

const getCategory = (type, name) => {
  const list = getCategories(type)
  return list.find(c => c.name === name) || { name: name || '其他', icon: '📦', color: '#BDBDBD' }
}

module.exports = {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  getCategories,
  getCategory
}