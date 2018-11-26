var Pixelate = function (image, width, height) {
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
    if (this.canvas) {
        var size = v * 0.01;
        var w = this.canvas.width * size;
        var h = this.canvas.height * size;
        this.ctx.drawImage(this.img, 0, 0, w, h);
        this.ctx.drawImage(this.canvas, 0, 0, w, h, 0, 0, this.canvas.width, this.canvas.height);
    }
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

    $(".alert.flash").animate({
        bottom: "+=50px",
    });

    setTimeout(function(){
        $(".alert.flash").animate({
            bottom: "-=50px",
        });
    }, 5000);

    var image = document.getElementById("picture-img");
    if (image) {
        var pixelate = new Pixelate(image, 201, 235);
        var size = 1;
        var interval = setInterval(function () {
            pixelate.setValue(size++);
        }, 700);

        $("#name").shuffleLetters({
            step: 100,
            callback: function () {
                pixelate.reset();
                clearInterval(interval);
            }
        });
    }
});