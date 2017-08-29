var request = require('request');
var express = require('express');
var router = express.Router();
var Hairshop = require('../models/hairshop');
var Reservation = require('../models/reservation');
var User = require('../models/user');
var formidable = require('formidable');
var AWS = require('aws-sdk');
var s3 = new AWS.S3();
var gm = require('gm');
var mime = require('mime');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', {title: '남자들의 헤어#'});
});

//테스트화면
router.get('/home', function(req, res, next){
   //res.render('home', {title: 'Home'});

   Hairshop.find({}, function(err, docs){
      res.json({
         success_code:1,
         shop_lists: docs
      });
   });
});

//5. 가격 현위치 기반 헤어샵과 간단정보 한개 조회
router.get('/search_loc/:min/:max', function(req, res, next){
   var min = req.params.min;
   var max = req.params.max;

   req.checkParams('min').isInt();
   req.checkParams('max').isInt();

   var errors = req.validationErrors();

   if(!errors){
      Hairshop.find({"price.cut":{"$gte":min, "$lt":max}}, "shop_no shop_name address latitude longitude price.cut", function(err, lists){
         if(lists.length){//검색된 헤어샵 있을 때
            console.log("*****searched shoplists=", lists);
            //console.log("첫번째 인덱스 샵", lists[0].shop_no);

            Hairshop.findOne({shop_no:lists[0].shop_no}, function(err, hairdoc){
               console.log('!!!!!!!!!first doc=', hairdoc);
                //res.json({hairdoc:hairdoc});
               Reservation.count({shop_no:lists[0].shop_no, rv_posted:true, rv_del:false}, function(err, revdoc){
                   //console.log('리뷰개수= ', revdoc);
                  var shop_info = {
                     shop_no: hairdoc.shop_no,
                     shop_name: hairdoc.shop_name,
                     star_score: hairdoc.star_score,
                     rev_cnt: revdoc,
                     shoppic_url: hairdoc.shoppic_url
                  }

                  if(req.session.email) { //로그인
                     User.findOne({email:req.session.email}, "favorite",function(err, userdoc){
                        var flag = userdoc.favorite.indexOf(lists[0].shop_no); //user의 favorite에 해당 샵이 있는지 검사

                        if(flag!=-1){//존재
                           res.json({success_code: 1,
                              search_list: lists,
                              shop_info: shop_info,
                              message: "관심샵에 추가된 헤어샵입니다."});
                        }
                        else{ //존재X
                           res.json({success_code: 1,
                              search_list:lists,
                              shop_info: shop_info,
                              message: "관심샵에 없는 헤어샵입니다."});
                         }
                     });
                  }
                  else { //비회원
                     res.json({success_code: 1,
                        search_list: lists,
                        shop_info: shop_info,
                        message: "비회원입니다."});
                   }
                });
             });
         }
         else{ //검색된 헤어샵 없음
            res.json({success_code:2, message:"해당 가격대 헤어샵 없음"});
         }
      });
   }
   else{
      return res.json({success_code: 0, message: "invalid params"});
   }
});

//6. 역 기반 헤어샵 조회
router.get('/search_st/:station', function(req, res, next){
   var station = req.params.station;

      Hairshop.find({station: station}, "shop_name address latitude longitude station price.cut", function(err, lists){
         console.log("shoplists=", lists);
         res.json({search_lists:lists});
      });
});

//8.헤어샵 상세정보 조회 http://localhost/namshop/shoplists/1
//하트, 리뷰개수, 별점
router.get('/shoplists/:shop_no', function(req, res, next){
   var shop_no = req.params.shop_no;
   req.checkParams('shop_no').isInt();

   var errors = req.validationErrors();

   if(!errors){
      Hairshop.findOne({shop_no:shop_no}, "address latitude longitude business_hour station tel  hairpic_thumbnail_url hairpic_url price", function(err, shop_data){
         console.log("****shop data=", shop_data);

         Reservation.find({shop_no:shop_no, rv_del:false, rv_posted:true},"review", function(err, rev_data){

            //console.log("**rev data len=", rev_data.length);
            //console.log("***************shop's review data=", rev_data)
            var shop_no = req.params.shop_no;
            req.checkParams('shop_no').isInt();

            var errors = req.validationErrors();
            console.log('shop_no=',shop_no);

            Hairshop.findOne({shop_no:shop_no}, function(err, hairdoc){
               console.log('!!!!!!!!!doc=', hairdoc);
               //res.json({hairdoc:hairdoc});
               Reservation.count({shop_no:shop_no, rv_posted:true, rv_del:false}, function(err, revdoc){
                  //console.log('리뷰개수= ', revdoc);
                  var shop_info = {
                     shop_no: hairdoc.shop_no,
                     shop_name: hairdoc.shop_name,
                     star_score: hairdoc.star_score,
                     rev_cnt: revdoc,
                     shoppic_url: hairdoc.shoppic_url
                  }

                  if(req.session.email) { //로그인
                     User.findOne({email:req.session.email}, "favorite",function(err, userdoc){
                        var flag = userdoc.favorite.indexOf(shop_no); //user의 favorite에 해당 샵이 있는지 검사

                        if(flag!=-1){//존재
                           res.json({success_code: 1,
                              shop_info: shop_info,
                              shop_data:shop_data,
                              rev_data:rev_data,
                              message: "관심샵에 추가된 헤어샵입니다."});
                        }
                        else{ //존재X
                           res.json({success_code: 1,
                              shop_info: shop_info,
                              shop_data:shop_data,
                              rev_data:rev_data,
                              message: "관심샵에 없는 헤어샵입니다."});
                        }
                     });
                  }
                  else { //비회원
                     res.json({success_code: 1,
                        shop_info: shop_info,
                        shop_data:shop_data,
                        rev_data:rev_data,
                        message: "비회원입니다."});
                  }
               });
            });
         });
      });
   }
   else{
      return res.json({success_code: 0, message: "invalid params"});
   }
});

