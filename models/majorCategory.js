const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// 主类
const MajorCategory = new Schema({
  name: String, // 主类名称
  id: Number, //主类id
  more: String, // 主类链接
}, { versionKey:false });

module.exports = mongoose.model('majorCategory', MajorCategory);