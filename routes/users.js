var request = require('request');
var express = require('express');
var async = require('async');
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

   req.checkBody('email').notEmpty().isEmail();
   req.checkBody('pw').notEmpty();

   var errors = req.validationErrors();

   if(!errors){
	   	var email = req.body.email;
	   	var pw = req.body.pw;

       User.findOne({email:email}, function(err,doc){
                if(err) res.json('err=', err);

                if(doc){//이메일 중복일때 doc 값 있음
                   res.json({success_code: 2, message: "이메일 중복"});
               }
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

                   user.save(function(err, doc){
                      console.log('**********join completed doc=',doc);
                      //success_code만 보내주면 됨
                      res.json({success_code: 1});
                      //res.json({success_code: 1, result: doc});
                    });
                }
     });
   }
   else { //이메일이나 패스워드가 빈칸일때
   		console.log('!!!!!join errors=', errors);
   		return res.json({success_code: 0, message: "invaild input value"});
   }
});


//2.로그인
router.post('/login', function(req, res, next){
   console.log('req.body=',req.body);

   req.checkBody('email').notEmpty().isEmail();
   req.checkBody('pw').notEmpty();

   var errors = req.validationErrors();

   if(!errors){
  	 	var email = req.body.email;
  	 	var pw = req.body.pw;

	    User.findOne({email:email}, function(err, doc){
	       if(err) console.log('err', err);
	       console.log('login member doc=', doc);

	       if(doc != null){	//email이 존재할때만
		      var same = bcrypt.compareSync(pw, doc.pw);
		      if(same){
		         req.session.email = email;
		         res.json({ //email있고 로그인 됐을때
		             success_code : 1,
		             result: {
		             user_no: doc.user_no,
		             email: doc.email,
		             stamp: doc.stamp,
		             nickname: doc.nickname
		             }
		         });
		      }
		      else {
		         res.json({success_code : 2, message:"pw error"}); //비밀번호 틀렸을때
		      }
			}
			else{
				res.json({success_code : 3, message:"unregisterd email"}); //email이 없을때
			}
	    });
	}
	else{ //이메일이나 패스워드가 빈칸이거나 이메일 형식 틀렸을때
		console.log('!!!!!!!!login errors=', errors);
		return res.json({success_code: 0, message: "invalid input value"});
	}
});

//4.로그아웃
router.get('/logout',function(req, res, next){
   req.session.destroy( function(err){
      if(err) res.json({success_code: 0});
      	console.log('logout req.session=',req.session);
      	res.json({success_code: 1});
   });
});

//7. 햄버거 메뉴의 마이페이지 조회
router.get('/:user_no/mypage',function(req, res, next){
	req.checkParams('user_no').isInt();
	var user_no = req.params.user_no;
	var errors = req.validationErrors();

	if(!errors){
		User.findOne({user_no: user_no},"user_no nickname stamp userpic_url" ,function(err, user_doc){
			if(user_doc){
			   console.log('user doc=', user_doc);
			   res.json({success_code:1, user:user_doc});
			}
			else{
				res.json({success_code:0, message: "invalid user"});
			}
		});
	}
	else {
		return res.json({success_code: 0, message: "invalid param"});
	}
});

//12. 예약 내역 조회
router.get('/:user_no/res_list', function(req, res, next) {
	//예약테이블에서 회원번호로 예약리스트 찾아서 JSON으로 보내주기.
	req.checkParams('user_no').isInt();
	var user_no = req.params.user_no;
	var errors = req.validationErrors();

	if(!errors){
		Reservation.find({user_no: user_no},"res_no shop_name address res_date rv_posted" ,function(err, lists){
		   console.log("reservation list=", lists);
		   res.json({success_code:1, res_list:lists});
		});
	}
	else {
		return res.json({success_code: 0, message: "invalid param"});
	}
});

//리뷰작성 폼
//http://localhost/users/2/res_list/1/write
//지금 html로 설정되어있음 (모바일로 변경해야함)
//19. 스탬프 받기 버튼 눌렀을 때
router.get('/:user_no/res_list/:res_no/write', function(req, res, next) {
	req.checkParams('user_no').isInt();
	req.checkParams('res_no').isInt();

	var errors = req.validationErrors();

	if(!errors){
		var res_no = req.params.res_no;

		Reservation.findOne({res_no:res_no}, function(err, res_doc){
			var shop_no = res_doc.shop_no;
			console.log('**************shop_no=', res_doc.shop_no);

			//모바일
			// Hairshop.findOne({shop_no:shop_no}, "shop_name address", function(err, shop_doc){
			// 	if(shop_doc)
			// 		res.json({success_code:1, shop_doc: shop_doc});
			// 	else
			// 		res.json({success_code:0});
			// });

		});

		//html
		 res.render('users/write_review', { title: '리뷰쓰기',
		 	user_no:req.params.user_no,
		 	res_no:req.params.res_no
		 });
	}
	else{
		return res.json({success_code: 0, message: "invalid params"});
	}
});

