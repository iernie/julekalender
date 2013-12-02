exports.index = function(req, res, db){
	db.collection("julekalender").runCommand('count', function(err, count) {
		if(count && count.n) {
			var rand = Math.floor(Math.random()*count.n);
		    db.collection("julekalender").find(function(err2, data) {
		    	console.log(data);

		    	db.collection("julekalender").update({_id: data[rand]._id}, {$inc:{won:1}}, {multi:false}, function() {});

		    	res.render('winner',
					{
						name: data[rand].navn
					}
				);
			});
		} else {
			res.redirect("/");
		}
	});
};