exports.index = function(req, res, db){
	db.collection("julekalender").remove(function(){
		res.redirect("/");
	});
};