//13. 헤어샵 리뷰 작성하기
router.post('/:user_no/res_list/:res_no/write', function(req, res, next) {
	//예약테이블에서 예약번호로 해당 row찾아서 리뷰컬럼 업뎃
	var form = new formidable.IncomingForm();
	req.checkParams('user_no').isInt();
	req.checkParams('res_no').isInt();

	var errors = req.validationErrors();

	if(!errors){
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

		                           //예약번호 찾아서 해당테이블에 리뷰 넣어주고 flag true로 바꿔주기(리뷰 읽기할때 사용할거임)
		                           Reservation.findOneAndUpdate({res_no:res_no, rv_posted:false, rv_del:false}, {review: review_data, rv_posted:true}, function(err, revdoc){
		                               if(err) console.log('err=', err);
		                               console.log('*******uploading review=', revdoc); //////////이미 리뷰 썼으면 null로 나오고 프로그램 중지됨 ..어차피 스탬프 받기 버튼 비활성화되니까 상관없으려나 ?
		                               //리뷰 작성한 유저찾아서 스탬프 5개줌
		                               if(revdoc){ //revdoc이 null이 아니면
			                               User.update({user_no:user_no},{$inc:{stamp: 5}}, function(err, userdoc){
			                               		if(err) console.log('err=', err);
			                               		console.log('********increasing stamp=', userdoc);
			                               });
				                           Reservation.aggregate([
				                           		{$match:{shop_no:revdoc.shop_no, rv_posted:true, rv_del:false}},
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
			                               res.json({success_code: 1, message:"review registered"});
			                           }
			                           else{
			                           	   res.json({success_code: 0, message:"error!! review is already registered"});
			                           }
		                           }); //Reservation.findOneAndUpdate ended
		                        });//s3 upload ended
		                  });
		               }
		         });
		      }
		      else{
		         res.json({success_code: 0});
		      }
		   }); ///reservation.findOne
		});
	}
	else{
		return res.json({success_code: 0, message: "invalid params"});
	}
});

//14. 지가 작성한 리뷰 보기 아오 하기싫어
router.get('/:user_no/res_list/:res_no/read_rev', function(req, res, next){
	//rv_posted:true인 경우(리뷰가 쓰여진 경우)만 볼수있음
	req.checkParams('user_no').isInt();
	req.checkParams('res_no').isInt();

	var errors = req.validationErrors();

	if(!errors){
		var res_no = req.params.res_no;
		var user_no = req.params.user_no;

		Reservation.findOne({res_no:res_no, user_no:user_no, rv_posted:true}, "shop_name address review rv_del", function(err, revdoc){
			res.json({success_code: 1, user_review: revdoc});
			//rv_del이 true일 경우 삭제된 리뷰입니다라고 버튼을 바꾸는거 어때? 혹은 삭제하기 버튼을 비활성화 하거나 ..리뷰는 그대로 볼 수 있고 !!
		});
	}
	else{
		return res.json({success_code: 0, message: "invalid params"});
	}
});

//15. 작성한 리뷰 삭제
router.post('/:user_no/res_list/:res_no/read_rev/del', function(req, res, next){
	req.checkParams('user_no').isInt();
	req.checkParams('res_no').isInt();

	var errors = req.validationErrors();

	if(!errors){
		var res_no = req.params.res_no;
		var user_no = req.params.user_no;

		Reservation.findOneAndUpdate({res_no:res_no, user_no:user_no, rv_posted:true, rv_del:false}, {rv_del:true} , function(err, delrevdoc){
			res.json({success_code: 1, message: "review is deleted"});
			console.log('********deleted review=', delrevdoc);
		});
	}
	else{
		return res.json({success_code: 0, message: "invalid params"});
	}
});

//18.관심샵 리스트 조회
router.get('/:user_no/favor_list',function(req,res,next)
{
	   req.checkParams('user_no').isInt();

	   var errors = req.validationErrors();

	   if(!errors){
	   		var user_no = req.params.user_no;
		    User.findOne({user_no:user_no}, function(err, user){
		      if(err) res.json({"success_code" : 0});
		      console.log('userfindOne user=',user);
		      var arr=[];
		      async.eachSeries(user.favorite, function(item, callback)
		         {//헤어샵 no만 나옴
		            console.log('eachSeries' + item);
		            Hairshop.findOne({shop_no:item}, function(err, shopdoc)
		            {
		               console.log("shopdoc=", shopdoc);
		               var obj = {
		                  "shop_no": shopdoc.shop_no,
		                  "shop_name": shopdoc.shop_name,
		                  "address": shopdoc.address
		               };
		               arr.push(obj);
		               callback();
		            });
		         }, function(err) {
		            if( err )
		            {
		               console.log('A file failed to process');
		               res.json({"success_code":0});
		            } else
		            {
		               console.log('All files have been processed successfully');
		               console.log('arr=', arr);
		               res.json({"success_code":1, "favor_list": arr});
		            }
		         });
		   });
		}
		else{
			return res.json({success_code: 0, message: "invalid params"});
		}
});

module.exports = router;
