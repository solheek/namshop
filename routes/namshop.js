var express = require('express');
var router = express.Router();
var Hairshop = require('../models/hairshop');
var formidable = require('formidable');
var AWS = require('aws-sdk');
var s3 = new AWS.S3();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', {title: '남자들의 헤어#'});
});

//첫화면
router.get('/home', function(req, res, next){
   //res.render('home', {title: 'Home'});
   Hairshop.find({}, function(err, docs){
      res.json({
         successcode:1,
         shoplists: docs
      });
   });
});

/////////////////////////////////////////////////////////////////////
//hairshop DB 저장페이지 <1>
router.get('/load', function(req, res, next) {
  res.render('loadpage', {title: 'Hairshop DB loading page'});
});

router.post('/load', function(req, res, next){
      var form = new formidable.IncomingForm();
      form.parse(req, function(err, fields, files) { //fields는 file제외한 나머지
         console.log('files=', files);
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
               var shop_data = new Hairshop({
                  shop_name: fields.shop_name,
                  address: fields.address,
                  latitude: fields.latitude,
                  longitude: fields.longitude,
                  station: fields.station,
                  business_hour: fields.business_hour,
                  tel: fields.tel,
                  price : price_data,
                  shoppic_url: data.Location
               });
               shop_data.save(function(err, row) {
                  if(err) return next(err);
                  console.log(row);
                  //res.send({row});
                  res.send('<script>alert("DB 업로드 성공");location.href="/namshop"</script>');
               });
            }
         });
   });
});

//hairshop DB 저장페이지 <2>
router.get('/load_imgonly', function(req, res, next) {
  res.render('loadpage_2', {title: 'Hairshop DB loading page(image only)'});
});

router.post('/load_imgonly', function(req, res, next){
      var form = new formidable.IncomingForm();

      form.parse(req, function(err, fields, files) { //fields는 file제외한 나머지
         console.log('fields=', fields);
         console.log('files=', files);
         var params = {
            Bucket: 'namshop',
            Key: files.userfile.name,
            ACL:'public-read',
            Body: require('fs').createReadStream(files.userfile.path)
         };

      Hairshop.findOne({shop_name:fields.shop_name}, function(err, shopdata){
         if(shopdata){
               s3.upload(params, function(err, data) {
                  if(err) {
                     console.log('err=', err);
                  }
                  else {
                     var tmp_img = data.Location;

                     Hairshop.update({shop_name:fields.shop_name}, {$push: {"hairpic_url": tmp_img}}, function(err, docs){
                        if(err) console.log('err=', err);
                        console.log(docs);
                        //res.json({docs});
                        res.send('<script>alert("추가 이미지 업로드 성공");location.href="/namshop"</script>');
                     });
                  }
            });
         }
         else{
            res.send('<script>alert("해당하는 헤어샵 없음");location.href="/namshop/load_imgonly"</script>');
         }
      });
   });
});
module.exports = router;