//9.헤어샵 전화하기
router.get('/shoplists/:shop_no/tel', function(req, res, next){
   var shop_no = req.params.shop_n

   Hairshop.findOne({shop_no:shop_no}, function(err, doc){
      if(err) res.json({success_code: 0});
      res.json({success_code:1, tel:doc.tel});
   });
});

//10.헤어샵 예약하기
// localhost/namshop/shoplists/1/res/2/2017-09-20
router.post('/shoplists/:shop_no/res/:user_no/:date', function(req, res, next){
   var shop_no = req.params.shop_no;
   var user_no = req.params.user_no;
   var date = req.params.date;

   Hairshop.findOne({shop_no: shop_no}, function(err, shop_data){
      var name = shop_data.shop_name;
      var address = shop_data.address;
      var res_data = {
         user_no: user_no,
         shop_no: shop_no,
         shop_name: name,
         address: address,
         res_date: date
      };

      var reservate = new Reservation(res_data);
      reservate.save(function(err, doc){
         console.log('doc=', doc);
         res.json({success_code: 1, result:doc});
       });
   });
});

//16.관심샵 등록/삭제
router.post('/shoplists/:shop_no/favorite/:user_no', function(req, res, next){
   var shop_no = req.params.shop_no;
   var user_no = req.params.user_no;

   User.findOne({user_no:user_no}, function(err, doc){
      if(err) res.json({success_code: 0});
      console.log('***favorite hairshop=', doc);
      var a = doc.favorite.indexOf(shop_no);
      if(a == -1) {
         User.findOneAndUpdate({user_no:user_no}, {$push: {"favorite": shop_no}}, function(err, doc){
               res.json({success_code: 1, message:"관심샵에 등록되었습니다."});
         });
      } else {
         User.findOneAndUpdate({user_no:user_no}, {$pull: {"favorite": shop_no}}, function(err, doc){
               res.json({success_code: 1, message:"관심샵에서 삭제되었습니다."});
         });
      }
   });
});

//21.헤어샵 간단정보 조회(수정)
router.get('/search_info/:shop_no', function(req, res, next){
   var shop_no = req.params.shop_no;
   req.checkParams('shop_no').isInt();

   var errors = req.validationErrors();
   console.log('shop_no=',shop_no);
   if(!errors){
      Hairshop.findOne({shop_no:shop_no}, function(err, hairdoc){
         console.log('!!!!!!!!!doc=', hairdoc);
         //res.json({hairdoc:hairdoc});
         Reservation.count({shop_no:shop_no, rv_posted:true, rv_del:false}, function(err, revdoc){
            //console.log('리뷰개수= ', revdoc);
            var shop_info = {
               shop_no: hairdoc.shop_no,
               shop_name: hairdoc.shop_name,
               star_score: hairdoc.star_score,
               rev_cnt: revdoc,
               shoppic_url: hairdoc.shoppic_url
            }

            if(req.session.email) { //로그인
               User.findOne({email:req.session.email}, "favorite",function(err, userdoc){
                  var flag = userdoc.favorite.indexOf(shop_no); //user의 favorite에 해당 샵이 있는지 검사

                  if(flag!=-1){//존재
                     res.json({success_code: 1,
                        shop_info: shop_info,
                        message: "관심샵에 추가된 헤어샵입니다."});
                  }
                  else{ //존재X
                     res.json({success_code: 1,
                        shop_info: shop_info,
                        message: "관심샵에 없는 헤어샵입니다."});
                  }
               });
            }
            else { //비회원
               res.json({success_code: 1,
                  shop_info: shop_info,
                  message: "비회원입니다."});
            }
         });
      });
   }
   else{
      return res.json({success_code: 0, message: "invalid params"});
   }
});



/////////////////////////////////////////////////////////////////////
//////////////////////hairshop DB 저장페이지 <1>/////////////////////
/////////////////////////////////////////////////////////////////////
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

                           s3.upload(data, function(err, thumbdata){
                              console.log("done");
                              Hairshop.update({shop_name:fields.shop_name}, {$push: {"hairpic_thumbnail_url": thumbdata.Location}}, function(err, docs){
                                 if(err) console.log('err=', err);
                                 console.log(docs);
                                 //res.json({docs});
                              });
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


/////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////dummyserver!!
/////////////////////////////////////////////////////////////////////
router.get('/dummyhome', function(req, res, next){
   res.json({  success_code:1,
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
});
module.exports = router;
