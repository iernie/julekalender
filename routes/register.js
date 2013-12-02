exports.index = function(req, res, db){
  	res.render('register');
};

exports.save = function(req, res, db){
	console.log(req.body);
	db.collection("julekalender").save(req.body);
	res.redirect("/");
};