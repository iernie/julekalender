var config = require("../config.js").config;

exports.index = function(req, res, db){
	res.render('index',
		{
			title: config.title
		}
	);
};