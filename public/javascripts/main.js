$(document).ready(function() {
    $(document).snowfall({
        round : true,
        minSize: 5,
        maxSize:8
    });

    $("#name").shuffleLetters({
    	step: 100
    });
});