require("dotenv").config();
const createError = require("http-errors"),
	express = require("express"),
	favicon = require("serve-favicon"),
	path = require("path"),
	cookieParser = require("cookie-parser"),
	compression = require("compression"),
	logger = require("morgan"),
	session = require("cookie-session"),
	{ MongoClient } = require("mongodb"),
	assert = require("assert"),
	passport = require("passport"),
	fblogin = require("passport-facebook").Strategy,
	srRouter = require("./routes/sr"),
	enRouter = require("./routes/en");

passport.use(new fblogin({
	clientID: process.env.FB_ClientID,
	clientSecret: process.env.FB_ClientSecret,
	callbackURL: "/return",
	profileFields: ["id", "first_name", "last_name", "email"]
	}, (accessToken, refreshToken, profile, cb) => {
		return cb(null, profile);
	}
));

passport.serializeUser((user, cb) => {
  cb(null, user);
});

passport.deserializeUser((obj, cb) => {
  cb(null, obj);
});

let url;
if (process.env.DB_User && process.env.DB_Pass)
  url = `mongodb+srv://${process.env.DB_User}:${process.env.DB_Pass}@${process.env.DB_Host}/${process.env.DB_Db}?retryWrites=true&w=majority`;
else
  url = `mongodb://${process.env.DB_Host}:27017/${process.env.DB_Db}`;

let pool;
MongoClient.connect(url, {  
  //poolSize: 10
  }, (err, db) => {
		assert.equal(err, null);
    pool = db;
    console.log("Established a connection with the database");
  }
);

const app = express();

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.locals.rmWhitespace = true;

app.use(favicon(path.join(__dirname, "public", "favicon.ico")))
app.use(logger("tiny"));
//app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());
app.use(session({secret: process.env.Cookie_secret, resave: true, saveUninitialized: true}));
app.use(compression({level: 1}));
app.use(express.static(path.join(__dirname, "public")));
app.use((req, res, next) => {
  req.pool = pool;
  next();
});

app.use(passport.initialize());
app.use(passport.session());

app.use("/", srRouter);
app.use("/en", enRouter);

// catch 404 and forward to error handler
app.use((req, res, next) => {
  next(createError(404));
});

// error handler
app.use((err, req, res, next) => {
	// set locals, only providing error in development
	res.locals.message = err.message;
	res.locals.error = req.app.get("env") === "development" ? err : {};

	// render the error page
	res.status(err.status || 500);
	res.render("error");
});

module.exports = app;
app.listen(8080);
