!function($) {
	var CONTACTS_PER_ROW = 4;
	var CONTACTS_PER_COL = 4;
	var CONTACTS_PER_PAGE = CONTACTS_PER_ROW * CONTACTS_PER_COL;

	var SLIDESHOW = "slideshow";
	var CONTACT_SHEET = "contact-sheet";
	var GALLERY_TYPES = [ SLIDESHOW, CONTACT_SHEET ];
	var NUM_GALLERY_TYPES = GALLERY_TYPES.length;

	var Gallery = function($element) {
		this.$element = $element;
	};

	Gallery.prototype = {
		init : function() {
			this.galleryTypeDrawn = null;
			this.offsetX = null;
			this.offsetY = null;

			if (this.$element.hasClass(CONTACT_SHEET))
				this.galleryType = CONTACT_SHEET;
			else
				this.galleryType = SLIDESHOW;

			this.$items = this.$element.find(".item");
			this.size = this.$items.length;
			this.$itemHolder = this.$element.find(".item-holder");

			this.itemIndexToPageSpec = [];
			var $sections = this.$element.find("section");
			var page = 0;
			for ( var i = 0; i < $sections.length; i++) {
				var j = 0;
				var sectionLength = $($sections[i]).children().length;
				while (j < sectionLength) {
					for ( var k = 0; k < CONTACTS_PER_PAGE && j < sectionLength; j++, k++)
						this.itemIndexToPageSpec.push([ page, k ]);
					page++;
				}
			}

			this.setActive(this.$items.index(this.$items.filter(".active")));

			this.$element.find(".item").click(this.itemClick());

			this.$nextControl = this.$element.find(".control.next");
			this.$prevControl = this.$element.find(".control.prev");
			this.$nextControl.click(this.showNext());
			this.$prevControl.click(this.showPrev());

			this.$element.find(".control.contact-sheet").click(
					this.toggleContactSheet());
		},

		setActive : function(indexActive) {
			this.indexActive = indexActive;
			this.$active = $(this.$items[indexActive]);

			this.section = this.$active.parent()[0];

			this.draw();
		},

		draw : function() {
			this.$items.filter(".active").removeClass("active");
			this.$active.addClass("active");

			// if (this.galleryTypeDrawn != this.galleryType) {
			// this.setOffsets();
			//
			if (this.galleryType == CONTACT_SHEET) {
				for ( var i = 0; i < this.size; i++)
					this.positionContact(i, this.$items[i]);
			} else {
				for ( var i = 0; i < this.size; i++)
					this.positionSlide(i, this.$items[i]);
			}
			// this.galleryTypeDrawn = this.galleryType;
			// }

			if (this.galleryType == CONTACT_SHEET) {
				var activePage = this.itemIndexToPageSpec[this.indexActive][0];
				var x = -this.offsetX - 125 * CONTACTS_PER_COL * activePage
						- 187.5;
				var y = -this.offsetY - 187.5;
				this.$itemHolder.css("transform", "scale(0.2) translate(" + x
						+ "%, " + y + "%)");

				this.nextIndex = this.incrementSheet(1);
				this.prevIndex = this.incrementSheet(-1);
			} else {
				// var x = this.offsetX - 125 * this.indexActive;
				// var y = -this.offsetY;
				// this.$itemHolder.css("transform", "translate(" + x + "%, " +
				// y
				// + "%)");
				//
				this.nextIndex = this.incrementSlide(1);
				this.prevIndex = this.incrementSlide(-1);
			}

			this.nextSection = $(this.$items[this.nextIndex]).parent()[0];
			this.prevSection = $(this.$items[this.prevIndex]).parent()[0];

			for ( var i = 0; i < NUM_GALLERY_TYPES; i++) {
				var galleryType = GALLERY_TYPES[i];
				this.$element.toggleClass(galleryType,
						galleryType == this.galleryType);
			}

			this.$element.trigger("galleryupdate", this);
		},

		setOffsets : function() {
			if (this.galleryTypeDrawn == null) {
				this.offsetX = 0;
				this.offsetY = 0;
			} else {
				var activeSpec = this.itemIndexToPageSpec[this.indexActive];
				var pageIndex = activeSpec[0];
				var contactIndex = activeSpec[1];
				var rowIndex = Math.floor(contactIndex / CONTACTS_PER_ROW);
				var colIndex = contactIndex % CONTACTS_PER_ROW;

				if (this.galleryType == CONTACT_SHEET
						&& this.galleryTypeDrawn == SLIDESHOW) {
					this.offsetX += (this.indexActive - colIndex - CONTACTS_PER_COL
							* pageIndex) * 125;
					this.offsetY -= rowIndex * 125;

				} else if (this.galleryType == SLIDESHOW
						&& this.galleryTypeDrawn == CONTACT_SHEET) {
					this.offsetX += (CONTACTS_PER_COL * pageIndex + colIndex - this.indexActive) * 125;
					this.offsetY += rowIndex * 125;
				}
			}
		},

		positionContact : function(i, item) {
			var $item = $(item);
			var pageSpec = this.itemIndexToPageSpec[i];
			var pageIndex = pageSpec[0];
			var contactIndex = pageSpec[1];

			var rowIndex = Math.floor(contactIndex / CONTACTS_PER_ROW);
			var colIndex = contactIndex % CONTACTS_PER_ROW;

			var x = this.offsetX + (CONTACTS_PER_COL * pageIndex + colIndex)
					* 125;
			var y = this.offsetY + rowIndex * 125;

			var transform = "translate(" + x + "%, " + y + "%)";
			$item.css("transform", transform);
		},

		positionSlide : function(i, item) {
			var $item = $(item);
			var x = 125 * (i - this.indexActive);
			// $item.css("transform", "translate(" + x + "%, " + this.offsetY
			// + "%)");
			$item.css("transform", "translateX(" + x + "%) translateZ(0)");
		},

		incrementSheet : function(increment) {
			var nextIndex = this.indexActive;
			var activePage = this.itemIndexToPageSpec[this.indexActive][0];
			while (this.itemIndexToPageSpec[nextIndex][0] == activePage)
				nextIndex = this.incrementIndex(nextIndex, increment);

			return nextIndex;
		},

		incrementSlide : function(increment) {
			return this.incrementIndex(this.indexActive, increment);
		},

		incrementIndex : function(index, increment) {
			return (this.size + index + increment) % this.size;
		},

		itemClick : function() {
			var that = this;
			return function(event) {
				if (that.galleryType == CONTACT_SHEET) {
					that.galleryType = SLIDESHOW;
					that.setActive(that.$items.index(this));
				} else {
					that.setActive(that.nextIndex);
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

		if (hashItemIndex != gallery.indexActive) {
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
				itemTag = gallery.indexActive;

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
}($);