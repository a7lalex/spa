/**
 * Handlebars block helper that checks if one value to less two.
 * @param {mixed} a - First value to compare.
 * @param {mixed} b - Second value to compare.
 * @param {object} options - Handlebars object.
 * @returns If true, content inside of the helper. If not, the content inside the `{{else}}` block.
 */
module.exports = function(a, b, options) {
  if (a < b) return options.fn(this);
  else return options.inverse(this);
}
