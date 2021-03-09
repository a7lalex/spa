/**
 * Handlebars block helper that checks if page parent is active.
 * @param {string} linkUrl - Link address.
 * @param {object} options - Handlebars object.
 * @returns If the values are equal, content inside of the helper. If not, the content inside the `{{else}}` block.
 */
module.exports = function(linkUrl) {
  var params = Array.prototype.slice.call(arguments),
  options = params[params.length - 1],
  parent = options.data.root.parent,
  crumbs = options.data.root.crumbs;

  if (parent === linkUrl) return options.fn(this);
  if (parent) parent = find_parent(parent);

  if (parent === linkUrl) return options.fn(this);
  else return options.inverse(this);

  function find_parent(link) {
    for (var i in crumbs) {
      if (i === link) {
        if (crumbs[i]["parent"]) {
          parent = crumbs[i]["parent"];
          find_parent(crumbs[i]["parent"]);
        }
        return parent;
      }
    }
  }
}
