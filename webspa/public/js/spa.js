var spa = (function () {
  'use script'
  var initModule = function ( $container ) {
    spa.data.initModule()
    spa.model.initModule()
    spa.shell.initModule( $container );
  }
  return { initModule: initModule }
}())
console.log('spa',spa)
