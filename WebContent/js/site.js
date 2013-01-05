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

		this.$nextControl = this.$element.find(".control.next");
		this.$prevControl = this.$element.find(".control.prev");
		this.$nextControl.click(this.showNext());
		this.$prevControl.click(this.showPrev());

		this.$element.find(".control.contact-sheet").click(
				this.toggleContactSheet());
	},

	setActive : function(activeIndex) {
		this.activeIndex = activeIndex;
		this.$active = $(this.$items[activeIndex]);

		this.section = this.$active.parent()[0];

		this.draw();
	},

	draw : function() {
		this.$element.attr("gallery-type", this.galleryType);

		this.$items.filter(".active").removeClass("active");
		this.$active.addClass("active");

		if (this.galleryType == "contact-sheet") {
			for ( var i = 0; i < this.size; i++)
				this.positionContact(i, this.$items[i]);

			this.nextIndex = this.incrementSheet(1);
			this.prevIndex = this.incrementSheet(-1);
		} else {
			for ( var i = 0; i < this.size; i++)
				this.positionSlide(i, this.$items[i]);

			this.nextIndex = this.incrementSlide(1);
			this.prevIndex = this.incrementSlide(-1);
		}

		this.nextSection = $(this.$items[this.nextIndex]).parent()[0];
		this.prevSection = $(this.$items[this.prevIndex]).parent()[0];

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

	incrementSheet : function(increment) {
		var nextIndex = this.activeIndex;
		var activePage = this.itemIndexToPageSpec[this.activeIndex][0];
		while (this.itemIndexToPageSpec[nextIndex][0] == activePage)
			nextIndex = this.incrementIndex(nextIndex, increment);

		return nextIndex;
	},

	incrementSlide : function(increment) {
		return this.incrementIndex(this.activeIndex, increment);
	},

	incrementIndex : function(index, increment) {
		return (this.size + index + increment) % this.size;
	},

	galleryClick : function() {
		var that = this;
		return function(event) {
			if (that.galleryType == "slideshow")
				if (that.ignoreGalleryClick)
					that.ignoreGalleryClick--;
				else
					that.setActive(that.nextIndex);
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

	showNext : function() {
		var that = this;
		return function(event) {
			event.preventDefault();
			that.setActive(that.nextIndex);
		};
	},

	showPrev : function() {
		var that = this;
		return function(event) {
			event.preventDefault();
			that.setActive(that.prevIndex);
		};
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

function updateFromHash(gallery) {
	var parsedHash = parseHash();
	var galleryType = parsedHash[0];
	var hashItemTag = parsedHash[1];

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

	$(".gallery").each(function(index, element) {
		var $element = $(element);
		var gallery = new Gallery($element);
		$element.data("gallery", gallery);

		if (element != $galleryMain[0])
			gallery.init();
	});
	var galleryMain = $galleryMain.data("gallery");

	var $sections = $("#portfolios");
	var $sectionHeaders = $sections.children();
	var $sectionsHeader = $sections.parent().parent();
	var activeSection = undefined;
	var previewSectionIncrement = 0;
	var sectionRecentlyChanged = 0;

	function $sectionHeader(section) {
		return $sectionHeaders.find('a[href$="#' + section.id + '"]').parent();
	}

	function drawSectionsTransient() {
		var previewSection;
		if (previewSectionIncrement > 0)
			previewSection = galleryMain.nextSection;
		else if (previewSectionIncrement < 0)
			previewSection = galleryMain.prevSection;
		else
			previewSection = activeSection;

		if (previewSection != activeSection || sectionRecentlyChanged)
			$sectionsHeader.addClass("reveal");
		else
			$sectionsHeader.removeClass("reveal");

		$sectionHeaders.removeClass("hover");
		if (previewSection != activeSection)
			$sectionHeader(previewSection).addClass("hover");
	}

	function maybeUnrevealSectionsOnChange() {
		sectionRecentlyChanged--;
		drawSectionsTransient();
	}

	var ignoreHashChange = 0;
	$galleryMain.on("galleryupdate", function(event, gallery) {
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

		var gallerySection = gallery.section;
		if (activeSection != gallerySection) {
			if (activeSection) {
				sectionRecentlyChanged++;
				setTimeout(maybeUnrevealSectionsOnChange, 2000);
			}

			$sectionHeaders.removeClass("active");
			$sectionHeader(gallerySection).addClass("active");
			activeSection = gallerySection;
		}

		drawSectionsTransient();
	});

	window.onhashchange = function() {
		if (ignoreHashChange)
			ignoreHashChange--;
		else
			updateFromHash(galleryMain);
	};

	galleryMain.init();

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

	galleryMain.$nextControl.mouseenter(function() {
		previewSectionIncrement = 1;
		drawSectionsTransient();
	});
	galleryMain.$prevControl.mouseenter(function() {
		previewSectionIncrement = -1;
		drawSectionsTransient();
	});

	function clearPreviewSection(nextSection) {
		previewSectionIncrement = 0;
		drawSectionsTransient();
	}
	galleryMain.$nextControl.mouseleave(clearPreviewSection);
	galleryMain.$prevControl.mouseleave(clearPreviewSection);

	$(".nav a").click(function(event) {
		if ($(this).parent().hasClass("active"))
			event.preventDefault();
	});

	$galleryMain.find(".gallery-inner").css("display", "block");
});
