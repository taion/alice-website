var Gallery = function($element) {
	this.$element = $element;
};

Gallery.prototype = {
	CONTACTS_PER_PAGE : 16,
	CONTACTS_PER_ROW : 4,
	CONTACTS_PER_COL : 4,

	init : function() {
		this.galleryType = this.$element.attr("gallery-type");

		this.$items = this.$element.find(".item");
		this.size = this.$items.length;

		this.itemIndexToPageSpec = [];
		var $sections = this.$element.find("section");
		var page = 0;
		for ( var i = 0; i < $sections.length; i++) {
			var j = 0;
			var sectionLength = $($sections[i]).children().length;
			while (j < sectionLength) {
				for ( var k = 0; k < this.CONTACTS_PER_PAGE
						&& j < sectionLength; j++, k++)
					this.itemIndexToPageSpec.push([ page, k ]);
				page++;
			}
		}

		this.setActive(this.$items.index(this.$items.filter(".active")));

		this.ignoreGalleryClick = 0;

		this.$element.find(".gallery-inner").click(this.galleryClick());
		this.$element.find(".item").click(this.itemClick());
		this.$element.find(".control.next").click(this.controlDirection(1));
		this.$element.find(".control.prev").click(this.controlDirection(-1));

		this.$element.find(".control.contact-sheet").click(
				this.toggleContactSheet());
	},

	setActive : function(activeIndex) {
		this.activeIndex = activeIndex;
		this.$active = $(this.$items[activeIndex]);

		this.$section = this.$active.parent();

		this.draw();
	},

	draw : function() {
		this.$element.attr("gallery-type", this.galleryType);

		this.$items.filter(".active").removeClass("active");
		this.$active.addClass("active");

		if (this.galleryType == "contact-sheet") {
			for ( var i = 0; i < this.size; i++)
				this.positionContact(i, this.$items[i]);
		} else {
			for ( var i = 0; i < this.size; i++)
				this.positionSlide(i, this.$items[i]);
		}

		this.$element.trigger("galleryupdate", this);
	},

	positionContact : function(i, item) {
		var $item = $(item);
		var pageSpec = this.itemIndexToPageSpec[i];
		var pageIndex = pageSpec[0];
		var activePageIndex = this.itemIndexToPageSpec[this.activeIndex][0];
		var contactIndex = pageSpec[1];

		var relPage = pageIndex - activePageIndex;
		var rowIndex = Math.floor(contactIndex / this.CONTACTS_PER_ROW);
		var colIndex = contactIndex % this.CONTACTS_PER_ROW;

		var top = (rowIndex / this.CONTACTS_PER_COL) * 100 + "%";
		var left = (relPage + colIndex / this.CONTACTS_PER_ROW) * 100 + "%";

		$item.css("top", top);
		$item.css("left", left);
	},

	positionSlide : function(i, item) {
		var $item = $(item);
		$item.css("top", 0);
		$item.css("left", 100 * (i - this.activeIndex) + "%");
	},

	galleryClick : function() {
		var that = this;
		return function(event) {
			if (that.galleryType == "slideshow")
				if (that.ignoreGalleryClick)
					that.ignoreGalleryClick--;
				else
					that.incrementSlide(1);
		};
	},

	itemClick : function() {
		var that = this;
		return function(event) {
			if (that.galleryType == "contact-sheet") {
				that.galleryType = "slideshow";
				that.setActive(that.$items.index(this));
				that.ignoreGalleryClick++;
			}
		};
	},

	controlDirection : function(increment) {
		var that = this;
		return function(event) {
			event.preventDefault();

			if (that.galleryType == "contact-sheet")
				that.incrementSheet(increment);
			else
				that.incrementSlide(increment);
		};
	},

	incrementSheet : function(increment) {
		var nextIndex = this.activeIndex;
		var activePage = this.itemIndexToPageSpec[this.activeIndex][0];
		while (this.itemIndexToPageSpec[nextIndex][0] == activePage)
			nextIndex = this.incrementIndex(nextIndex, increment);

		this.setActive(nextIndex);
	},

	incrementSlide : function(increment) {
		this.setActive(this.incrementIndex(this.activeIndex, increment));
	},

	incrementIndex : function(index, increment) {
		return (this.size + index + increment) % this.size;
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

function parseHash() {
	var hashContents = window.location.hash.substring(1);
	var hashItemTag, galleryType;

	if (hashContents.indexOf("contact:") == 0) {
		galleryType = "contact-sheet";
		hashItemTag = hashContents.substring(8); // Length of "contact:"
	} else {
		galleryType = "slideshow";
		hashItemTag = hashContents;
	}

	return [ galleryType, hashItemTag ];
}

function initializeFromHash($gallery) {
	var parsedHash = parseHash();
	$gallery.attr("gallery-type", parsedHash[0]);
	var hashItemTag = parsedHash[1];

	var hashItemIndex = Number(hashItemTag);
	var $galleryItems = $gallery.find(".item");

	var hashItem;
	if (!isNaN(hashItemIndex)) {
		hashItem = $galleryItems[hashItemIndex];
	} else {
		var $hashItemsByTitle = $galleryItems.filter('[title="' + hashItemTag
				+ '"]');
		if ($hashItemsByTitle.length)
			hashItem = $hashItemsByTitle[0];
		else
			hashItem = $galleryItems[0];
	}
	$(hashItem).addClass("active");
}

function updateFromHash($gallery) {
	var parsedHash = parseHash();
	var galleryType = parsedHash[0];
	var hashItemTag = parsedHash[1];

	var gallery = $gallery.data("gallery");
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
		gallery.galleryType = galleryType;
		gallery.setActive(hashItemIndex);
	} else if (gallery.galleryType != galleryType) {
		gallery.galleryType = galleryType;
		gallery.draw();
	}
}

$(function() {
	var $galleryMain = $("#gallery-main");
	initializeFromHash($galleryMain);

	var $sectionHeaders = $("#portfolios li");
	var ignoreHashChange = 0;
	$galleryMain.on("galleryupdate", function(event, gallery) {
		$sectionHeaders.removeClass("active");
		$sectionHeaders.find('[href$="#' + gallery.$section[0].id + '"]')
				.parent().addClass("active");

		var itemTag = gallery.$active.attr("title");
		if (!itemTag)
			itemTag = gallery.activeIndex;

		var hash;
		if (gallery.galleryType == "contact-sheet")
			hash = "#contact:" + itemTag;
		else
			hash = "#" + itemTag;

		if (window.location.hash != hash) {
			ignoreHashChange++;
			window.location.hash = hash;
		}
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

	$(".nav a").click(function(event) {
		if ($(this).parent().hasClass("active"))
			event.preventDefault();
	});

	var galleryMain = $galleryMain.data("gallery");
	$("#portfolios a").click(function(event) {
		event.preventDefault();

		var $this = $(this);
		if (!$this.parent().hasClass("active")) {
			var $section = $("section" + this.hash);
			var sectionItem = $section.children()[0];
			var sectionItemIndex = galleryMain.$items.index(sectionItem);
			galleryMain.setActive(sectionItemIndex);
		}
	});
});
