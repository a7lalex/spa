/**
 * Render a raw string which will not be parsed by Handlebars. This is used on any page that has actual Handlebars code samples. To use this helper, call it with a set of four curly braces instead of two, and no hash:
 * ```Handlebars
 * {{{{raw}}}}
 * {{{{/raw}}}}
 * ```
 *
 * @param {object} content - Handlebars context.
 * @returns {string} The content inside of the block helper, ignored by Handlebars.
 */
module.exports = function(options) {
  return options.fn();
}
