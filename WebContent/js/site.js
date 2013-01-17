!function($) {
	var CONTACTS_PER_ROW = 4;
	var CONTACTS_PER_COL = 4;
	var CONTACTS_PER_PAGE = CONTACTS_PER_ROW * CONTACTS_PER_COL;

	var SLIDESHOW = "slideshow";
	var CONTACT_SHEET = "contact-sheet";
	var GALLERY_TYPES = [ SLIDESHOW, CONTACT_SHEET ];
	var NUM_GALLERY_TYPES = GALLERY_TYPES.length;

	// iOS devices really do not like animating all the transforms below. Need
	// to just manipulate left/top/width/height for them
	var DEVICE_IS_IOS = navigator.userAgent.match(/(iPad|iPhone|iPod)/i);
	var ANIMATE_CLASS = DEVICE_IS_IOS ? "animate-ios" : "animate";

	var Gallery = function($element) {
		this.$element = $element;
	};

	Gallery.prototype = {
		init : function() {
			this.galleryTypeDrawn = null;
			this.offsetX = 0;
			this.pageOffsetX = 0;

			if (this.$element.hasClass(CONTACT_SHEET))
				this.galleryType = CONTACT_SHEET;
			else
				this.galleryType = SLIDESHOW;

			this.$itemHolder = this.$element.find(".item-holder");
			this.$items = this.$element.find(".item");
			this.size = this.$items.length;
			this.$item = [];
			for ( var i = 0; i < this.size; i++)
				this.$item.push($(this.$items[i]));

			this.pageSpecs = [];
			this.$sections = this.$element.find("section");
			this.numSections = this.$sections.length;
			var page = 0;
			for ( var i = 0; i < this.numSections; i++) {
				var j = 0;
				var sectionLength = $(this.$sections[i]).children().length;
				while (j < sectionLength) {
					for ( var k = 0; k < CONTACTS_PER_PAGE && j < sectionLength; j++, k++)
						this.pageSpecs.push([ page, k ]);
					page++;
				}
			}

			var that = this;
			this.drawBound = function() {
				that.draw();
			};

			this.setActive(this.$items.index(this.$items.filter(".active")));

			this.$element.find(".item").click(this.itemClick());

			this.$nextControl = this.$element.find(".control.next");
			this.$prevControl = this.$element.find(".control.prev");
			this.$nextControl.click(this.showNext());
			this.$prevControl.click(this.showPrev());

			this.$element.find(".control.contact-sheet").click(
					this.toggleContactSheet());
		},

		setActive : function(iActive) {
			this.iActive = iActive;
			this.$active = this.$item[iActive];
			this.section = this.$active.parent()[0];

			this.draw();
		},

		draw : function() {
			this.$items.removeClass("active");
			this.$active.addClass("active");

			if (this.galleryType == CONTACT_SHEET) {
				var activePage = this.pageSpecs[this.iActive][0];

				if (this.galleryTypeDrawn != this.galleryType)
					this.pageOffsetX = this.offsetX + 100 * activePage;

				var animate = this.galleryTypeDrawn == SLIDESHOW;
				for ( var i = 0; i < this.size; i++) {
					var animateItem = animate
							&& this.pageSpecs[i][0] == activePage;
					this.positionContact(i, animateItem);
				}

				this.offsetX = -100 * activePage + this.pageOffsetX;

				this.iNext = this.incrementSheet(1);
				this.iPrev = this.incrementSheet(-1);
			} else {
				if (this.galleryTypeDrawn != this.galleryType)
					this.pageOffsetX = this.offsetX + 125 * this.iActive;

				// If transitioning into slideshow, only animate nearby items
				var animate = this.galleryTypeDrawn == CONTACT_SHEET;
				for ( var i = 0; i < this.size; i++) {
					var animateItem = animate && i >= this.iActive - 2
							&& i <= this.iActive + 2;
					this.positionSlide(i, animateItem);
				}

				this.offsetX = -125 * this.iActive + this.pageOffsetX;

				this.iNext = this.incrementSlide(1);
				this.iPrev = this.incrementSlide(-1);
			}
			this.$itemHolder.css("transform", "translateX(" + this.offsetX
					+ "%) translateZ(0)");

			this.galleryTypeDrawn = this.galleryType;

			this.nextSection = $(this.$items[this.iNext]).parent()[0];
			this.prevSection = $(this.$items[this.iPrev]).parent()[0];

			for ( var i = 0; i < NUM_GALLERY_TYPES; i++) {
				var galleryType = GALLERY_TYPES[i];
				this.$element.toggleClass(galleryType,
						galleryType == this.galleryType);
			}

			this.$element.trigger("galleryupdate", this);
		},

		positionContact : function(i, animate) {
			var $item = this.$item[i];
			var pageSpec = this.pageSpecs[i];
			var pageIndex = pageSpec[0];
			var contactIndex = pageSpec[1];
			var relPage = pageIndex;

			var rowIndex = Math.floor(contactIndex / CONTACTS_PER_ROW);
			var colIndex = contactIndex % CONTACTS_PER_ROW;

			var x = (relPage + colIndex / CONTACTS_PER_ROW) * 100
					- this.pageOffsetX - 37.5;
			var y = (rowIndex / CONTACTS_PER_COL) * 100 - 37.5;

			if (DEVICE_IS_IOS)
				$item.css({
					left : x + 40 + "%",
					top : y + 40 + "%",
					width : "20%",
					height : "20%"
				});
			else
				$item.css("transform", "translate(" + x + "%, " + y
						+ "%) scale(0.2)");
			$item.toggleClass(ANIMATE_CLASS, animate);
		},

		positionSlide : function(i, animate) {
			var $item = this.$item[i];
			var x = 125 * i - this.pageOffsetX;

			if (DEVICE_IS_IOS)
				$item.css({
					left : x + "%",
					top : "",
					width : "",
					height : ""
				});
			else
				$item.css("transform", "translate3d(" + x + "%, 0, 0)");
			$item.toggleClass(ANIMATE_CLASS, animate);
		},

		incrementSheet : function(increment) {
			var iNext = this.iActive;
			var activePage = this.pageSpecs[this.iActive][0];
			while (this.pageSpecs[iNext][0] == activePage)
				iNext = this.incrementIndex(iNext, increment);

			return iNext;
		},

		incrementSlide : function(increment) {
			return this.incrementIndex(this.iActive, increment);
		},

		incrementIndex : function(i, increment) {
			return (this.size + i + increment) % this.size;
		},

		itemClick : function() {
			var that = this;
			return function(event) {
				if (that.galleryType == CONTACT_SHEET) {
					that.galleryType = SLIDESHOW;
					that.setActive(that.$items.index(this));
				} else {
					that.setActive(that.iNext);
				}
			};
		},

		showNext : function() {
			var that = this;
			return function(event) {
				event.preventDefault();
				that.setActive(that.iNext);
			};
		},

		showPrev : function() {
			var that = this;
			return function(event) {
				event.preventDefault();
				that.setActive(that.iPrev);
			};
		},

		toggleContactSheet : function() {
			var that = this;
			return function(event) {
				event.preventDefault();

				if (that.galleryType == CONTACT_SHEET)
					that.galleryType = SLIDESHOW;
				else
					that.galleryType = CONTACT_SHEET;

				that.draw();
			};
		}
	};

	function parseHash() {
		var hashContents = window.location.hash.substring(1);
		var hashItemTag, galleryType;

		if (hashContents.indexOf("contact:") == 0) {
			galleryType = CONTACT_SHEET;
			hashItemTag = hashContents.substring(8); // Length of "contact:"
		} else {
			galleryType = SLIDESHOW;
			hashItemTag = hashContents;
		}

		return [ galleryType, hashItemTag ];
	}

	function itemFromHash(hashItemTag, $sections, $items) {
		var titleFilter = '[title="' + hashItemTag + '"]';

		var $candidate;
		if (($candidate = $sections.filter(titleFilter)).length)
			return $candidate.children()[0];
		else if (($candidate = $items.filter(titleFilter)).length)
			return $candidate[0];
		else
			return null;
	}

	function initializeFromHash($gallery) {
		var parsedHash = parseHash();
		for ( var i = 0; i < NUM_GALLERY_TYPES; i++) {
			var galleryType = GALLERY_TYPES[i];
			$gallery.toggleClass(galleryType, galleryType == parsedHash[0]);
		}

		var hashItemTag = parsedHash[1];

		var hashItemIndex = Number(hashItemTag);
		var $items = $gallery.find(".item");

		var hashItem;
		if (isNaN(hashItemIndex)) {
			var candidate = itemFromHash(hashItemTag, $gallery.find("section"),
					$items);
			hashItem = candidate ? candidate : $items[0];
		} else
			hashItem = $items[hashItemIndex];
		$(hashItem).addClass("active");
	}

	function updateFromHash(gallery) {
		var parsedHash = parseHash();
		var galleryType = parsedHash[0];
		var hashItemTag = parsedHash[1];

		var hashItemIndex = Number(hashItemTag);

		if (isNaN(hashItemIndex)) {
			var $items = gallery.$items;
			var candidate = itemFromHash(hashItemTag, gallery.$sections, $items);
			hashItemIndex = candidate ? $items.index(candidate) : 0;
		}

		if (hashItemIndex != gallery.iActive) {
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

		var $sectionHeadersGroup = $("#portfolios");
		var $sectionHeaders = $sectionHeadersGroup.children();
		var $sectionLinks = $sectionHeaders.children("a");
		var $sectionHeadersHolder = $sectionHeadersGroup.parent().parent();
		var activeSection = null;
		var previewSectionIncrement = 0;
		var sectionRecentlyChanged = 0;

		var $sectionHeader = {};
		var $sectionLink = [];
		for ( var i = 0; i < $sectionHeaders.length; i++) {
			var $thisSectionHeader = $($sectionHeaders[i]);
			var $thisSectionLink = $($sectionLinks[i]);

			var sectionTitle = $thisSectionLink.attr("href").substring(1);
			$sectionHeader[sectionTitle] = $thisSectionHeader;
			$sectionLink.push($thisSectionLink);
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
				$sectionHeadersHolder.addClass("reveal");
			else
				$sectionHeadersHolder.removeClass("reveal");

			$sectionHeaders.removeClass("hover");
			if (previewSection != activeSection)
				$sectionHeader[previewSection.title].addClass("hover");
		}

		function maybeUnrevealSectionsOnChange() {
			sectionRecentlyChanged--;
			drawSectionsTransient();
		}

		var ignoreHashChange = 0;
		$galleryMain.on("galleryupdate", function(event, gallery) {
			var itemTag = gallery.$active.attr("title");
			if (!itemTag)
				itemTag = gallery.iActive;

			var hash;
			if (gallery.galleryType == CONTACT_SHEET) {
				hash = "#contact:" + itemTag;
				for ( var i = 0; i < $sectionHeaders.length; i++) {
					var $thisSectionLink = $sectionLink[i];
					$thisSectionLink.attr("href", $thisSectionLink.attr("href")
							.replace(/#(?!contact:)/, "#contact:"));
				}
			} else {
				hash = "#" + itemTag;
				for ( var i = 0; i < galleryMain.numSections; i++) {
					var $thisSectionLink = $sectionLink[i];
					$thisSectionLink.attr("href", $thisSectionLink.attr("href")
							.replace("#contact:", "#"));
				}
			}

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
				$sectionHeader[gallerySection.title].addClass("active");
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

		$sectionLinks.click(function(event) {
			event.preventDefault();
			window.location.hash = this.hash;
		});

		galleryMain.$nextControl.mouseenter(function() {
			previewSectionIncrement = 1;
			drawSectionsTransient();
		});
		galleryMain.$prevControl.mouseenter(function() {
			previewSectionIncrement = -1;
			drawSectionsTransient();
		});

		function clearPreviewSection() {
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
}($);