var request = require('request');
var express = require('express');
var router = express.Router();
var Hairshop = require('../models/hairshop');
var formidable = require('formidable');
var AWS = require('aws-sdk');
var s3 = new AWS.S3();
var gm = require('gm');
var mime = require('mime');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', {title: '남자들의 헤어#'});
});

router.get('/dummyhome', function(req, res, next){
   res.json({  successcode:1,
      shoplists:[{
         shop_name: "제오헤어",
         address: "서울특별시 관악구 남부순환로 1600",
         latitude: 37.483684,
         longitude: 126.928521,
         station: "신림",
         business_hour: "평일 10:30~21:30 주말 10:00~21:00" ,
         tel: "02-877-3591",
         price: [{cut:25000, color:59500, perm:112000}],
         shoppic_url: "https://s3.ap-northeast-2.amazonaws.com/namshop/%EC%8B%A0%EB%A6%BC%EB%9D%BC%EB%B9%88%ED%97%A4%EC%96%B4_%EC%8B%9C%EC%84%A4.JPG",
         hairpic_url : [
             "https://s3.ap-northeast-2.amazonaws.com/namshop/%EC%8B%A0%EB%A6%BC%EB%9D%BC%EB%B9%88%ED%97%A4%EC%96%B4_1.JPG",
             "https://s3.ap-northeast-2.amazonaws.com/namshop/%EC%8B%A0%EB%A6%BC%EB%9D%BC%EB%B9%88%ED%97%A4%EC%96%B4_2.JPG",
             "https://s3.ap-northeast-2.amazonaws.com/namshop/%EC%8B%A0%EB%A6%BC%EB%9D%BC%EB%B9%88%ED%97%A4%EC%96%B4_3.JPG"
         ],
         hairpic_thumbnail_url: [
             "https://s3.ap-northeast-2.amazonaws.com/namshop/1503031836878.jpg",
             "https://s3.ap-northeast-2.amazonaws.com/namshop/1503031845329.jpg",
             "https://s3.ap-northeast-2.amazonaws.com/namshop/1503031853748.jpg"],
         review: [{review_no:1, nickname:"진영", star_score:5, Date:"2017-08-09", hashtag:{hash1:"#좋아요", hash2:"#좋아요", hash3:"#재방문"}},
         {review_no:2, nickname:"형우", star_score:3, Date:"2017-08-10", hashtag:{hash1:"#좋아요", hash2:"#뚝배기", hash3:"#깨졌다"}},
         {review_no:3, nickname:"종형", star_score:3, Date:"2017-08-12", hashtag:{hash1:"#좋아요", hash2:"#뚝배기", hash3:"#깨졌다"}}],
         hash_rank: [{"rank1": "#친절한", "rank2": "#재방문", "rank3": "#무난한", "rank4": "#만족"}]
   },
   {
         shop_name: "라빈헤어",
         address: "서울특별시 관악구 남부순환로 1590 2층, 신림역 4번출구 근처",
         latitude: 37.483636,
         longitude: 126.927342,
         station: "신림",
         business_hour: "화~토 11:00~03:00 일,월 15:00~03:00" ,
         tel: "010-4891-7975",
         price: [{cut:20000, color:60000, perm:30000}],
         shoppic_url: "https://s3.ap-northeast-2.amazonaws.com/namshop/%EC%8B%A0%EB%A6%BC%EB%9D%BC%EB%B9%88%ED%97%A4%EC%96%B4_%EC%8B%9C%EC%84%A4.JPG",
         hairpic_url : [
            "https://s3.ap-northeast-2.amazonaws.com/namshop/%EC%8B%A0%EB%A6%BC%EB%9D%BC%EB%B9%88%ED%97%A4%EC%96%B4_1.JPG",
            "https://s3.ap-northeast-2.amazonaws.com/namshop/%EC%8B%A0%EB%A6%BC%EB%9D%BC%EB%B9%88%ED%97%A4%EC%96%B4_2.JPG",
            "https://s3.ap-northeast-2.amazonaws.com/namshop/%EC%8B%A0%EB%A6%BC%EB%9D%BC%EB%B9%88%ED%97%A4%EC%96%B4_3.JPG"
         ],
         hairpic_thumbnail_url: [
             "https://s3.ap-northeast-2.amazonaws.com/namshop/1503031836878.jpg",
             "https://s3.ap-northeast-2.amazonaws.com/namshop/1503031845329.jpg",
             "https://s3.ap-northeast-2.amazonaws.com/namshop/1503031853748.jpg"],
         review: [{review_no:1, nickname:"진영", star_score:5, Date:"2017-08-09", hashtag:{hash1:"#좋아요", hash2:"#좋아요", hash3:"#재방문"}},
         {review_no:2, nickname:"형우", star_score:3, Date:"2017-08-10", hashtag:{hash1:"#좋아요", hash2:"#뚝배기", hash3:"#깨졌다"}},
         {review_no:3, nickname:"종형", star_score:3, Date:"2017-08-12", hashtag:{hash1:"#좋아요", hash2:"#뚝배기", hash3:"#깨졌다"}}],
         hash_rank: [{"rank1": "#친절한", "rank2": "#재방문", "rank3": "#무난한", "rank4": "#만족"}]
   }
   ]});
})

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
      var tmp_img;

      form.parse(req, function(err, fields, files) { //fields는 file제외한 나머지
         //console.log('fields=', fields);
         //console.log('files=', files);
         var params = {
            Bucket: 'namshop',
            Key: files.userfile.name,
            ACL:'public-read',
            Body: require('fs').createReadStream(files.userfile.path)
         };
         console.log('params= ', params);

      Hairshop.findOne({shop_name:fields.shop_name}, function(err, shopdata){
         if(shopdata){
               s3.upload(params, function(err, data) {
                  if(err) {
                     console.log('err=', err);
                  }
                  else {
                     //console.log('데이터: ', data);
                     tmp_img = data.Location;
                     console.log('tempimg=', tmp_img);

                     Hairshop.update({shop_name:fields.shop_name}, {$push: {"hairpic_url": tmp_img}}, function(err, docs){
                        if(err) console.log('err=', err);
                        console.log(docs);
                        //res.json({docs});
                     });
                     var thumbnail = Date.now().toString() + ".jpg";
                     console.log('thumb=', thumbnail);
                     console.log('url=', tmp_img);

                     gm(request(tmp_img), thumbnail).resize(294,294).stream(function(err, stdout, stderr){
                           var data = {
                              Bucket: 'namshop',
                              Key: thumbnail,
                              ACL:'public-read',
                              Body: stdout,
                              ContentType: mime.lookup(thumbnail)
                           };

                           s3.upload(data, function(err, res){
                              console.log("done");
                           });
                     });
                     res.send('<script>alert("추가 이미지 업로드 성공");location.href="/namshop"</script>');
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
