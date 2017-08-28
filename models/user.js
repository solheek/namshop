var mongoose = require('mongoose');
var db = require('./db');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;
var ReviewSchema = require('./review').ReviewSchema;

var autoIncrement = require('mongoose-auto-increment');
autoIncrement.initialize(db);

var UserSchema = new Schema({
   pw: String,
   email: String,
   nickname: String,
   facebook_token: String,
   kakao_token: String,
   stamp: Number,
   userpic_url: String,
   favorite : [Number]
});

//USER_NO: PK
UserSchema.plugin(autoIncrement.plugin, { model: 'User', field: 'user_no', startAt: 1, incrementBy: 1});

var User = db.model('User', UserSchema);
module.exports = User;