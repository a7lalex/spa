var format = require('util').format;
var hljs = require('highlight.js');

/**
 * Handlebars block helper that highlights code samples.
 * @param {string} language - Language of the code sample.
 * @param {string} example - Example of the code sample.
 * @param {object} options - Handlebars object.
 * @example
 * {{#docs-code 'html'}}<a class="btn">Button!</a>{{/docs-code}}
 * {{#docs-code 'html' 'example'}}<button class="btn">This is a button.</button>{{/docs-code}}
 * @returns The HTML inside the helper, with highlight.js classes added.
 */

module.exports = function(language, example) {
  var params = Array.prototype.slice.call(arguments);
  var options = params[params.length - 1];
  var code = options.fn(this);

  code = code.replace(/^((<[^>]+>|\t)+)/gm, function(match, p1 /*..., offset, s*/) {
    return p1.replace(/\t/g, '  ');
  });

  if (typeof language === 'undefined') language = 'html';

  var renderedCode = hljs.highlight(language, code).value;
  var output = format('<div class="docs-code"><pre><code class="%s">%s</code></pre></div>', language, renderedCode);

  // If the language is example, live code will print out along with the sample
  if (example === 'example') {
    output += format('\n\n<div class="docs-code-live">%s</div>', code);
  }

  return output;
}
