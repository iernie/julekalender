exports.index = function(req, res, db) {
	db.collection("julekalender").find(function(err, data) {
		console.log(data);
		res.render("users", {
			users: data
		});
	});
}