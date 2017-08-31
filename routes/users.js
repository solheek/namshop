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
var moment = require('moment-timezone');
var multer = require('multer');
var multerS3 = require('multer-s3');
var async = require('async');

var upload2 = multer({
        storage: multerS3({
            s3: s3,
            bucket: 'namshop',
            key: function (req, file, cb) {
                console.log(file);
                cb(null, Date.now().toString() + file.originalname); //use Date.now() for unique file keys
            }
        })
});

/* 시간 설정 함수*/
function regDateTime(){
    // lang:ko를 등록한다. 한번 지정하면 자동적으로 사용된다.
    moment.locale('ko', {
        weekdays: ["일요일","월요일","화요일","수요일","목요일","금요일","토요일"],
        weekdaysShort: ["일","월","화","수","목","금","토"],
    });

    var m = moment().tz('Asia/Seoul');
    var output = m.format("YYYY-MM-DD");
    return output;
}

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

router.get('/join', function(req, res, next) {
  res.render('users/join', {title: '회원가입'});
});

//1. (완료)회원가입
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

//2. (완료)로그인
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
		             nickname: doc.nickname,
		             stamp: doc.stamp
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

//4. (완료)로그아웃
router.get('/logout',function(req, res, next){
   req.session.destroy( function(err){
      if(err) res.json({success_code: 0});
      	console.log('logout req.session=',req.session);
      	res.json({success_code: 1});
   });
});

//7. (완료)햄버거 메뉴의 마이페이지 조회
router.get('/:user_no/mypage',function(req, res, next){
	req.checkParams('user_no').isInt();
	var user_no = req.params.user_no;
	var errors = req.validationErrors();

	if(!errors){
		User.findOne({user_no: user_no},"user_no nickname email stamp userpic_url" ,function(err, user_doc){
			if(user_doc){
			   console.log('user doc=', user_doc);
			   res.json({success_code:1, mypage:user_doc});
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

//12. (완료) 예약 내역 조회
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
//지금 html로 설정되어있음 (모바일로 변경해야함 )
//20. 스탬프 받기 버튼 눌렀을 때
router.get('/:user_no/res_list/write', function(req, res, next) {
	req.checkParams('user_no').isInt();
	var user_no = req.params.user_no;
	var res_no = req.query.res_no;
	//req.checkParams('res_no').isInt();

	var errors = req.validationErrors();

	if(!errors){
		Reservation.findOne({user_no:user_no, res_no:res_no}, function(err, res_doc){
			if(res_doc){ //해당 유저의 예약 존재하지 않을때 검사
				var shop_no = res_doc.shop_no;
				console.log('**************shop_no=', res_doc.shop_no);
				//모바일
				Hairshop.findOne({shop_no:shop_no}, "shop_no shop_name address", function(err, shop_doc){
					if(shop_doc)
						res.json({success_code:1, shop_info: shop_doc});
					else
						res.json({success_code:0});
				});
			}
			else{
				res.json({success_code:0});
			}
		});
	}
	else{
		return res.json({success_code: 0, message: "invalid params"});
	}
});

//13.리뷰 작성하기 (완료)
router.post('/:user_no/res_list/write', upload2.single('userfile'), function(req, res, next) {
	var data = {
		user_no: parseInt(req.params.user_no),
		res_no: req.body.res_no,
		shop_no: null,
		star_score: null,
		nickname: req.session.email.split('@')[0],
		star: req.body.star, //review data
		hashtag: [req.body.hash_1, req.body.hash_2], //review data
		reg_date: regDateTime(),
		uploadedFile: null,
		photo_url: null,
		thumbnail_Filename: null, //썸네일 파일 이름
		photo_thumbnail_url: null
	};

	if(req.file){
		data.thumbnail_Filename = req.file.originalname.split('.')[0] + "_thumbnail.jpg";
		data.photo_url = req.file.location;
	}

	console.log('*************req.file=', req.file);

	async.waterfall([
		async.constant(data),
		writeReview,
		giveStamp,
		scoreCalculate,
		scoreUpdate,
		uploadThumbnail,
		updatePhotoUrl
		], function(err, result){
			if(err){
				res.json({success_code: 0});
			}
			if(result){
				res.json({success_code:1, message: "review is registered"});
			}
		});
});

function writeReview(data, callback){
	var rev_data = {
		nickname: data.nickname,
		star: data.star,
		hashtag: data.hashtag,
		reg_date: data.reg_date
	};

	//console.log(rev_data);

	Reservation.findOneAndUpdate({res_no:data.res_no, rv_posted:false, rv_del:false}, {review:rev_data, rv_posted:true}, function(err, doc){
		if(err){
			console.log(doc);
			return callback(err);
		} else {
			data.shop_no = doc.shop_no;
			return callback(null, data);
		}
	});
};

function giveStamp(data, callback){
	User.update({user_no:data.user_no}, {$inc:{stamp:5}}, function(err, doc){
		if(err){
			return callback(err);
		} else {
			return callback(null, data);
		}
	});
};

function scoreCalculate(data, callback){
	Reservation.aggregate([
	{$match:{shop_no:data.shop_no, rv_posted:true, rv_del:false}},
	{$group: {"_id": "$data.shop_no", average: {$avg:"$review.star"}}}], function(err, doc){

	    if(err){
	    	return callback(err);
	    } else {
	    	data.star_score = doc[0].average;
	    	return callback(null, data);
	    }
	});
};

function scoreUpdate(data, callback){
	Hairshop.findOneAndUpdate({shop_no:data.shop_no}, {star_score:data.star_score}, function(err, doc){

		if(err){
			return callback(err);
		} else {
			console.log('*****리뷰와 별점 업데이트 완료!');
			return callback(null, data);
		}
	});
};

function uploadThumbnail(data, callback){
	gm(request(data.photo_url), data.thumbnail_Filename).resize(294,294).stream(function(err, stdout, stderr){
	      var thumb_data = {
	         Bucket: 'namshop',
	         Key: data.thumbnail_Filename,
	         ACL:'public-read',
	         Body: stdout,
	         ContentType: mime.lookup(data.thumbnail_Filename)
	      };

	      s3.upload(thumb_data, function(err, doc){
	        if(err){
	           return callback(err);
	        } else {
	           //console.log('썸네일=',doc.Location);
	           data.photo_thumbnail_url = doc.Location;
	           console.log('썸네일=',data.photo_thumbnail_url);
	           return callback(null, data);
	        }
	      });
	});
};

function updatePhotoUrl(data, callback){
	Reservation.findOneAndUpdate({res_no:data.res_no}, { $set : {"review.photo_url": data.photo_url, "review.photo_thumbnail_url": data.photo_thumbnail_url}}, function(err, doc){
		if(err){
			return callback(err);
		}
		if(doc){
			console.log('썸네일=',data);
			return callback(null, doc);
		}
	});
};

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
