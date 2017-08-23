var mongoose = require('mongoose');
var db = require('./db');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

var ReviewSchema = Schema({
	star: {type: Number, default: 0},
	hashtag: [Number],
	photo_url: String,
	photo_thumbnail_url: String,
	reg_date: String
});

var Review = db.model('Review', ReviewSchema);
module.exports = {ReviewSchema: ReviewSchema, Review: Review};