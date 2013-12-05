$(document).ready(function() {
    $(document).snowfall({
        round : true,
        minSize: 5,
        maxSize:8
    });

    $('#picture').hide();
    $('#picture-img').hide();

    $("#name").shuffleLetters({
    	step: 100,
    	callback: function() {
    		$('#picture').slideDown();
    		$('#picture-img').slideDown();
    	}
    });
});