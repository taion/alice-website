var Gallery = function($element) {
	this.$element = $element;
};

Gallery.prototype = {
	init : function() {
		this.$items = this.$element.find(".item");
		this.size = this.$items.length;

		var $active = this.$items.filter(".active");
		this.markActive(this.$items.index($active), $active);

		var that = this;
		var slideNext = function(event) {
			event.preventDefault();
			that.slideOne(1);
		};
		this.$element.find(".item-holder").click(slideNext);
		this.$element.find(".control.next").click(slideNext);
		this.$element.find(".control.prev").click(function(event) {
			event.preventDefault();
			that.slideOne(-1);
		});
	},

	markActive : function(activeIndex, $active) {
		this.activeIndex = activeIndex;
		this.$active = $active;
	},

	slideOne : function(increment) {
		var target = (this.size + this.activeIndex + increment) % this.size;
		this.slide(target, increment > 0);
	},

	slide : function(targetIndex, next) {
		if (next) {
			startClass = "next";
			endClass = "prev";
		} else {
			startClass = "prev";
			endClass = "next";
		}

		var $target = $(this.$items[targetIndex]);
		this.transition1(targetIndex, $target, startClass, endClass);
	},

	transition1 : function(targetIndex, $target, startClass, endClass) {
		$target.removeClass("prev next");

		var that = this;
		setTimeout(function() {
			that.transition2(targetIndex, $target, startClass, endClass);
		}, 0);
	},

	transition2 : function(targetIndex, $target, startClass, endClass) {
		$target.addClass(startClass);

		var that = this;
		setTimeout(function() {
			that.transition3(targetIndex, $target, startClass, endClass);
		}, 0);
	},

	transition3 : function(targetIndex, $target, startClass, endClass) {
		$target.addClass("active");
		this.$active.addClass(endClass);
		$target.removeClass(startClass);
		this.$active.removeClass("active");

		this.markActive(targetIndex, $target);
		this.$element.trigger("item-change", [ targetIndex, $target ]);
	}
};

function initializeFromHash($gallery) {
	var hashItemTag = window.location.hash.substring(1);
	var $galleryItems = $gallery.find(".item");
	var hashItemIndex = Number(hashItemTag);

	var hashItem = $galleryItems[0]; // Crappy Eclipse JS code analysis
	if (!isNaN(hashItemIndex)) {
		hashItem = $galleryItems[hashItemIndex];
	} else if (hashItemTag) {
		var $hashItemsByTitle = $galleryItems.filter('[title="' + hashItemTag
				+ '"]');
		if ($hashItemsByTitle) {
			hashItem = $hashItemsByTitle[0];
		}
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

	if (hashItemIndex != gallery.activeIndex)
		gallery.slide(hashItemIndex, hashItemIndex > gallery.activeIndex);
}

$(function() {
	$mainGallery = $("#gallery-main");
	initializeFromHash($mainGallery);

	$(".gallery").each(function(index, element) {
		var $element = $(element);
		var gallery = new Gallery($element);
		$element.data("gallery", gallery);
		gallery.init();
	});

	$(".nav .active").click(function(event) {
		event.preventDefault();
	});

	window.onhashchange = function() {
		updateFromHash($mainGallery);
	};

	$mainGallery.on("item-change", function(event, targetIndex, $target) {
		var itemTag = $target.attr("title");
		if (!itemTag)
			itemTag = targetIndex;

		window.location.hash = itemTag;
	});
});