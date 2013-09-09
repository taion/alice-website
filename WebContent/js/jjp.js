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

			this.bindControls();

			this.onHashChange();
			this.started = true;
		},

		bindMethods : function() {
			this.afterAnimateDraw = this.afterAnimateDraw.bind(this);

			this.cycleBaseGallery = this.cycleBaseGallery.bind(this);
			this.midAnimateCycle = this.midAnimateCycle.bind(this);

			this.onThumbnailClick = this.onThumbnailClick.bind(this);
			this.onThumbnailEnter = this.onThumbnailEnter.bind(this);
			this.onThumbnailLeave = this.onThumbnailLeave.bind(this);

			this.onLightboxClick = this.onLightboxClick.bind(this);
			this.onLightboxPrevClick = this.onLightboxPrevClick.bind(this);
			this.onLightboxNextClick = this.onLightboxNextClick.bind(this);
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
			// image title -> section name
			this.imageSections = Object();
			// image title -> image index
			this.imagesByTitle = Object();
			// section name -> link object
			this.$sectionLinks = Object();

			this.$baseLink = $("a[href='#!']");

			for ( var i = 0; i < this.data.length; i++) {
				var sectionData = this.data[i];
				var sectionName = sectionData.title;
				var sectionItems = sectionData.items;

				var sectionStart = this.$thumbs.length;
				this.sections[sectionName] = [ sectionStart, null ];

				this.$sectionLinks[sectionName] = $("a[href='#!section/"
						+ sectionName + "']");

				for ( var j = 0; j < sectionItems.length; j++) {
					var imageData = sectionItems[j];
					var imageUrl = imageData.url;

					// Parse stem of image file name.
					var imageTitle = imageUrl.match(/^.*\/([^\/]+)\.[^\/]+$/)[1]
							.toLowerCase();

					var imageCaption = "caption" in imageData ? imageData["caption"]
							: null;

					var $thumb = this.makeThumb(sectionStart + j, imageTitle,
							imageUrl, imageCaption, width, height, sectionName);

					this.$thumbs.push($thumb);
					this.$element.append($thumb);

					this.imageSections[imageTitle] = sectionName;
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

		makeThumb : function(i, title, url, caption, width, height, sectionName) {
			var urlParts = url.match(/^(.+\/)(.+)$/);
			var thumbUrl = urlParts[1] + "thumb/" + urlParts[2];

			var $inner = $("<div>").addClass("jjp-thumbnail-inner").css({
				"background-image" : "url(" + thumbUrl + ")",
				"transition" : this.transitionStyle
			}).data({
				"section" : sectionName,
				"index" : i
			});
			var $thumb = $("<figure>").addClass("jjp-thumbnail").append($inner)
					.css({
						"width" : width,
						"height" : height,
						"transition" : this.transitionStyle
					}).data({
						"$inner" : $inner,
						"target" : url,
						"title" : title,
						"caption" : caption
					});

			this.imagesByTitle[title] = i;

			return $thumb;
		},

		initLightbox : function() {
			this.$lightbox = $("<figure>").addClass("jjp-lightbox").css(
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

			this.$lightboxInnerBackup = this.makeLightboxInner().addClass(
					"is-backup");
			this.disablePin(this.$lightboxInnerBackup);
			this.$lightbox.append(this.$lightboxInnerBackup);

			this.$lightbox.append($("<div>").addClass(
					"jjp-lightbox-prev-control"));
			this.$lightbox.append($("<div>").addClass(
					"jjp-lightbox-next-control"));

			this.$element.append(this.$lightbox);
		},

		makeLightboxInner : function() {
			var $imageSpacer = $("<div>").addClass("jjp-lightbox-spacer");
			var $image = $("<img>").addClass("jjp-lightbox-image").css(
					"transition", this.transitionStyle);
			var $imageHolder = $("<div>").addClass("jjp-lightbox-image-holder")
					.append($imageSpacer, $image);

			var $captionSpacer = $("<div>").addClass("jjp-lightbox-spacer");
			var $caption = $("<div>").addClass("jjp-lightbox-caption");
			var $captionHolder = $("<div>").addClass(
					"jjp-lightbox-caption-holder").append($captionSpacer,
					$caption);

			return $("<div>").addClass("jjp-lightbox-inner").css("transition",
					this.transitionStyle).append($imageHolder, $captionHolder)
					.data({
						"$image" : $image,
						"$caption" : $caption
					});
		},

		disablePin : function($lightboxInner) {
			$lightboxInner.data("$image").attr("nopin", "nopin");
		},

		enablePin : function($lightboxInner) {
			$lightboxInner.data("$image").removeAttr("nopin");
		},

		initState : function() {
			this.started = false;

			this.drawnIndex = Array(this.imagesCount);
			this.nextDrawnIndex = Array(this.imagesCount);
			for ( var i = 0; i < this.imagesCount; i++)
				this.drawnIndex[i] = this.nextDrawnIndex[i] = -1;

			this.activeSectionStart = this.activeSectionEnd = null;
			this.activeSectionName = null;

			this.$activeLink = this.$highlightLink = $();

			this.pendingHashChanges = 0;
			this.suppressHashChange = false;

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
			this.galleryTimeout = null;
			this.lightboxTimeout = null;

			this.lightboxActive = false;
		},

		drawBaseGallery : function() {
			this.$element.addClass("jjp-is-base-gallery");
			this.activeSectionName = null;
			this.setState("");
			this.setActiveLink(this.$baseLink);

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

			if (this.suppressHashChange)
				return;

			var newHash = "#!" + state;
			if (window.location.hash != newHash) {
				window.location.hash = newHash;
				this.pendingHashChanges++;
			}
		},

		setActiveLink : function($activeLink) {
			this.$activeLink.removeClass("jjp-is-active");
			this.$activeLink = $activeLink;
			$activeLink.addClass("jjp-is-active");
		},

		clear : function() {
			clearTimeout(this.galleryTimeout);
			clearTimeout(this.lightboxTimeout);
			clearInterval(this.activeInterval);

			for ( var i = 0; i < this.imagesCount; i++) {
				var $thumb = this.$thumbs[i];

				$thumb.data("$inner").removeClass(
						"is-faded is-pre-flip is-post-flip");
				$thumb.removeClass("is-moving");

				$thumb.toggleClass("is-visible", this.drawnIndex[i] >= 0);

				this.nextDrawnIndex[i] = -1;
			}

			this.$highlightLink.removeClass("jjp-is-highlight");

			this.$lightbox.removeClass("is-faded");
			if (this.lightboxActive)
				this.$lightbox.addClass("is-visible");
			else
				this.$lightbox.removeClass("is-visible");
		},

		draw : function() {
			this.toHideCount = this.toShowCount = this.toMoveCount = 0;

			for ( var i = 0; i < this.imagesCount; i++) {
				var $thumb = this.$thumbs[i];
				if (this.nextDrawnIndex[i] >= 0) {
					if (this.drawnIndex[i] < 0) {
						this.$toShow[this.toShowCount++] = $thumb;

						$thumb.addClass("is-visible");
						$thumb.data("$inner").addClass("is-faded");

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

			this.reflow();

			for ( var i = 0; i < this.toHideCount; i++)
				this.$toHide[i].data("$inner").addClass("is-faded");

			for ( var i = 0; i < this.toShowCount; i++)
				this.$toShow[i].data("$inner").removeClass("is-faded");

			for ( var i = 0; i < this.toMoveCount; i++)
				this.positionThumb(this.$toMove[i], this.toMoveLocation[i]);

			this.reflow();

			this.galleryTimeout = setTimeout(this.afterAnimateDraw,
					this.transitionMillis);
		},

		reflow : function() {
			this.$element[0].clientHeight;
		},

		afterAnimateDraw : function() {
			for ( var i = 0; i < this.toHideCount; i++) {
				var $thumb = this.$toHide[i];
				$thumb.data("$inner").removeClass("is-faded");
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

			this.reflow();

			this.$thumbs[this.cycleOldIndex].data("$inner").addClass(
					"is-post-flip");
			this.$thumbs[this.cycleNewIndex].data("$inner").removeClass(
					"is-pre-flip");

			this.reflow();

			this.galleryTimeout = setTimeout(this.midAnimateCycle,
					0.5 * this.transitionMillis);
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
			this.setActiveLink(this.$sectionLinks[sectionName]);

			var activeSection = this.sections[sectionName];
			this.activeSectionStart = activeSection[0];
			this.activeSectionEnd = activeSection[1];

			for ( var i = this.activeSectionStart; i < this.activeSectionEnd; i++)
				this.nextDrawnIndex[i] = i - this.activeSectionStart;

			this.draw();
		},

		bindControls : function() {
			this.$element.find(".jjp-thumbnail-inner").click(
					this.onThumbnailClick).mouseenter(this.onThumbnailEnter)
					.mouseleave(this.onThumbnailLeave);

			this.$lightbox.click(this.onLightboxClick);
			this.$element.find(".jjp-lightbox-prev-control").click(
					this.onLightboxPrevClick);
			this.$element.find(".jjp-lightbox-next-control").click(
					this.onLightboxNextClick);

			$(document).keydown(this.onKeydown);
			window.onhashchange = this.onHashChange;
		},

		onThumbnailClick : function(event) {
			this.clear();

			var $thumbInner = $(event.currentTarget);

			if (this.activeSectionName == null)
				this.drawSectionGallery($thumbInner.data("section"));
			else
				this.showInLightbox($thumbInner);

			return false;
		},

		showInLightbox : function($thumbInner) {
			this.lightboxActive = true;

			this.activeLightboxThumb = $thumbInner.data("index");
			this.populateLightboxes();

			if (this.started) {
				this.$lightbox.addClass("is-visible is-faded");
				this.reflow();
				this.$lightbox.removeClass("is-faded");
			} else {
				this.$lightbox.addClass("is-visible");
			}
		},

		populateLightboxes : function() {
			this.populateLightbox(0, true);
			this.populateLightbox(1, true);
			this.populateLightbox(-1, true);
			this.populateLightbox(2, true);
			this.populateLightbox(-2, true);
		},

		populateLightbox : function(j, loadContents) {
			var $lightboxInner = this.getLightboxInner(j);
			var $thumb = this.$thumbs[this.getLightboxThumbIndex(j)];

			if (loadContents) {
				$lightboxInner.data("$image")
						.attr("src", $thumb.data("target"));

				var caption = $thumb.data("caption");
				if (caption == null) {
					$lightboxInner.removeClass("is-captioned");
					$lightboxInner.data("$caption").text("");
				} else {
					$lightboxInner.addClass("is-captioned");
					$lightboxInner.data("$caption").text(caption);
				}
			}

			if (j == 0) {
				$lightboxInner.removeClass("is-next is-prev");
				this.setState("image/" + $thumb.data("title"));
				this.enablePin($lightboxInner);
			} else {
				this.disablePin($lightboxInner);
				if (j < 0) {
					$lightboxInner.addClass("is-prev");
					if ($lightboxInner.hasClass("is-next")) {
						$lightboxInner.removeClass("is-next");
						$lightboxInner.addClass("is-hidden");
					} else
						$lightboxInner.removeClass("is-hidden");
				} else {
					$lightboxInner.addClass("is-next");
					if ($lightboxInner.hasClass("is-prev")) {
						$lightboxInner.removeClass("is-prev");
						$lightboxInner.addClass("is-hidden");
					} else
						$lightboxInner.removeClass("is-hidden");
				}
			}
		},

		getLightboxInner : function(j) {
			return this.$lightboxInners[this.getLightboxInnerIndex(j)];
		},

		getLightboxInnerIndex : function(j) {
			var lightboxInnerIndex = (this.activeLightboxInner + j) % 5;
			if (lightboxInnerIndex < 0)
				lightboxInnerIndex += 5;

			return lightboxInnerIndex;
		},

		getLightboxThumbIndex : function(j) {
			var i = this.activeLightboxThumb + j;

			if (i < this.activeSectionStart)
				i += this.activeSectionEnd - this.activeSectionStart;
			else if (i >= this.activeSectionEnd)
				i -= this.activeSectionEnd - this.activeSectionStart;

			return i;
		},

		onThumbnailEnter : function(event) {
			if (this.activeSectionName == null) {
				this.$highlightLink.removeClass("jjp-is-highlight");
				this.$highlightLink = this.$sectionLinks[$(event.currentTarget)
						.data("section")];
				this.$highlightLink.addClass("jjp-is-highlight");
			}
			return false;
		},

		onThumbnailLeave : function() {
			if (this.activeSectionName == null)
				this.$highlightLink.removeClass("jjp-is-highlight");
			return false;
		},

		onLightboxClick : function() {
			if (this.lightboxActive) {
				this.hideLightbox();
				return false;
			}
		},

		hideLightbox : function() {
			this.lightboxActive = false;
			this.setState("section/" + this.activeSectionName);

			this.disablePin(this.getLightboxInner(0));
			this.$lightbox.addClass("is-faded");

			this.reflow();

			this.lightboxTimeout = setTimeout(this.afterHideLightbox,
					this.transitionMillis);
		},

		onLightboxPrevClick : function() {
			if (this.lightboxActive) {
				this.prevLightboxImage();
				return false;
			}
		},

		onLightboxNextClick : function() {
			if (this.lightboxActive) {
				this.nextLightboxImage();
				return false;
			}
		},

		afterHideLightbox : function() {
			this.$lightbox.removeClass("is-visible is-faded");
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

			this.suppressHashChange = true;
			this.clear();

			var label = window.location.hash.substr(2);

			if (label.substr(0, 6) == "image/") {
				var imageTitle = label.substr(6);
				var i = this.imagesByTitle[imageTitle];

				var sectionName = this.imageSections[imageTitle];
				if (sectionName != this.activeSectionName)
					this.drawSectionGallery(sectionName);

				if (this.lightboxActive) {
					if (i == this.getLightboxThumbIndex(-1))
						this.prevLightboxImage();
					else if (i == this.getLightboxThumbIndex(1))
						this.nextLightboxImage();
					else {
						this.$lightboxInnerBackup.removeClass("is-backup");
						this.enablePin(this.$lightboxInnerBackup);

						var j = this.getLightboxInnerIndex(0);
						var $lightboxInnerTemp = this.$lightboxInners[j];
						this.$lightboxInners[j] = this.$lightboxInnerBackup;
						this.$lightboxInnerBackup = $lightboxInnerTemp;

						this.$lightboxInnerBackup.addClass("is-backup");
						this.disablePin(this.$lightboxInnerBackup);

						this.activeLightboxThumb = i;
						this.populateLightboxes();
					}
				} else {
					var $thumbInner = this.$thumbs[i].data("$inner");
					this.showInLightbox($thumbInner);
				}
			} else {
				if (this.lightboxActive) {
					this.hideLightbox();
				}

				if (label == "")
					this.drawBaseGallery();
				else if (label.substr(0, 8) == "section/") {
					var sectionName = label.substr(8);
					if (sectionName != this.activeSectionName)
						this.drawSectionGallery(sectionName);
				}

				// Otherwise do nothing; couldn't parse hash.
			}

			this.suppressHashChange = false;
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
