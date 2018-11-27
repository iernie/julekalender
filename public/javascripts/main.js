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

if (!String.prototype.splice) {
    /**
     * {JSDoc}
     *
     * The splice() method changes the content of a string by removing a range of
     * characters and/or adding new characters.
     *
     * @this {String}
     * @param {number} start Index at which to start changing the string.
     * @param {number} delCount An integer indicating the number of old chars to remove.
     * @param {string} newSubStr The String that is spliced in.
     * @return {string} A new string with the spliced substring.
     */
    String.prototype.splice = function (start, delCount, newSubStr) {
        return this.slice(0, start) + newSubStr + this.slice(start + Math.abs(delCount));
    };
}

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

        var name = $("#name").html();
        var length = Math.max(26, name.length);
        var text = Array(length).join("	").splice(name.length / 2 - ((length / 2) + name.length), name.length, name);

        $("#name").shuffleLetters({
            step: 100,
            text: text,
            callback: function () {
                pixelate.reset();
                clearInterval(interval);
            }
        });
    }
});