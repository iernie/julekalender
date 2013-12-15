
/**
 * Module dependencies.
 */

var express = require('express');
var routes = require('./routes');
var register = require('./routes/register');
var winner = require('./routes/winner');
var remove = require('./routes/remove');
var users = require('./routes/users');
var http = require('http');
var path = require('path');

var config = require("./config.js").config;
var mongojs = require("mongojs");
var db = mongojs(config.database);

var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.bodyParser());
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(app.router);
app.use(require('less-middleware')({ src: path.join(__dirname, 'public') }));
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
	app.use(express.errorHandler());
}

app.get('/', function(req, res) {
	routes.index(req, res, db);
});
app.get('/register', function(req, res) {
	register.index(req, res, db);
});
app.get('/winner', function(req, res) {
	res.redirect("/");
});
app.get('/winner/:day', function(req, res) {
	winner.index(req, res, db);
});
app.get('/removeallthethings', function(req, res) {
	remove.index(req, res, db);
});
app.get('/users', function(req, res) {
	users.index(req, res, db);
});
app.post('/users/edit', function(req, res) {
	users.edit(req, res, db);
});
app.post('/register/save', function(req, res) {
	register.save(req, res, db);
});
app.post('/winner/won', function(req, res) {
	winner.won(req, res, db);
});

http.createServer(app).listen(app.get('port'), function(){
	console.log('Express server listening on port ' + app.get('port'));
});
