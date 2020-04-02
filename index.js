require('dotenv').config()
const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const connection = require('./Database/connection.js');
const bcrypt = require('bcrypt');
const fs = require('fs');
var multer = require('multer')

var storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, './public/uploads')
    },
    filename: function (req, file, cb) {
      cb(null, new Date().getTime()+"-"+req.session.user_id+file.originalname);
    }
  })
var upload = multer({ storage: storage })
const saltRounds = 10;


const app = express();
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));


//Session initialiazation
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));


//Home Route
app.get('/', (req, res) => {
    connection.query('select * from Blog order by dateandTime desc;',(error,results,fields)=>{
        if(error) console.log(error);
        res.render('index.ejs',{posts:results});
    })
    
});


//Login Route
app.route('/Login')
    .get((req, res) => {
        res.render('login.ejs', { loginStatus: "Enter to Authenticate" });
    })
    .post((req, res) => {
        var query1 = 'select user_id,pass from User where username =?;';
        connection.query(query1, [req.body.userName], (error, results, fields) => {
            if (results[0] == undefined)
                res.render('login.ejs', { loginStatus: "Wrong Email or Password. Try Again! " });

            else if (error) throw error;

            else {
                bcrypt.compare(req.body.password, results[0].pass, function (err, result) {
                    // result == true
                    if (result == true) {
                        console.log('Authenticated successfully');
                        console.log(results[0].user_id);
                        req.session.user_id = results[0].user_id;
                        res.redirect('/newPost');
                    }
                    else {
                        res.render('login.ejs', { loginStatus: "Wrong Email or Password. Try Again! " });
                    }
                });
            }



        });
    });



//Register Route
app.route('/Register')
    .get((req, res) => {
        res.render('register.ejs');
    })
    .post((req, res) => {
        bcrypt.hash(req.body.password, saltRounds, function (err, hash) {
            // Store hash in your password DB.
            if (err) throw err;
            var query1 = 'insert into User (username,pass) values (?,?);';
            connection.query(query1, [req.body.userName, hash], (error, results, fields) => {
                if (error) throw error;
                console.log('Value inserted successfuly');
            });
            connection.query('SELECT count(*) as uid from user', function (error, results, fields) {
                if (error) throw error;
                req.session.user_id = results[0].uid;
                console.log("User id is " + req.session.user_id);
                res.redirect('/newPost');
            });
        });
    });



//Articles Route
app.use('/article/:b_id', express.static('public'));
app.get('/article/:b_id', (req, res) => {
    var b_id = req.params.b_id;
    connection.query('select * from Blog where b_id=?',[b_id],(error,results,fields)=>{
        if(error)console.log(error);
        
        res.render('article',{post:results[0]});
    });
    
});
app.delete('/article/:b_id',(req,res)=>{
    connection.query('select * from Blog where b_id=?',[req.params.b_id],(error,results,fields)=>{
        if(error)console.log(error);
        if(req.session.user_id!=results[0].user_id)
        {
            res.json({message:"Not Authorized"});
            // res.render('article',{post:results[0],buttonStatus:"You're not Authorized"});
        }
        else{
            connection.query('DELETE FROM Blog WHERE b_id=?;',[req.params.b_id],(error,results1,fields)=>{
                if(error) console.log(error);
                console.log("Deleted the Post");
                fs.unlink('./public/uploads/'+results[0].photo, function (err) {
                    if (err) throw err;
                    // if no error, file has been deleted successfully
                    console.log('File deleted!');
                });
                res.json({message:"success"});

            });
        }
    });
   
});


//New Post Route
app.route('/newPost')
    .get((req, res) => {
        if (req.session.user_id == null) {
            res.redirect('/Login');
        }
        else {
            res.render("newpost.ejs");
        }
    })
    .post(upload.single('img'), (req, res) => {
        var date = new Date();
        var timestamp = date.toISOString().slice(0, 10) + " " + date.toISOString().slice(11, 19);
        var query = "INSERT INTO Blog (title, postBody,photo,dateandTime,author,aboutAuthor,user_id) VALUES (?,?,?,?,?,?,?)";
        connection.query(query, [req.body.title, req.body.postBody,req.file.filename,timestamp,req.body.author,req.body.aboutAuthor,req.session.user_id], (error, results, fields) => {
            if(error) console.log(error)
            console.log("Inserted Succesfully");
            res.redirect('/');
        });
    });



app.listen(process.env.PORT || 3000, () => {
    console.log("Server started ");
})
