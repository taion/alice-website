var Gallery = function($element) {
	this.$element = $element;
};

Gallery.prototype = {
	init : function() {
		this.galleryType = this.$element.attr("gallery-type");

		this.$items = this.$element.find(".item");
		this.size = this.$items.length;

		var $active = this.$items.filter(".active");
		this.activeIndex = this.$items.index($active);

		this.positionSlideBound = this.positionSlide();
		this.draw();

		this.$element.find(".gallery-inner").click(this.itemClick());
		this.$element.find(".control.next").click(this.controlDirection(1));
		this.$element.find(".control.prev").click(this.controlDirection(-1));

		this.$element.find(".control.contact-sheet").click(
				this.toggleContactSheet());
	},

	positionSlide : function(index, element) {
		var that = this;
		return function(index, element) {
			var $element = $(element);
			$element.css("top", 0);
			$element.css("left", 100 * (index - that.activeIndex) + "%");
		};
	},

	draw : function() {
		this.$element.attr("gallery-type", this.galleryType);
		this.$items.find(".active").removeClass("active");
		$(this.$items[this.activeIndex]).addClass("active");

		if (this.galleryType == "slideshow")
			this.$items.each(this.positionSlideBound);

		this.$element.trigger("galleryupdate", this);
	},

	itemClick : function() {
		var that = this;
		return function(event) {
			if (that.galleryType == "slideshow")
				that.incrementSlide(1);
		};
	},

	controlDirection : function(increment) {
		var that = this;
		return function(event) {
			event.preventDefault();

			if (that.galleryType == "slideshow")
				that.incrementSlide(increment);
		};
	},

	incrementSlide : function(increment) {
		var targetIndex = (this.size + this.activeIndex + increment)
				% this.size;
		this.activeIndex = targetIndex;
		this.draw();
	},

	toggleContactSheet : function() {
		var that = this;
		return function(event) {
			event.preventDefault();
			if (that.galleryType == "contact-sheet")
				that.galleryType = "slideshow";
			else
				that.galleryType = "contact-sheet";

			that.draw();
		};
	}
};

function initializeFromHash($gallery) {
	var hashItemTag = window.location.hash.substring(1);
	var $galleryItems = $gallery.find(".item");
	var hashItemIndex = Number(hashItemTag);

	var hashItem;
	if (!isNaN(hashItemIndex)) {
		hashItem = $galleryItems[hashItemIndex];
	} else {
		var $hashItemsByTitle = $galleryItems.filter('[title="' + hashItemTag
				+ '"]');
		if ($hashItemsByTitle.size())
			hashItem = $hashItemsByTitle[0];
		else
			hashItem = $galleryItems[0];
	}
	$(hashItem).addClass("active");
}

function updateFromHash($gallery) {
	var gallery = $gallery.data("gallery");
	var hashItemTag = window.location.hash.substring(1);
	var hashItemIndex = Number(hashItemTag);

	if (isNaN(hashItemIndex)) {
		var $items = gallery.$items;
		var $hashItemsByTitle = $items.filter('[title="' + hashItemTag + '"]');
		if ($hashItemsByTitle) {
			hashItemIndex = $items.index($hashItemsByTitle[0]);
		} else
			hashItemIndex = 0;
	}

	if (hashItemIndex != gallery.activeIndex) {
		gallery.activeIndex = hashItemIndex;
		gallery.draw();
	}
}

$(function() {
	$galleryMain = $("#gallery-main");
	initializeFromHash($galleryMain);

	var ignoreHashChange = 0;
	$galleryMain.on("galleryupdate", function(event, gallery) {
		var $active = $(gallery.$items[gallery.activeIndex]);
		var itemTag = $active.attr("title");
		if (!itemTag)
			itemTag = gallery.activeIndex;

		var hash;
		if (gallery.galleryType == "contact-sheet")
			hash = "contact:" + itemTag;
		else
			hash = itemTag;

		ignoreHashChange++;
		window.location.hash = hash;
	});

	window.onhashchange = function() {
		if (ignoreHashChange)
			ignoreHashChange--;
		else
			updateFromHash($galleryMain);
	};

	$(".gallery").each(function(index, element) {
		var $element = $(element);
		var gallery = new Gallery($element);
		$element.data("gallery", gallery);
		gallery.init();
	});

	$galleryMain.find(".gallery-inner").css("display", "block");

	$(".nav .active>a").click(function(event) {
		event.preventDefault();
	});
});