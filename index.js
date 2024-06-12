const initData = require('./initHistory')
const { connect } = require('./connectDb');
// 立即执行函数

(async () => {
  await connect();
  const links = await initData()
  console.log('stf done', links.length)
})();
