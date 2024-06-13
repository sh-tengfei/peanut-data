const initData = require('./initHistory')
const { connect } = require('./utils/connectDb');
const linkModel = require('./models/pagePrice');
// 立即执行函数

(async () => {
  await connect();
  const link = await linkModel.find({})
  if (!link.length) {
    const links = await initData()
    console.log('stf done', links.length)
  }
})();
