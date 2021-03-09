module.exports = function(titlePage, titleHideSmall) {

  var params = Array.prototype.slice.call(arguments),
      options = params[params.length - 1],
      title = options.data.root.title,
      crumbs = options.data.root.crumbs,
      parent = options.data.root.parent;

  var ret = '<ul class="breadcrumbs" aria-label="breadcrumbs">\n\t\t<li class="breadcrumbs__item"><a href="/index.html">Главная</a></li>';

  find_parent_one(parent);

  function find_parent_one(link) {
    for (var i in crumbs) {
      if (i === link) {
        if (crumbs[i]["parent"]) find_parent_one(crumbs[i]["parent"]);
        ret += '\n\t\t<li class="breadcrumbs__item"><a href="' + i + '.html">' + crumbs[i]["text"] + '</a></li>';
      }
    }
  }

  if (titlePage) {
    if (titleHideSmall)
      ret += '\n\t\t<li class="breadcrumbs__item hide-small">' + title + '</li>';
    else
      ret += '\n\t\t<li class="breadcrumbs__item">' + title + '</li>';
  }

  return ret + '\n</ul>';
}
