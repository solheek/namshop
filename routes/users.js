var express = require('express');
var router = express.Router();
var Hairshop = require('../models/hairshop');
var Reservation = require('../models/reservation');
var User = require('../models/user');
var bcrypt = require('bcrypt-node');

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

router.get('/join', function(req, res, next) {
  res.render('users/join', {title: '회원가입'});
});

//1. 회원가입
router.post('/join',function(req, res, next){
   console.log('req.body=', req.body);
   var email = req.body.email;
   var pw = req.body.pw;

       User.findOne({email:email},function(err,doc){
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
                      res.json({success_code: 1, result:doc});
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

      var same = bcrypt.compareSync(pw, doc.pw);
      if(same){
         req.session.email = email;
         res.json({
             success_code : 1,
             user_no: doc.user_no,
             email: doc.email,
             nickname: doc.nickname
         });
      } else {
         res.json({success_code : 0});
      }
   });
});

//12. 예약 내역 조회
router.get('/:user_no/res_list', function(req, res, next) {
	//JSON으로 예약테이블에서 회원번호 찾아서 예약내역 보여주기.
	var user_no = req.params.user_no;

	Reservation.find({user_no: user_no},"name address res_date" ,function(err, lists){
	   console.log("reservation list=", lists);
	   res.json({res_list:lists});
	});
});

//13. 헤어샵 리뷰 작성하기
router.post('/:user_no/res_list/:res_no/', function(req, res, next) {
	res.render('write_review', { title: '리뷰쓰기' });
});

module.exports = router;
