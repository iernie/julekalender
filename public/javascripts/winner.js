var Pixelate = function(source, width, height) {
    var image = document.getElementById(source);
    var parent = image.parentNode;
    this.canvas = document.createElement("canvas");

    this.canvas.width = width;
    this.canvas.height = height;
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
    var pixelate = new Pixelate("picture-img", 201, 235);
    var size = 1;
    var interval = setInterval(function() {
        pixelate.setValue(size++);
    }, 500);

    $("#name").shuffleLetters({
        step: 100,
        callback: function() {
            clearInterval(interval);
            pixelate.reset();
        }
    });
});