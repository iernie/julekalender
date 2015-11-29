var Pixelate = function(source, width, height) {
    var image = document.getElementById(source);
    var parent = image.parentNode;
    this.canvas = document.createElement("canvas");

    this.canvas.width = width;
    this.canvas.height = height;
    this.canvas.style.background = "#fff";
    this.ctx = this.canvas.getContext('2d');
    this.img = new Image(); 

    this.ctx.mozImageSmoothingEnabled = false;
    this.ctx.webkitImageSmoothingEnabled = false;
    this.ctx.imageSmoothingEnabled = false;
    
    this.img.onload = this.setValue;
    this.img.src = image.src;

    parent.replaceChild(this.canvas, image);
};

Pixelate.prototype.setValue = function(v) {
    var size = v * 0.01;
    var w = this.canvas.width * size;
    var h = this.canvas.height * size;
    this.ctx.drawImage(this.img, 0, 0, w, h);
    this.ctx.drawImage(this.canvas, 0, 0, w, h, 0, 0, this.canvas.width, this.canvas.height);
};

Pixelate.prototype.reset = function() {
    this.ctx.drawImage(this.img, 0, 0, this.canvas.width, this.canvas.height);
};

$(document).ready(function() {
    $(document).snowfall({
        round : true,
        minSize: 5,
        maxSize:8
    });

    var pixelate = new Pixelate("picture-img", 201, 235);
    var size = 1, finished = false;
    var interval = setInterval(function() {
        pixelate.setValue(size++);
        if(finished) {
            clearInterval(this);
            pixelate.reset();
        }
    }, 700);

    $("#name").shuffleLetters({
        step: 100,
        callback: function() {
            finished = true;
        }
    });
});