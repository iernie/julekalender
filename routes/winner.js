var config = require("../config.js").config;
var mongojs = require('mongojs');
var ObjectId = mongojs.ObjectId;

exports.index = function(req, res, db){
    var today = new Date().getDate();
    db.collection("julekalender").aggregate([{$group: { _id: 0, "lowest": {$min: "$won"}}}], function(err, lowest) {
        var giftsperuser = Math.min(++lowest[0].lowest, config.giftsperuser);
        db.collection("julekalender-winners").find({ day: req.params.day }, function(errrr, winner) {
            console.log(winner);
            if(winner.length == 0 && req.params.day <= today) {
                db.collection("julekalender").find({ won: { $lt: giftsperuser } }, function(errr, data) {
                    if(data && data.length > 0) {
                        var rand = Math.floor(Math.random()*data.length);
                        res.render('winner',
                            {
                                title: config.title,
                                data: data[rand],
                                day: req.params.day
                            }
                        );
                    } else {
                        res.redirect("/");
                    }
                });
            } else {
                res.redirect("/");
            }
        });
    });
};

exports.won = function(req, res, db) {
    db.collection("julekalender").update({ _id: ObjectId(req.body.id) }, { $inc: { won: 1 } }, { multi: false }, function(err, updated) {});
    db.collection("julekalender-winners").save({day: req.body.day, winner: ObjectId(req.body.id)});
    res.redirect("/");
}