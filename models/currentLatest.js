const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// 当日最新
const CurrentLatest = new Schema({
  link: String, // 链接地址
  title: String, // 链接名称
  majorName: String, //归属主类
  majorId: Number, //主类id
  publicTime: { type: String, default: +new Date() }, // 发布时间
  priceInfo: {
    tableList: Array,
    lineList: Array
  }
}, { versionKey:false });

module.exports = mongoose.model('currentLatest', CurrentLatest);