'use strict'
var
  setWatch,
  //countUp,
  http = require('http'),
  express = require('express'),
  socketIo = require('socket.io'),

  fsHandle = require('fs'),

  app = express(),
  server = http.createServer( app ),
  io = socketIo.listen( server ),
  //countIdx = 0,
  watchMap = {}

/*countUp = function () {
  countIdx++
  console.log( countIdx )
  io.sockets.send( countIdx )
}*/
setWatch = function (url_path, file_type) {
  console.log('setWatch called on ' + url_path )
  if ( ! watchMap[ url_path ]) {
    console.log('начинаю наблюдение за ' + url_path )
    fsHandle.watchFile(
      url_path.slice(1),
      function ( current, previous ) {
        console.log('обнаружен доступ к файлу')
        if ( current.mtime !== previous.mtime ) {
          console.log('файл изменен')
          io.sockets.emit( file_type, url_path )
        }
      }
    )
    watchMap[ url_path ] = true
  }
}
app.configure( function () {
  app.use( function (request, response, next) {
    if ( request.url.indexOf('/js/') >= 0) {
      setWatch( request.url, 'script')
    } else if ( request.url.indexOf('/css/') >= 0 ) {
      setWatch( request.url, 'stylesheet')
    }
    next()
  })
  app.use( express.static( __dirname + '/' ))
})
app.get('/', function ( request, response ) {
  response.redirect('/socket.html')
})
server.listen( 3001 )
console.log(
  'Express-сервер прослушивает порт %d в режиме %s',
  server.address().port, app.settings.env
)
//setInterval(countUp, 1000)
