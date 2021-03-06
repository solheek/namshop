var mongoose = require('mongoose');
var db = require('./db');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;
var ReviewSchema = require('./review').ReviewSchema;

var autoIncrement = require('mongoose-auto-increment');
autoIncrement.initialize(db);

var ReservationSchema = Schema({
	user_no: Number,
	shop_no: Number,
	shop_name: String,
	address: String,
	res_date: String,
	rv_posted: {type:Boolean, default: false},
	review: ReviewSchema,
	rv_del: {type: Boolean, default: false}
});

//RES_NO: PK
ReservationSchema.plugin(autoIncrement.plugin, { model: 'Reservation', field: 'res_no', startAt: 1, incrementBy: 1});

var Reservation = db.model('Reservation', ReservationSchema);

module.exports = Reservation;
