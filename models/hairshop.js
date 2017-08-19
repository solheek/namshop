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
	hash_cnt: [{1: {type: Number, default: 0},
				2: {type: Number, default: 0},
				3: {type: Number, default: 0},
				4: {type: Number, default: 0},
				5: {type: Number, default: 0},
				6: {type: Number, default: 0},
				7: {type: Number, default: 0},
				8: {type: Number, default: 0}}],
	hash_rank: [{1: {type: Number, default: 0},
				 2: {type: Number, default: 0},
				 3: {type: Number, default: 0},
				 4: {type: Number, default: 0}}]
});

//SHOP_NO: PK
HairshopSchema.plugin(autoIncrement.plugin, { model: 'Hairshop', field: 'shop_no', startAt: 1, incrementBy: 1});

var Hairshop = db.model('Hairshop', HairshopSchema);

module.exports = Hairshop;
