/**
 * Generates a Handlebars block helper called #ifpages for use in templates. This helper must be re-generated for every page that's rendered, because the return value of the function is dependent on the name of the current page.
 * @param {string} pageName - Name of the page to use in the helper function.
 * @returns {function} A Handlebars helper function.
 */
module.exports = function() {
  /**
   * Handlebars block helper that renders the content inside of it based on the current page.
   * @param {string...} pages - One or more pages to check.
   * @param (object) options - Handlebars object.
   * @example
   * {{#ifpages 'index' 'about'}}This must be the index or about page.{{/ifpages}}
   * @return The content inside the helper if a page matches, or if not, the content inside the `{{else}}` block.
   */
    var params = Array.prototype.slice.call(arguments);
    var pages = params.slice(0, -1);
    var options = params[params.length - 1];
    var noPrefix = false,
        page = options.data.root.page;

    if (page === undefined) return console.log('Error! No page or partial!');

    if (pages[0] === 'noPrefix') {
      noPrefix = true;
    }

    for (var i in pages) {
      if (pages[i] === page) {
        return options.fn(this);
      } else {
        if (!noPrefix && page.indexOf(pages[i]) !== -1) {
          return options.fn(this);
        }
      }
    }

    return options.inverse(this);
}
