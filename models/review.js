var mongoose = require('mongoose');
var db = require('./db');
var Schema = mongoose.Schema;

var ReviewSchema = Schema({
	shop_no: Number,
	user_no: Number,
	star: Number,
	hashtag: [{hash_1: Number, hash_2: Number}]; //형우한테 물어보기
	photo_url: String,
	photo_thumbnail_url: String,
	reg_date: Date
});

var Review = db.model('Review', ReviewSchema);
module.exports = Review;