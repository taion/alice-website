var Portfolio = function() {
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
			this.afterAnimateDraw = this.afterAnimateDraw.bind(this);

			this.animateCycle = this.animateCycle.bind(this);
			this.startAnimateCycle = this.startAnimateCycle.bind(this);
			this.midAnimateCycle = this.midAnimateCycle.bind(this);

			this.cycleBaseGallery = this.cycleBaseGallery.bind(this);

			this.targetsThis = this.getBoundTargetsThis();

			this.onBaseLinkClick = this.onBaseLinkClick.bind(this);
			this.onSectionLinkClick = this.onSectionLinkClick.bind(this);

			this.onThumbnailClick = this.onThumbnailClick.bind(this);
			this.animateShowLightbox = this.animateShowLightbox.bind(this);
			this.onLightboxClick = this.onLightboxClick.bind(this);
			this.onLightboxPrevClick = this.onLightboxPrevClick.bind(this);
			this.onLightboxNextClick = this.onLightboxNextClick.bind(this);
			this.startHideLightbox = this.startHideLightbox.bind(this);
			this.afterHideLightbox = this.afterHideLightbox.bind(this);

			this.onKeydown = this.onKeydown.bind(this);
			this.onHashChange = this.onHashChange.bind(this);
		},

		initArgs : function() {
			this.baseRows = this.$element.data("base-rows");
			this.cols = this.$element.data("cols");

			this.transitionMillis = this.$element.data("transition-millis");
			this.transitionStyle = "all " + this.transitionMillis / 1000
					+ "s ease-out";

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
				var sectionName = sectionData.title;
				var sectionItems = sectionData.items;

				var sectionStart = this.$thumbs.length;
				this.sections[sectionName] = [ sectionStart, null ];

				for ( var j = 0; j < sectionItems.length; j++) {
					var imageData = sectionItems[j];
					var $thumb = this.makeThumb(sectionStart + j,
							imageData.title, imageData.url, width, height,
							sectionName);

					this.$thumbs.push($thumb);
					this.$element.append($thumb);
				}

				this.sections[sectionName][1] = this.$thumbs.length;
			}

			this.imagesCount = this.$thumbs.length;

			/*
			 * Make sure we have enough thumbnail elements that we can rotate
			 * them without losing some.
			 */
			if (this.imagesCount < this.thumbsCount * 2)
				throw "too few images for gallery";
		},

		makeThumb : function(i, title, url, width, height, sectionName) {
			var $inner = $("<div />").addClass("jjp-thumbnail-inner").css({
				"background-image" : "url(" + url + ")",
				"transition" : this.transitionStyle
			}).data({
				"section" : sectionName,
				"index" : i
			});
			var $thumb = $("<figure />").addClass("jjp-thumbnail").append(
					$inner).css({
				"width" : width,
				"height" : height,
				"transition" : this.transitionStyle,
			}).data({
				"$inner" : $inner,
				"target" : url,
				"title" : title,
			});

			return $thumb;
		},

		initLightbox : function() {
			this.$lightbox = $("<figure />").addClass("jjp-lightbox").css(
					"transition", this.transitionStyle);

			this.$lightboxInners = Array(5);
			this.activeLightboxInner = 2;
			this.activeLightboxThumb = null;

			for ( var i = 0; i < 5; i++) {
				var $lightboxInner = this.makeLightboxInner();
				if (i < this.activeLightboxInner)
					$lightboxInner.addClass("is-prev");
				else if (i > this.activeLightboxInner)
					$lightboxInner.addClass("is-next");

				this.$lightboxInners[i] = $lightboxInner;
				this.$lightbox.append($lightboxInner);
			}

			this.$lightbox.append($("<div />").addClass(
					"jjp-lightbox-prev-control"));
			this.$lightbox.append($("<div />").addClass(
					"jjp-lightbox-next-control"));

			this.$element.append(this.$lightbox);
		},

		makeLightboxInner : function() {
			var $lightboxSpacer = $("<div />").addClass("jjp-lightbox-spacer");
			var $lightboxImage = $("<img />").addClass("jjp-lightbox-image")
					.css("transition", this.transitionStyle);

			var $lightboxImageHolder = $("<div />").addClass(
					"jjp-lightbox-image-holder").append($lightboxSpacer,
					$lightboxImage);

			return $("<div />").addClass("jjp-lightbox-inner").css(
					"transition", this.transitionStyle).append(
					$lightboxImageHolder).data("$image", $lightboxImage);
		},

		initState : function() {
			this.drawnIndex = Array(this.imagesCount);
			this.nextDrawnIndex = Array(this.imagesCount);
			for ( var i = 0; i < this.imagesCount; i++)
				this.drawnIndex[i] = this.nextDrawnIndex[i] = -1;

			this.activeSectionStart = this.activeSectionEnd = null;
			this.activeSectionName = null;

			this.pendingHashChanges = 0;

			this.thumbsDisplayIndexHolder = initializeShuffleHolder(this.imagesCount);
			this.thumbsDisplayIndex = Array(this.imagesCount);

			this.toHideCount = this.toShowCount = this.toMoveCount = 0;
			this.$toHide = Array(this.imagesCount);
			this.$toShow = Array(this.imagesCount);
			this.$toMove = Array(this.imagesCount);
			this.toMoveLocation = Array(this.imagesCount);

			this.nextThumbsHolder = initializeShuffleHolder(this.thumbsCount);
			this.nextThumbs = Array(this.thumbsCount);

			this.cyclePosition = null;
			this.cycleOldIndex = null;
			this.cycleNewIndex = null;

			this.nextThumbIndexIndex = 0;
			this.thumbBatchStart = 0;

			this.activeInterval = null;
			this.activeTimeout = null;

			this.lightboxActive = false;
		},

		drawBaseGallery : function() {
			this.$element.addClass("jjp-is-base-gallery");
			this.activeSectionName = null;
			this.setState("");

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

		setState : function(state) {
			if (window.location.hash == "" && state == "")
				return;

			var newHash = "#!" + state;
			if (window.location.hash != newHash) {
				window.location.hash = newHash;
				this.pendingHashChanges++;
			}
		},

		clear : function() {
			clearTimeout(this.activeTimeout);
			clearInterval(this.activeInterval);

			for ( var i = 0; i < this.imagesCount; i++) {
				var $thumb = this.$thumbs[i];

				$thumb
						.data("$inner")
						.removeClass(
								"is-pre-transition is-post-transition is-pre-flip is-post-flip");
				$thumb.removeClass("is-moving");

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

						$thumb.addClass("is-moving");
					}
				} else if (this.drawnIndex[i] >= 0)
					this.$toHide[this.toHideCount++] = $thumb;

				/*
				 * For transitions, need to update drawn index immediately to
				 * avoid inconsistency with window hash.
				 */
				this.drawnIndex[i] = this.nextDrawnIndex[i];
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
			this.setTimeout(this.afterAnimateDraw, this.transitionMillis);
		},

		afterAnimateDraw : function() {
			for ( var i = 0; i < this.toHideCount; i++) {
				var $thumb = this.$toHide[i];
				$thumb.data("$inner").removeClass("is-post-transition");
				$thumb.removeClass("is-visible");
			}

			for ( var i = 0; i < this.toMoveCount; i++)
				this.$toMove[i].removeClass("is-moving");
		},

		positionThumb : function($thumb, location) {
			var row = Math.floor(location / this.cols);
			var col = location % this.cols;

			$thumb.css("transform", "translateX(" + col * 100
					+ "%) translateY(" + row * 100 + "%)");
		},

		prepareNextThumbs : function() {
			shuffle(this.nextThumbs, this.nextThumbsHolder);

			this.thumbBatchStart += this.thumbsCount;
			this.nextThumbIndexIndex = 0;
		},

		cycleBaseGallery : function() {
			if (this.nextThumbIndexIndex == this.thumbsCount)
				this.prepareNextThumbs();

			this.cyclePosition = this.nextThumbs[this.nextThumbIndexIndex];
			var imageIndex = this.thumbBatchStart + this.cyclePosition;

			this.cycleNewIndex = this.getThumbIndex(imageIndex);
			this.cycleOldIndex = this.getThumbIndex(imageIndex
					- this.thumbsCount);

			this.nextThumbIndexIndex++;

			var $thumb = this.$thumbs[this.cycleNewIndex];

			$thumb.addClass("is-visible");
			$thumb.data("$inner").addClass("is-pre-flip");

			this.positionThumb($thumb, this.cyclePosition);

			this.setTimeout(this.startAnimateCycle, 0);
		},

		startAnimateCycle : function() {
			this.$thumbs[this.cycleOldIndex].data("$inner").addClass(
					"is-post-flip");
			this.$thumbs[this.cycleNewIndex].data("$inner").removeClass(
					"is-pre-flip");

			this.setTimeout(this.animateCycle, 0);
		},

		animateCycle : function() {
			this.setTimeout(this.midAnimateCycle, 0.5 * this.transitionMillis);
		},

		midAnimateCycle : function() {
			/*
			 * Can defer drawn index update until mid-animation for smoother
			 * transitions, as this does not affect the page hash at all.
			 */
			this.drawnIndex[this.cycleNewIndex] = this.cyclePosition;
			this.drawnIndex[this.cycleOldIndex] = -1;

			var $thumb = this.$thumbs[this.cycleOldIndex];
			$thumb.data("$inner").removeClass("is-post-flip");
			$thumb.removeClass("is-visible");
		},

		getThumbIndex : function(imageIndex) {
			return this.thumbsDisplayIndex[imageIndex % this.imagesCount];
		},

		drawSectionGallery : function(sectionName) {
			this.$element.removeClass("jjp-is-base-gallery");
			this.activeSectionName = sectionName;
			this.setState("section/" + this.activeSectionName);

			var activeSection = this.sections[sectionName];
			this.activeSectionStart = activeSection[0];
			this.activeSectionEnd = activeSection[1];

			for ( var i = this.activeSectionStart; i < this.activeSectionEnd; i++)
				this.nextDrawnIndex[i] = i - this.activeSectionStart;

			this.draw();
		},

		bindControls : function() {
			$(".jjp-base-link").filter(this.targetsThis).click(
					this.onBaseLinkClick);
			$(".jjp-section-link").filter(this.targetsThis).click(
					this.onSectionLinkClick);

			this.$element.find(".jjp-thumbnail-inner").click(
					this.onThumbnailClick);

			this.$lightbox.click(this.onLightboxClick);
			this.$element.find(".jjp-lightbox-prev-control").click(
					this.onLightboxPrevClick);
			this.$element.find(".jjp-lightbox-next-control").click(
					this.onLightboxNextClick);

			$(document).keydown(this.onKeydown);
			window.onhashchange = this.onHashChange;
		},

		getBoundTargetsThis : function() {
			var $element = this.$element;

			return function() {
				return $($(this).data("target")).is($element);
			};
		},

		onBaseLinkClick : function() {
			this.clear();
			this.drawBaseGallery();

			return false;
		},

		onSectionLinkClick : function(event) {
			this.clear();
			this.drawSectionGallery(event.currentTarget.hash.substr(1));

			return false;
		},

		onThumbnailClick : function(event) {
			this.clear();

			var $thumbInner = $(event.currentTarget);

			if (this.$element.hasClass("jjp-is-base-gallery"))
				this.drawSectionGallery($thumbInner.data("section"));
			else
				this.showInLightbox($thumbInner);
		},

		showInLightbox : function($thumbInner) {
			this.lightboxActive = true;

			this.activeLightboxThumb = $thumbInner.data("index");
			this.populateLightboxes();

			$(document.body).addClass("jjp-is-lightbox");
			this.$lightbox.addClass("is-visible is-pre-transition");

			this.setTimeout(this.animateShowLightbox, 0);
		},

		populateLightboxes : function() {
			for ( var j = -2; j <= 2; j++) {
				var $lightboxInner = this.getLightboxInner(j);
				var $thumb = this.$thumbs[this.getLightboxThumbIndex(j)];

				$lightboxInner.data("$image")
						.attr("src", $thumb.data("target"));

				if (j < 0) {
					$lightboxInner.addClass("is-prev");
					if ($lightboxInner.hasClass("is-next")) {
						$lightboxInner.removeClass("is-next");
						$lightboxInner.addClass("is-hidden");
					} else
						$lightboxInner.removeClass("is-hidden");
				} else if (j > 0) {
					$lightboxInner.addClass("is-next");
					if ($lightboxInner.hasClass("is-prev")) {
						$lightboxInner.removeClass("is-prev");
						$lightboxInner.addClass("is-hidden");
					} else
						$lightboxInner.removeClass("is-hidden");
				} else {
					$lightboxInner.removeClass("is-next is-prev");
					this.setState("image/" + $thumb.data("title"));
				}
			}
		},

		getLightboxInner : function(j) {
			var lightboxInner = (this.activeLightboxInner + j) % 5;
			if (lightboxInner < 0)
				lightboxInner += 5;

			return this.$lightboxInners[lightboxInner];
		},

		getLightboxThumbIndex : function(j) {
			var i = this.activeLightboxThumb + j;

			if (i < this.activeSectionStart)
				i += this.activeSectionEnd - this.activeSectionStart;
			else if (i >= this.activeSectionEnd)
				i -= this.activeSectionEnd - this.activeSectionStart;

			return i;
		},

		animateShowLightbox : function() {
			this.$lightbox.removeClass("is-pre-transition");
		},

		onLightboxClick : function() {
			this.hideLightbox();
		},

		hideLightbox : function() {
			this.$lightbox.addClass("is-post-transition");
			this.setTimeout(this.startHideLightbox, 0);
		},

		onLightboxPrevClick : function() {
			this.prevLightboxImage();
			return false;
		},

		onLightboxNextClick : function() {
			this.nextLightboxImage();
			return false;
		},

		startHideLightbox : function() {
			this.setTimeout(this.afterHideLightbox, this.transitionMillis);
		},

		afterHideLightbox : function() {
			this.lightboxActive = false;
			this.setState("section/" + this.activeSectionName);

			$(document.body).removeClass("jjp-is-lightbox");
			this.$lightbox.removeClass("is-visible is-post-transition");
		},

		nextLightboxImage : function() {
			this.activeLightboxThumb = this.getLightboxThumbIndex(1);
			this.activeLightboxInner++;

			this.populateLightboxes();
		},

		prevLightboxImage : function() {
			this.activeLightboxThumb = this.getLightboxThumbIndex(-1);
			this.activeLightboxInner--;

			this.populateLightboxes();
		},

		onKeydown : function(event) {
			if (this.lightboxActive) {
				switch (event.which) {
				case 37: // Left arrow.
					this.prevLightboxImage();
					return false;
				case 39: // Right arrow.
					this.nextLightboxImage();
					return false;
				case 27: // Escape.
					this.onLightboxClick();
					return false;
				}
			}
		},

		onHashChange : function() {
			if (this.pendingHashChanges > 0) {
				this.pendingHashChanges--;
				return;
			}
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
