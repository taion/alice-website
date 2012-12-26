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

$(function() {
	var initialItemTag = window.location.hash.substring(1);
	var $mainGalleryItems = $("#gallery-main .item");
	var initialItemIndex = Number(initialItemTag);

	var initialItem = $mainGalleryItems[0]; // Crappy Eclipse JS code analysis
	if (!isNaN(initialItemIndex)) {
		initialItem = $mainGalleryItems[initialItemIndex];
	} else if (initialItemTag) {
		var $initialItemsByTitle = $mainGalleryItems.filter('[title="'
				+ initialItemTag + '"]');
		if ($initialItemsByTitle) {
			initialItem = $initialItemsByTitle[0];
		}
	}
	$(initialItem).addClass("active");

	$(".gallery").each(function(index, element) {
		var $element = $(element);
		var gallery = new Gallery($element);
		$element.data("gallery", gallery);
		gallery.init();
	});

	$("#gallery-main").on("item-change", function(event, targetIndex, $target) {
		var itemTag = $target.attr("title");
		if (!itemTag)
			itemTag = targetIndex;

		window.location.hash = itemTag;
	});
});