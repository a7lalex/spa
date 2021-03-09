'use strict';

!function($) {

var Colors = {

  /**
   * Initializes the media query helper, by extracting the breakpoint list from the CSS and activating the breakpoint watcher.
   * @function
   * @private
   */
  _init() {

    var $metaColor = $('meta.foundation-color');
    if(!$metaColor.length){
      $('<meta class="foundation-color">').appendTo(document.head);
    }

    var self = this;
    var extractedStyles = $('.foundation-color').css('font-family');
    var namedColors;
    var currentColorBox;
    var colorContainer = $('[data-color-container]').first();
    var colorBox = $('[data-color-box]').first();
    var colorBoxes = [];

    namedColors = Foundation.util.parseStyleToObject(extractedStyles);

    for (var key in namedColors) {
      if(namedColors.hasOwnProperty(key)) {
        currentColorBox = colorBox.clone(true);
        currentColorBox.find('.docs-color__bg').css('background-color', namedColors[key]).html('<span class="docs-color__text">' + key + '<br>' + namedColors[key] + '</span>');
        colorBoxes.push(currentColorBox);
      }
    }

    colorContainer.empty();

    for (index = 0, len = colorBoxes.length; index < len; index++) {
      colorContainer.append(colorBoxes[index]);
    }
  }
};

Foundation.Colors = Colors;
Foundation.Colors._init();

}(jQuery);
