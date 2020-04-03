require('dotenv').config()
const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcrypt');
const fs = require('fs');
var multer = require('multer')

//Database connection
var sqlite3 = require('sqlite3').verbose()
var db = new sqlite3.Database('./BlogDatabase.db',(err)=>{
    console.log("Connected to sqlite database");
});

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
app.use(express.static('public'));  //Serving static files from public folder like css and js files
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
    //fetching blogs in descending order of date so that recent post comes first
    db.all('select * from Blog order by dateandTime desc;',(error,results)=>{
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
        db.get(query1, [req.body.userName], (error, row) => {
            //no such entry in the database
            if (row == undefined)
                res.render('login.ejs', { loginStatus: "Wrong Email or Password. Try Again! " });

            else if (error) throw error;

            else {
                //entry found now comparing the passwords
                bcrypt.compare(req.body.password, row.pass, function (err, result) {
                    // result == true
                    if (result == true) {
                        console.log('Authenticated successfully');
                        console.log(row.user_id);
                        req.session.user_id = row.user_id;
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
            // Store hash in your DB.
            if (err) throw err;
            var query1 = 'insert into User (username,pass) values (?,?);';
            db.run(query1, [req.body.userName, hash], (error) => {
                if (error) throw error;
                console.log('Value inserted successfuly');
            });

            //counting the number of users to get the uid of latest added user and storing it in the session variable
            //there can be mush efficient way but this is what I thought of
            db.get('SELECT count(*) as uid from user', function (error, row) {
                if (error) throw error;
                req.session.user_id = row.uid;
                console.log("User id is " + req.session.user_id);
                res.redirect('/newPost');
            });
        });
    });



//Articles Route
app.use('/article/:b_id', express.static('public')); //for serving static files at dynamic routes as its not by default
app.get('/article/:b_id', (req, res) => {
    var b_id = req.params.b_id;
    db.get('select * from Blog where b_id=?',[b_id],(error,result)=>{
        if(error)console.log(error);
        
        res.render('article',{post:result});
    });
    
});
app.delete('/article/:b_id',(req,res)=>{
    db.get('select * from Blog where b_id=?',[req.params.b_id],(error,results)=>{
        if(error)console.log(error);

        //if someone else is trying to delete the post send unauthorized
        if(req.session.user_id!=results.user_id)
        {
            res.json({message:"Not Authorized"});
        }
        else{
            //delete the row from database
            db.run('DELETE FROM Blog WHERE b_id=?;',[req.params.b_id],(error)=>{
                if(error) console.log(error);
                console.log("Deleted the Post");

                //Delete the file from uploads folder
                fs.unlink('./public/uploads/'+results.photo, function (err) {
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
        //Only logged in users can add new post
        if (req.session.user_id == null) {
            res.redirect('/Login');
        }
        else {
            res.render("newpost.ejs");
        }
    })
    .post(upload.single('img'), (req, res) => {
        var query = "INSERT INTO Blog (title, postBody,photo,datetime('now', 'localtime'),author,aboutAuthor,user_id) VALUES (?,?,?,?,?,?)";
        db.run(query, [req.body.title, req.body.postBody,req.file.filename,req.body.author,req.body.aboutAuthor,req.session.user_id], (error) => {
            if(error) console.log(error)
            console.log("Inserted Succesfully");
            res.redirect('/');
        });
    });



app.listen(process.env.PORT || 3000, () => {
    console.log("Server started ");
})
