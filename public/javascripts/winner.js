var Pixelate = function(canvas, source) {
    this.canvas = canvas;
    this.ctx = this.canvas.getContext('2d');
    this.img = new Image(); 

    this.ctx.mozImageSmoothingEnabled = false;
    this.ctx.webkitImageSmoothingEnabled = false;
    this.ctx.imageSmoothingEnabled = false;
    
    this.img.onload = this.setValue;
    this.img.src = source;
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
    var pixelate = new Pixelate($("#canvas")[0], $("#picture-img").val());
    var size = 1;
    var interval = setInterval(function() {
        pixelate.setValue(size++);
    }, 750);

    $("#name").shuffleLetters({
        step: 100,
        callback: function() {
            clearInterval(interval);
            pixelate.reset();
        }
    });
});