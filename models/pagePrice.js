const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// 单个价格
const PagePrice = new Schema({
  link: String, // 链接地址
  title: String, // 链接名称
  majorName: String, //归属主类
  time: { type: String, default: +new Date() }, // 发布时间
  priceInfo: {
    tableList: Array,
    lineList: Array
  }
});

module.exports = mongoose.model('pagePrice', PagePrice);