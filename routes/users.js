var request = require('request');
var express = require('express');
var router = express.Router();
var Hairshop = require('../models/hairshop');
var Reservation = require('../models/reservation');
var ReviewSchema = require('../models/review').ReviewSchema;
var User = require('../models/user');
var bcrypt = require('bcrypt-node');
var formidable = require('formidable');
var AWS = require('aws-sdk');
var s3 = new AWS.S3();
var gm = require('gm');
var mime = require('mime');

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

router.get('/join', function(req, res, next) {
  res.render('users/join', {title: '회원가입'});
});

//1. 회원가입
router.post('/join', function(req, res, next){
   console.log('req.body=', req.body);
   var email = req.body.email;
   var pw = req.body.pw;

       User.findOne({email:email}, function(err,doc){
                if(err) res.json('join err=',err);
                console.log('join doc=',doc);
                if(doc)
                   res.json({success_code: 0}); //중복일때
                else{
                   var hash = bcrypt.hashSync(pw);
                   var nickname = email.split('@')[0];
                   var data = {
                      pw:hash,
                      email:email,
                      nickname: nickname,
                      stamp:5
                   };

                   var user = new User(data);

                   user.save(function(err,doc){
                      console.log('doc=',doc);
                      //success_code만 보내주면 됨
                      res.json({success_code: 1});
                      //res.json({success_code: 1, result:doc});
                    });
                }
     });
});


//2.로그인
router.post('/login',function(req,res,next){
   console.log('req.body=',req.body);
   var email = req.body.email;
   var pw = req.body.pw;

    User.findOne({email:email},function(err,doc){
       if(err) console.log('err', err);
       console.log('doc=',doc);

       if(doc != null){	//email이 존재할때만
	      var same = bcrypt.compareSync(pw, doc.pw);
	      if(same){
	         req.session.email = email;
	         res.json({ //email있고 로그인 됐을때
	             success_code : 1,
	             result: {
	             user_no: doc.user_no,
	             email: doc.email,
	             nickname: doc.nickname
	             }
	         });
	      }
	      else {
	         res.json({success_code : 0}); //비밀번호 틀렸을때
	      }
		}
		else{
			res.json({success_code : 2}); //email이 없을때
		}
    });
});

//12. 예약 내역 조회
router.get('/:user_no/res_list', function(req, res, next) {
	//예약테이블에서 회원번호로 예약리스트 찾아서 JSON으로 보내주기.
	var user_no = req.params.user_no;

	Reservation.find({user_no: user_no},"res_no name address res_date" ,function(err, lists){
	   console.log("reservation list=", lists);
	   res.json({res_list:lists});
	});
});

//리뷰작성 폼
//http://localhost/users/2/res_list/1/write
router.get('/:user_no/res_list/:res_no/write', function(req, res, next) {
	res.render('users/write_review', { title: '리뷰쓰기',
		user_no:req.params.user_no,
		res_no:req.params.res_no
	});
});

//13. 헤어샵 리뷰 작성하기
router.post('/:user_no/res_list/:res_no/write', function(req, res, next) {
	//예약테이블에서 예약번호로 해당 row찾아서 리뷰컬럼 업뎃
	var form = new formidable.IncomingForm();
	var res_no = req.params.res_no;
	var user_no = req.params.user_no;

	   form.parse(req, function(err, fields, files) {
	      //console.log('fields=', fields);
	      //console.log('files=', files);
	      var params = {
	         Bucket: 'namshop',
	         Key: files.userfile.name,
	         ACL:'public-read',
	         Body: require('fs').createReadStream(files.userfile.path)
	      };
	      console.log('params= ', params);

	   Reservation.findOne({res_no:res_no}, function(err, resdata){
	      if(resdata){
	            s3.upload(params, function(err, data) {
	               if(err) {
	                  console.log('err=', err);
	               }
	               else {
	                  //console.log('데이터: ', data);
	                  tmp_img = data.Location;
	                  console.log('tmp_img=', tmp_img);

	                  var thumbnail = Date.now().toString() + ".jpg";
	                  console.log('thumb=', thumbnail);
	                  console.log('url=', tmp_img);

	                  gm(request(tmp_img), thumbnail).resize(111,111).stream(function(err, stdout, stderr){
	                        var data = {
	                           Bucket: 'namshop',
	                           Key: thumbnail,
	                           ACL:'public-read',
	                           Body: stdout,
	                           ContentType: mime.lookup(thumbnail)
	                        };

	                        s3.upload(data, function(err, thumbdata){
	                           console.log("done");

	                           var review_data = {
	                           		star: fields.star,
	                          		hashtag: [fields.hash_1, fields.hash_2],
	                          		photo_url: tmp_img,
	                          		photo_thumbnail_url:thumbdata.Location,
	                          		reg_date: fields.reg_date
	                           }

	                           //예약번호 찾아서 해당테이블에 리뷰 넣어줌
	                           Reservation.findOneAndUpdate({res_no:res_no}, {review: review_data, rv_posted:true}, function(err, revdoc){
	                               if(err) console.log('err=', err);
	                               console.log('*******uploading review=', revdoc);
	                               //리뷰 작성한 유저찾아서 스탬프 5개줌
	                               User.update({user_no:user_no},{$inc:{stamp: 5}}, function(err, userdoc){
	                               		if(err) console.log('err=', err);
	                               		console.log('********increasing stamp=', userdoc);
	                               });
		                           Reservation.aggregate([
		                           		{$match:{shop_no:revdoc.shop_no, rv_posted:true}},
		                               	{$group: {"_id": "$shop_no", average: {$avg:"$review.star"}}}
		                               	], function(err, docs){
		                               		if(err) console.log('err=',err);
		                               		//docs[0].average 평균
		                               		//docs[0]._id 샵번호
		                               		console.log('제대로좀나와라..;짜증나니까 이거 평균별점임: ',docs);

		                               		Hairshop.findOneAndUpdate({shop_no:docs[0]._id}, {star_score:docs[0].average}, function(err, starupdated_doc){
		                               			if(err) console.log('err=', err);
		                               			console.log('별점이 업뎃됐어요: ', starupdated_doc);
		                               		});
		                               	});
	                               res.json({success_code: 1});
	                           });
	                        });
	                  });
	               }
	         });
	      }
	      else{
	         res.json({success_code: 0});
	      }
	   });
	});
});
module.exports = router;
