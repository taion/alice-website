var Portfolio = function() {
	var DISPLAY_MODE_BASE = 0;
	var DISPLAY_MODE_SECTION = 1;

	function initializeShuffleHolder(length) {
		holder = Array(length);
		for ( var i = 0; i < length; i++)
			holder[i] = Array(2);

		return holder;
	}

	function shuffle(result, holder) {
		for ( var i = 0; i < result.length; i++) {
			holder[i][0] = Math.random();
			holder[i][1] = i;
		}
		holder.sort(sortShuffle);

		for ( var i = 0; i < result.length; i++)
			result[i] = holder[i][1];
	}

	function sortShuffle(th1, th2) {
		return th1[0] - th2[0];
	}

	function Portfolio($element, data) {
		this.$element = $element;
		this.data = data;
	}

	Portfolio.prototype = {
		init : function() {
			this.bindMethods();

			this.initArgs();

			this.initThumbs();
			this.initLightbox();
			this.initState();

			this.drawBaseGallery();

			this.bindControls();
		},

		bindMethods : function() {
			this.animateDraw = this.animateDraw.bind(this);
			this.startAnimateDraw = this.startAnimateDraw.bind(this);
			this.midAnimateDraw = this.midAnimateDraw.bind(this);

			this.cycleBaseGallery = this.cycleBaseGallery.bind(this);

			this.targetsThis = this.getBoundTargetsThis();

			this.onBaseLinkClick = this.onBaseLinkClick.bind(this);
			this.onSectionLinkClick = this.onSectionLinkClick.bind(this);

			this.onThumbnailClick = this.onThumbnailClick.bind(this);
			this.animateShowLightbox = this.animateShowLightbox.bind(this);
			this.onLightboxClick = this.onLightboxClick.bind(this);
			this.startHideLightbox = this.startHideLightbox.bind(this);
			this.hideLightbox = this.hideLightbox.bind(this);
		},

		initArgs : function() {
			this.baseRows = this.$element.data("base-rows");
			this.cols = this.$element.data("cols");

			this.transitionMillis = this.$element.data("transition-millis");
			this.transitionStyle = "all " + this.transitionMillis / 1000 + "s";

			this.cycleMillis = this.$element.data("cycle-millis");
			/*
			 * Animations get messed up if cycle delay is shorter than
			 * transition duration.
			 */
			if (this.cycleMillis <= this.transitionMillis)
				throw "cycle delay must exceed transition duration";

		},

		initThumbs : function() {
			this.thumbsCount = this.baseRows * this.cols;
			this.$thumbs = Array();

			var width = 100 / this.cols + "%";
			var height = 100 / this.baseRows + "%";

			// section name -> [section start, section end)
			this.sections = Object();

			for ( var i = 0; i < this.data.length; i++) {
				var sectionData = this.data[i];
				var sectionItems = sectionData.items;

				this.sections[sectionData.title] = [ this.$thumbs.length,
						undefined ];

				for ( var j = 0; j < sectionItems.length; j++) {
					var imageData = sectionItems[j];
					var $thumb = this.makeThumb(imageData.title, imageData.url,
							width, height, this.transitionStyle);

					this.$thumbs.push($thumb);
					this.$element.append($thumb);
				}

				this.sections[sectionData.title][1] = this.$thumbs.length;
			}

			this.imagesCount = this.$thumbs.length;

			/*
			 * Make sure we have enough thumbnail elements that we can rotate
			 * them without losing some.
			 */
			if (this.imagesCount < this.thumbsCount * 2)
				throw "too few images for gallery";
		},

		makeThumb : function(title, url, width, height, transition) {
			var $inner = $("<div />").attr("title", title).addClass(
					"jjp-thumbnail-inner").css("background-image",
					"url(" + url + ")").data("target", url);
			var $thumb = $("<figure />").addClass("jjp-thumbnail").append(
					$inner).data("$inner", $inner);

			$inner.css("transition", transition);
			$thumb.css({
				"width" : width,
				"height" : height,
				"transition" : transition,
			});

			return $thumb;
		},

		initLightbox : function() {
			this.$lightboxImage = $("<img />").addClass("jjp-lightbox-image")
					.css("transition", this.transitionStyle);
			this.$lightbox = $("<figure />").addClass("jjp-lightbox").css(
					"transition", this.transitionStyle).append(
					this.$lightboxImage);
			this.$element.append(this.$lightbox);
		},

		initState : function() {
			this.drawnIndex = Array(this.imagesCount);
			this.nextDrawnIndex = Array(this.imagesCount);
			for ( var i = 0; i < this.imagesCount; i++)
				this.drawnIndex[i] = this.nextDrawnIndex[i] = -1;

			this.thumbsDisplayIndexHolder = initializeShuffleHolder(this.imagesCount);
			this.thumbsDisplayIndex = Array(this.imagesCount);

			this.toHideCount = this.toShowCount = this.toMoveCount = 0;
			this.$toHide = Array(this.imagesCount);
			this.$toShow = Array(this.imagesCount);
			this.$toMove = Array(this.imagesCount);
			this.toMoveLocation = Array(this.imagesCount);

			this.nextThumbsHolder = initializeShuffleHolder(this.thumbsCount);
			this.nextThumbs = Array(this.thumbsCount);

			this.nextThumbIndexIndex = 0;
			this.thumbBatchStart = 0;

			this.activeInterval = undefined;
			this.activeTimeout = undefined;
		},

		drawBaseGallery : function() {
			this.clear();
			this.displayMode = DISPLAY_MODE_BASE;

			// Display thumbnails in a random order.
			shuffle(this.thumbsDisplayIndex, this.thumbsDisplayIndexHolder);
			for ( var i = 0; i < this.thumbsCount; i++)
				this.nextDrawnIndex[this.thumbsDisplayIndex[i]] = i;

			this.thumbBatchStart = 0;
			this.prepareNextThumbs();

			this.activeInterval = setInterval(this.cycleBaseGallery,
					this.cycleMillis);

			this.draw();
		},

		clear : function() {
			clearTimeout(this.activeTimeout);
			clearInterval(this.activeInterval);

			for ( var i = 0; i < this.imagesCount; i++) {
				var $thumb = this.$thumbs[i];
				$thumb.data("$inner").removeClass(
						"is-pre-transition is-post-transition");
				$thumb.toggleClass("is-visible", this.drawnIndex[i] >= 0);

				this.nextDrawnIndex[i] = -1;
			}
		},

		draw : function() {
			this.toHideCount = this.toShowCount = this.toMoveCount = 0;

			for ( var i = 0; i < this.imagesCount; i++) {
				var $thumb = this.$thumbs[i];
				if (this.nextDrawnIndex[i] >= 0) {
					if (this.drawnIndex[i] < 0) {
						this.$toShow[this.toShowCount++] = $thumb;

						$thumb.addClass("is-visible");
						$thumb.data("$inner").addClass("is-pre-transition");

						this.positionThumb($thumb, this.nextDrawnIndex[i]);
					} else if (this.drawnIndex[i] != this.nextDrawnIndex[i]) {
						this.toMoveLocation[this.toMoveCount] = this.nextDrawnIndex[i];
						this.$toMove[this.toMoveCount++] = $thumb;
					}
				} else if (this.drawnIndex[i] >= 0)
					this.$toHide[this.toHideCount++] = $thumb;
			}

			this.setTimeout(this.animateDraw, 0);
		},

		setTimeout : function(callback, timeoutMillis) {
			this.activeTimeout = setTimeout(callback, timeoutMillis);
		},

		animateDraw : function() {
			for ( var i = 0; i < this.toHideCount; i++)
				this.$toHide[i].data("$inner").addClass("is-post-transition");

			for ( var i = 0; i < this.toShowCount; i++)
				this.$toShow[i].data("$inner").removeClass("is-pre-transition");

			for ( var i = 0; i < this.toMoveCount; i++)
				this.positionThumb(this.$toMove[i], this.toMoveLocation[i]);

			this.setTimeout(this.startAnimateDraw, 0);
		},

		startAnimateDraw : function() {
			this.setTimeout(this.midAnimateDraw, this.transitionMillis * 0.55);
		},

		midAnimateDraw : function() {
			for ( var i = 0; i < this.imagesCount; i++)
				this.drawnIndex[i] = this.nextDrawnIndex[i];

			for ( var i = 0; i < this.toHideCount; i++) {
				var $thumb = this.$toHide[i];
				$thumb.data("$inner").removeClass("is-post-transition");
				$thumb.removeClass("is-visible");
			}
		},

		positionThumb : function($thumb, location) {
			$thumb.data({
				"row" : Math.floor(location / this.cols),
				"col" : location % this.cols
			});
			this.drawThumb($thumb);
		},

		drawThumb : function($thumb) {
			$thumb.css("transform", "translateX(" + $thumb.data("col") * 100
					+ "%) translateY(" + $thumb.data("row") * 100 + "%)");
		},

		prepareNextThumbs : function() {
			shuffle(this.nextThumbs, this.nextThumbsHolder);

			this.thumbBatchStart += this.thumbsCount;
			this.nextThumbIndexIndex = 0;
		},

		cycleBaseGallery : function() {
			if (this.nextThumbIndexIndex == this.thumbsCount)
				this.prepareNextThumbs();

			var thumbIndex = this.nextThumbs[this.nextThumbIndexIndex];
			var imageIndex = this.thumbBatchStart + thumbIndex;

			this.nextDrawnIndex[this.getThumbIndex(imageIndex)] = thumbIndex;
			this.nextDrawnIndex[this.getThumbIndex(imageIndex
					- this.thumbsCount)] = -1;

			this.nextThumbIndexIndex++;

			this.draw();
		},

		getThumbIndex : function(imageIndex) {
			return this.thumbsDisplayIndex[imageIndex % this.imagesCount];
		},

		drawSectionGallery : function(sectionName) {
			this.clear();
			this.displayMode = DISPLAY_MODE_SECTION;

			var section = this.sections[sectionName];
			var i0 = section[0];
			var i1 = section[1];

			for ( var i = i0; i < i1; i++)
				this.nextDrawnIndex[i] = i - i0;

			this.draw();
		},

		bindControls : function() {
			$(".jjp-base-link").filter(this.targetsThis).click(
					this.onBaseLinkClick);
			$(".jjp-section-link").filter(this.targetsThis).click(
					this.onSectionLinkClick);

			var thumbs = Array(this.imagesCount);
			for ( var i = 0, k = 0; i < this.imagesCount; i++) {
				var elements = this.$thumbs[i].data("$inner").get();
				for ( var j = 0; j < elements.length; j++, k++)
					thumbs[k] = elements[j];
			}
			$(thumbs).click(this.onThumbnailClick);

			this.$lightbox.click(this.onLightboxClick);
		},

		getBoundTargetsThis : function() {
			var $element = this.$element;

			return function() {
				return $($(this).data("target")).is($element);
			};
		},

		onBaseLinkClick : function(event) {
			event.preventDefault();
			this.drawBaseGallery();
		},

		onSectionLinkClick : function(event) {
			event.preventDefault();
			this.drawSectionGallery(event.currentTarget.hash.substr(1));
		},

		onThumbnailClick : function(event) {
			this.clear();

			var $thumbInner = $(event.currentTarget);
			var thumbInnerOffset = $thumbInner.offset();

			var $window = $(window);
			var x = thumbInnerOffset.top - $window.scrollTop();
			var y = thumbInnerOffset.left - $window.scrollLeft();

			this.$lightboxImage.css({
				"top" : x + "px",
				"left" : y + "px",
				"width" : $thumbInner.width() + "px",
				"height" : $thumbInner.height() + "px"
			});
			this.$lightboxImage.attr("src", $thumbInner.data("target"));

			this.$lightbox.addClass("is-visible is-pre-transition");
			this.$lightboxImage.addClass("is-visible");

			this.setTimeout(this.animateShowLightbox, 0);
		},

		animateShowLightbox : function() {
			this.$lightbox.removeClass("is-pre-transition");
			this.$lightboxImage.addClass("is-expanded");
		},

		onLightboxClick : function(event) {
			this.$lightbox.addClass("is-post-transition");
			this.$lightboxImage.removeClass("is-expanded");

			this.setTimeout(this.startHideLightbox, 0);
		},

		startHideLightbox : function(event) {
			this.setTimeout(this.hideLightbox, this.transitionMillis);
		},

		hideLightbox : function(event) {
			this.$lightbox.removeClass("is-visible is-post-transition");
			this.$lightboxImage.removeClass("is-visible");
		}
	};

	function loadPortfolio(index, element) {
		var $element = $(element);
		$.get($element.data("contents-url"), function(rawData) {
			var data = JSON.parse(rawData);
			var portfolio = new Portfolio($element, data);
			portfolio.init();
		});
	}

	$(".jjp-portfolio").each(loadPortfolio);
}();
