var config = require("../config.js").config;
var mongojs = require("mongojs");
var db = mongojs(config.database);

exports.index = function(req, res){
  res.render('index',
 	{
 		title: 'Express'
  	}
  );
};