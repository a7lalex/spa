/**
 * Handlebars block helper that checks if page active.
 * @param {string} linkUrl - Link address.
 * @param {object} options - Handlebars object.
 * @returns If the values are equal, content inside of the helper. If not, the content inside the `{{else}}` block.
 */
module.exports = function(linkUrl) {
  var params = Array.prototype.slice.call(arguments),
  options = params[params.length - 1];

  if (options.data.root.page === linkUrl) return options.fn(this);
  else return options.inverse(this);
}
