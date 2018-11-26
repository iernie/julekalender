require('dotenv').config();

var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var bodyParser = require('body-parser');
var Handlebars = require('express-hbs');
var session = require('express-session')
var flash = require('express-flash-notification')
var multer  = require('multer')
var upload = multer();

global.Parse = require('parse/node');

Parse.initialize(process.env.APP_ID);
Parse.serverURL = process.env.PARSE_URL;

var index = require('./routes/index');
var team = require('./routes/team');
var users = require('./routes/users');
var open = require('./routes/open');
var api = require('./routes/api');

var UserObject = Parse.Object.extend("Users");

var app = express();
var port = process.env.PORT || 2000;

Handlebars.registerHelper('get', function(object, name) {
    return object.get(name);
});

Handlebars.registerHelper('objectId', function(object) {
    return object.id;
});

Handlebars.registerAsyncHelper('picture', function(objectId, cb) {
    var query = new Parse.Query(UserObject);
    query.get(objectId).then(function(user) {
        var parseFile = user.get('picture');
        if(parseFile) {
            return cb(parseFile.url());
        }
        return cb("");
    });
});

// view engine setup
app.engine('hbs', Handlebars.express4({
  partialsDir: path.join(__dirname, 'views', 'partials')
}));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');
app.use(session({ secret: 'julekalender', resave: true, saveUninitialized: false }));
app.use(flash(app, { view_name: 'partials/flash' }));

app.use(favicon(path.join(__dirname, 'public', 'favicon.png')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(require('less-middleware')(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', index.get);
app.post('/', index.post);

app.get('/:name', team.get);

app.get('/:name/users', users.get);
app.post('/:name/users', upload.single('picture'), users.post);

app.get('/:name/open/:day', open.get);
app.post('/:name/open/:day', open.post);

app.get('/:name/api', api.get);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('partials/error', {
      message: err.message,
      error: err,
      layout: 'layout'
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('partials/error', {
    message: err.message,
    error: {},
    layout: 'layout'
  });
});

app.listen(port);
