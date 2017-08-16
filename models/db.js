// models/db.js
var mongoose = require('mongoose');
var uri = 'mongodb://localhost/hairshop';
var options = {
	server: { poolSize: 100 }
};
var db = mongoose.createConnection(uri, options);

db.once('open', function(){
	console.log('mongoDB connected sucessfully');
});

db.on('error', function(){
	if(err)
	console.log('db err=', err);
});

module.exports = db;