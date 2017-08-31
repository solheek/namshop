var mongoose = require('mongoose');
var db = require('./db');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;
var ReviewSchema = require('./review').ReviewSchema;

//shop_no 자동증가기능
var autoIncrement = require('mongoose-auto-increment');
autoIncrement.initialize(db);

var HairshopSchema = Schema({
	shop_name: String,
	address: String,
	latitude: Number,
	longitude: Number,
	station: String,
	business_hour: String,
	tel: String,
	price: [{cut:Number, color:Number, perm:Number}],
	shoppic_url: String,
	hairpic_url: [String],
	hairpic_thumbnail_url: [String],
	star_score: {type:Number, default:0}
});

//SHOP_NO: PK
HairshopSchema.plugin(autoIncrement.plugin, { model: 'Hairshop', field: 'shop_no', startAt: 1, incrementBy: 1});

var Hairshop = db.model('Hairshop', HairshopSchema);

module.exports = Hairshop;
