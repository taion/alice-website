var Portfolio = function() {
	var TRANSITION_DURATION = 1000;

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
			this.$element.data("portfolio", this);

			this.baseRows = this.$element.data("base-rows");
			this.cols = this.$element.data("cols");
			this.cycleDelay = this.$element.data("cycle-delay");

			this.animateDraw = this.animateDraw.bind(this);
			this.afterAnimateDraw = this.afterAnimateDraw.bind(this);
			this.finishAnimateDraw = this.finishAnimateDraw.bind(this);
			this.cycleBaseGallery = this.cycleBaseGallery.bind(this);

			this.thumbsCount = this.baseRows * this.cols;
			this.$thumbs = Array();

			this.sectionsCount = this.data.length;
			this.sections = Array(this.sectionsCount);
			this.sectionStartIndex = Array(this.sectionsCount);
			this.sectionNames = Object();

			for ( var i = 0; i < this.sectionsCount; i++) {
				this.sectionStartIndex[i] = this.$thumbs.length;

				var sectionData = this.data[i];

				var sectionItems = sectionData.items;
				var sectionLength = sectionItems.length;
				var section = Array(sectionLength);

				for ( var j = 0; j < sectionLength; j++) {
					var imageData = sectionItems[j];
					var $thumb = this.makeThumb(imageData.title, imageData.url);

					section[j] = $thumb;
					this.$thumbs.push($thumb);

					this.$element.append($thumb);
				}

				this.sections[i] = section;
				this.sectionNames[sectionData.title] = i;
			}

			this.imagesCount = this.$thumbs.length;

			/*
			 * Make sure we have enough thumbnail elements that we can rotate
			 * them without losing some.
			 */
			if (this.imagesCount < this.thumbsCount * 2)
				throw "too few images for gallery";

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

			this.drawBaseGallery();
		},

		makeThumb : function(title, url) {
			var $inner = $("<div />").attr("title", title).addClass(
					"thumbnail-inner").css("background-image",
					"url(" + url + ")");
			var $holder = $("<figure />").addClass("thumbnail").append($inner);
			$holder.data("$inner", $inner);

			return $holder;
		},

		drawBaseGallery : function() {
			this.clear();

			// Display thumbnails in a random order.
			shuffle(this.thumbsDisplayIndex, this.thumbsDisplayIndexHolder);
			for ( var i = 0; i < this.thumbsCount; i++)
				this.nextDrawnIndex[this.thumbsDisplayIndex[i]] = i;

			this.thumbBatchStart = 0;
			this.prepareNextThumbs();

			this.activeInterval = setInterval(this.cycleBaseGallery,
					this.cycleDelay);

			this.draw();
		},

		clear : function() {
			clearTimeout(this.activeTimeout);
			clearInterval(this.activeInterval);

			for ( var i = 0; i < this.imagesCount; i++) {
				var $thumb = this.$thumbs[i];
				$thumb.data("$inner").removeClass(
						"pre-transition post-transition");
				$thumb.toggleClass("visible", this.drawnIndex[i] >= 0);

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

						$thumb.addClass("visible");
						$thumb.data("$inner").addClass("pre-transition");

						this.positionThumb($thumb, this.nextDrawnIndex[i]);
					} else if (this.drawnIndex[i] != this.nextDrawnIndex[i]) {
						this.toMoveLocation[this.toMoveCount] = this.nextDrawnIndex[i];
						this.$toMove[this.toMoveCount++] = $thumb;
					}
				} else if (this.drawnIndex[i] >= 0)
					this.$toHide[this.toHideCount++] = $thumb;
			}

			this.activeTimeout = setTimeout(this.animateDraw, 0);
		},

		animateDraw : function() {
			for ( var i = 0; i < this.toHideCount; i++)
				this.$toHide[i].data("$inner").addClass("post-transition");

			for ( var i = 0; i < this.toShowCount; i++)
				this.$toShow[i].data("$inner").removeClass("pre-transition");

			for ( var i = 0; i < this.toMoveCount; i++)
				this.positionThumb(this.$toMove[i], this.toMoveLocation[i]);

			for ( var i = 0; i < this.imagesCount; i++)
				this.drawnIndex[i] = this.nextDrawnIndex[i];

			this.activeTimeout = setTimeout(this.afterAnimateDraw, 0);
		},

		afterAnimateDraw : function() {
			this.activeTimeout = setTimeout(this.finishAnimateDraw,
					TRANSITION_DURATION);
		},

		finishAnimateDraw : function() {
			for ( var i = 0; i < this.toHideCount; i++) {
				var $thumb = this.$toHide[i];
				$thumb.data("$inner").removeClass("post-transition");
				$thumb.removeClass("visible");
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

		drawSectionGallery : function(sectionIndex) {
			this.clear();

			var section = this.sections[sectionIndex];
			var startIndex = this.sectionStartIndex[sectionIndex];

			for ( var j = 0; j < section.length; j++)
				this.nextDrawnIndex[startIndex + j] = j;

			this.draw();
		}
	};

	return {
		start : function(selector, dataUrl) {
			$.get(dataUrl, function(rawData) {
				var data = JSON.parse(rawData);
				var portfolio = new Portfolio($(selector), data);
				portfolio.init();
			});
		}
	};
}();
