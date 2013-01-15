!function($) {
	var CONTACTS_PER_ROW = 4;
	var CONTACTS_PER_COL = 4;
	var CONTACTS_PER_PAGE = CONTACTS_PER_ROW * CONTACTS_PER_COL;

	var SLIDESHOW = "slideshow";
	var CONTACT_SHEET = "contact-sheet";
	var GALLERY_TYPES = [ SLIDESHOW, CONTACT_SHEET ];
	var NUM_GALLERY_TYPES = GALLERY_TYPES.length;

	var TRANSITION_DELAY_MSEC = 750;

	// iOS devices really do not like animating all the transforms below. Need
	// to just manipulate left/top/width/height for them
	var DEVICE_IS_IOS = !!navigator.userAgent.match(/(iPad|iPhone|iPod)/i);

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
			var $sections = this.$element.find("section");
			var page = 0;
			for ( var i = 0; i < $sections.length; i++) {
				var j = 0;
				var sectionLength = $($sections[i]).children().length;
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

			// Reset hack below
			for ( var i = 0; i < this.size; i++)
				this.$item[i].css("transition", "");

			if (this.galleryType == CONTACT_SHEET) {
				var activePage = this.pageSpecs[this.iActive][0];
				var fast;
				if (this.galleryTypeDrawn == SLIDESHOW) {
					this.pageOffsetX = this.offsetX + 100 * activePage;
					fast = true;
					if (!DEVICE_IS_IOS)
						setTimeout(this.drawBound, TRANSITION_DELAY_MSEC);
				} else
					fast = false;

				for ( var i = 0; i < this.size; i++)
					this.positionContact(i, fast);

				this.offsetX = -100 * activePage + this.pageOffsetX;
				this.$itemHolder.css("transform", "translateX(" + this.offsetX
						+ "%) translateZ(0)");

				this.iNext = this.incrementSheet(1);
				this.iPrev = this.incrementSheet(-1);
			} else {
				for ( var i = 0; i < this.size; i++)
					this.positionSlide(i);

				this.pageOffsetX = this.offsetX;

				// If transitioning into slideshow, only animate nearby items
				if (this.galleryTypeDrawn != this.galleryType) {
					for ( var i = 0; i < this.size; i++) {
						if (i < this.iActive - 2 || i > this.iActive + 2)
							this.$item[i].css("transition", "none");
					}
				}

				this.iNext = this.incrementSlide(1);
				this.iPrev = this.incrementSlide(-1);
			}
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

		positionContact : function(i, fast) {
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

			if (DEVICE_IS_IOS) {
				$item.css("left", x + 40 + "%");
				$item.css("top", y + 40 + "%");
				$item.css("width", "20%");
				$item.css("height", "20%");
			} else {
				var transform;
				if (fast)
					transform = "translate3d(" + x + "%, " + y
							+ "%, 0) scale3d(0.2, 0.2, 1)";
				else
					transform = "translate(" + x + "%, " + y + "%) scale(0.2)";
				$item.css("transform", transform);
			}
		},

		positionSlide : function(i) {
			var $item = this.$item[i];
			var x = 125 * (i - this.iActive) - this.offsetX;

			if (DEVICE_IS_IOS) {
				$item.css("left", x + "%");
				$item.css("top", "");
				$item.css("width", "");
				$item.css("height", "");
			} else {
				$item.css("transform", "translate3d(" + x + "%, 0, 0)");
			}
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

	function initializeFromHash($gallery) {
		var parsedHash = parseHash();
		for ( var i = 0; i < NUM_GALLERY_TYPES; i++) {
			var galleryType = GALLERY_TYPES[i];
			$gallery.toggleClass(galleryType, galleryType == parsedHash[0]);
		}

		var hashItemTag = parsedHash[1];

		var hashItemIndex = Number(hashItemTag);
		var $galleryItems = $gallery.find(".item");

		var hashItem;
		if (!isNaN(hashItemIndex)) {
			hashItem = $galleryItems[hashItemIndex];
		} else {
			var $hashItemsByTitle = $galleryItems.filter('[title="'
					+ hashItemTag + '"]');
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
			var $hashItemsByTitle = $items.filter('[title="' + hashItemTag
					+ '"]');
			if ($hashItemsByTitle) {
				hashItemIndex = $items.index($hashItemsByTitle[0]);
			} else
				hashItemIndex = 0;
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

		var $sections = $("#portfolios");
		var $sectionHeaders = $sections.children();
		var $sectionsHeader = $sections.parent().parent();
		var activeSection = undefined;
		var previewSectionIncrement = 0;
		var sectionRecentlyChanged = 0;

		function $sectionHeader(section) {
			return $sectionHeaders.find('a[href$="#' + section.id + '"]')
					.parent();
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
				itemTag = gallery.iActive;

			var hash;
			if (gallery.galleryType == CONTACT_SHEET)
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

			var $section = $("section" + this.hash);
			var sectionItem = $section.children()[0];
			var sectionItemIndex = galleryMain.$items.index(sectionItem);
			galleryMain.setActive(sectionItemIndex);
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
}($);