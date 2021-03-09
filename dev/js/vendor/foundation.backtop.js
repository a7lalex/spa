
/*
* Back-top 2016, v 0.0.2 | Velichko Vyacheslav | MIT
*/

'use strict';

!function($) {

/**
 * backTop module.
 * @module foundation.backtop
 */

class Backtop {
  /**
   * Creates a new instance of a backTop.
   * @class
   * @fires backTop#init
   * @param {jQuery} element - jQuery object to make into a backTop.
   * @param {Object} options - Overrides to the default plugin settings.
   */
  constructor(element, options) {
    this.$element = element;
    this.options = $.extend({}, Backtop.defaults, element.data(), options);

    this._init();

    Foundation.registerPlugin(this, 'Backtop');
  }

  /**
   * Initializes the backTop from the 'data-backTop' attribute on the element.
   * @function
   * @private
   */
  _init() {
    let _this = this;

    this.$element.css({
      'right' : _this.options.right,
      'bottom' : _this.options.bottom,
      'position' : 'fixed',
      'display' : 'none'
    });

    this.visibilityElem();
    this._events();
  }

  /**
   * Initializes events for the backTop.
   * @function
   * @private
   */
  _events() {
    let _this = this;

    this.$element.on('click.zf.trigger', function(e) {
      e.preventDefault();
      $('html, body').animate( { scrollTop: 0 }, _this.options.duration );
    });

    $(document).on('scroll.zf.trigger', function() {
      _this.visibilityElem();
    });

  }

  /**
   * Show | Hide on element.
   * @function
   * @private
   */
  visibilityElem() {
    let _this = this;
    ($(window).scrollTop() >= _this.options.offset) ? _this.$element.fadeIn(_this.options.speed) : _this.$element.fadeOut(_this.options.speed);
  }

  /**
   * Destroys the instance of the current plugin on this element.
   * @function
   */
  destroy() {
    this.$element.off('.zf.backtop');
    Foundation.unregisterPlugin(this);
  }
}

Backtop.defaults = {
  /**
   * Browser window scroll (in pixels) after which the "back to top" btn is shown
   * @option
   * @example 400
   */
  offset: 400,

  /**
   * Speed of appearance and disappearance (in ms)
   * @option
   * @example 500
   */
  speed: 500,

  /**
   * Right border (px)
   * @option
   * @example 40
   */
  right: 40,

  /**
   * Lower bound (px).
   * @option
   * @example 40
   */
  bottom: 40,

  /**
   * Duration of the top scrolling animation (in ms).
   * @option
   * @example 1200
   */
  duration: 1200

};

// Window exports
Foundation.plugin(Backtop, 'Backtop');

}(jQuery);
