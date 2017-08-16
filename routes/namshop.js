var express = require('express');
var router = express.Router();
var Hairshop = require('../models/hairshop');
var formidable = require('formidable');
var AWS = require('aws-sdk');
var s3 = new AWS.S3();
/* GET home page. */
router.get('/', function(req, res, next) {
  res.send('test page');
});

//hairshop DB 저장페이지
router.get('/load', function(req, res, next) {
  res.render('loadpage', {title: 'Hairshop DB loading page'});
});

router.post('/upload', function(req, res, next){
      var form = new formidable.IncomingForm();
      form.parse(req, function(err, fields, files) { //fields는 file제외한 나머지
         console.log('files=', files)
         var params = {
            Bucket: 'namshop',
            Key: files.userfile.name,
            ACL:'public-read',
            Body: require('fs').createReadStream(files.userfile.path)
         };
         s3.upload(params, function(err, data) {
            if(err) {
               console.log('err=', err);
            }
            else {
               var price_data = {
                     cut: fields.price_cut,
                     color: fields.price_color,
                     perm: fields.price_perm
               }
               var hair_data = new Hairshop({
                  shop_name: fields.shop_name,
                  address: fields.address,
                  station: fields.station,
                  business_hour: fields.business_hour,
                  tel: fields.tel,
                  $push: { price : price_data }, //배열은 push로
                  shoppic_url: data.Location
               });
               hair_data.save(function(err, row) {
                  if(err) return next(err);
                  console.log(row);
                  res.json({row});
               });
            }
         });
   });
});

module.exports = router;
