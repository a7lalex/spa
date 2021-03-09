'use strict';

// Загружаем все gulp-плагины в одну переменную для удобства
const $            = require('gulp-load-plugins')();
//---------------------------------------
const {
  series,
  parallel,
  src,
  dest,
  lastRun,
  watch
}                  = require('gulp');
const yargs        = require('yargs');
const browser      = require('browser-sync');
const panini       = require('panini');
const yaml         = require('js-yaml');
const fs           = require('fs');
const del          = require('del');
const autoprefixer = require('autoprefixer');
//---------------------------------------

// Определяем: разработка это или финальная сборка (--production flag)
const PRODUCTION = !!(yargs.argv.production);

// Загружаем настройки из config.yml
function loadConfig(config = 'config.yml') {
  return yaml.load(fs.readFileSync(config, 'utf8'));
}

const {
  COMPATIBILITY,
  CSS_NANO,
  PORT,
  PATHS,
  SPRITE_PNG,
  MESSAGE,
  CACHE
} = loadConfig();
let PATHS_JS = loadConfig(PATHS.appJS);

//---------------------------------------
// Чистим файлы в директории сборки
function delHTML() { return del(PATHS.clearHTML); };
function delCSS() { return del(PATHS.clearCSS); };
function delJS() { return del(PATHS.clearJS); };
function delImg() { return del(PATHS.clearImg); };
function clear(cb) { parallel(delHTML, delCSS, delJS, delImg)(cb) };

exports.delHtml = delHTML;
exports.delCSS = delCSS;
exports.delJS = delJS;
exports.delImg = delImg;

exports.clear = clear;

//---------------------------------------
// Сборка HTML

// Собираем страницы
function pages() {
  return src([PATHS.pages + '**/*.html'])
    .pipe(panini({
      root: PATHS.pages,
      layouts: PATHS.layouts,
      partials: PATHS.partials,
      data: PATHS.data,
      helpers: PATHS.helpers
    }))
    .pipe(dest(PATHS.build));
}

function HTML(cb) {
  series(delHTML, pages)(cb);
}

// Обновляем данные и пересобираем HTML
function pagesReset(cb) {
  panini.refresh();
  cb();
}

exports.HTML = HTML;

//---------------------------------------
// Сборка скриптов проекта (JS)
function jsAPP() {
  return src(PATHS_JS.APP)
    .pipe($.plumber({
      errorHandler: (err) => {
        $.notify.onError({
          title: MESSAGE.title,
          message: MESSAGE.js
        })(err);
        this.emit('end');
      }
    }))
    .pipe($.if(!PRODUCTION, $.fileTransformCache({ path: '.babelCache', transformStreams: [$.babel().on('error', (e) => { console.log(e); })] })))
    .pipe($.if(PRODUCTION, $.babel().on('error', (e) => { console.log(e); })))
    //.pipe($.babel().on('error', (e) => { console.log(e); }))
    .pipe($.if(!PRODUCTION, $.sourcemaps.init()))
    .pipe($.concat('app.js'))
    .pipe($.if(!PRODUCTION, $.sourcemaps.write('.')))
    .pipe($.size({ title: MESSAGE.sizeTitle, showFiles: true, showTotal: false }))
    .pipe(dest(PATHS.build + '/js'))
    .pipe($.if(PRODUCTION, $.rename('app.min.js')))
    .pipe($.if(PRODUCTION, $.uglify().on('error', (e) => { console.log(e); })))
    .pipe($.if(PRODUCTION, $.size({ title: MESSAGE.sizeTitle, showFiles: true, showTotal: false })))
    .pipe($.if(PRODUCTION, dest(PATHS.build + '/js')))
    .pipe($.if(!PRODUCTION, browser.stream()));
}

function jsProject() {
  return src(PATHS_JS.PROJECT)
    .pipe($.plumber({
      errorHandler: (err) => {
        $.notify.onError({
          title: MESSAGE.title,
          message: MESSAGE.js
        })(err);
        this.emit('end');
      }
    }))
    .pipe($.babel().on('error', (e) => { console.log(e); }))
    .pipe($.if(!PRODUCTION, $.sourcemaps.init()))
    .pipe($.concat('project.js'))
    .pipe($.if(!PRODUCTION, $.sourcemaps.write('.')))
    .pipe($.size({ title: MESSAGE.sizeTitle, showFiles: true, showTotal: false }))
    .pipe(dest(PATHS.build + '/js'))
    .pipe($.if(PRODUCTION, $.rename('project.min.js')))
    .pipe($.if(PRODUCTION, $.uglify().on('error', (e) => { console.log(e); })))
    .pipe($.if(PRODUCTION, $.size({ title: MESSAGE.sizeTitle, showFiles: true, showTotal: false })))
    .pipe($.if(PRODUCTION, dest(PATHS.build + '/js')))
    .pipe($.if(!PRODUCTION, browser.stream()));
}

function jsCustom() {
  return src(PATHS_JS.CUSTOM)
    .pipe($.plumber({
      errorHandler: (err) => {
        $.notify.onError({
          title: MESSAGE.title,
          message: MESSAGE.js
        })(err);
        this.emit('end');
      }
    }))
    .pipe($.babel().on('error', (e) => { console.log(e); }))
    //.pipe($.if(!PRODUCTION, $.sourcemaps.init()))
    //.pipe($.if(!PRODUCTION, $.sourcemaps.write('.')))
    .pipe($.size({ title: MESSAGE.sizeTitle, showFiles: true, showTotal: false }))
    .pipe(dest(PATHS.build + '/js'))
    .pipe($.if(PRODUCTION, $.rename({suffix: ".min"})))
    .pipe($.if(PRODUCTION, $.uglify().on('error', (e) => { console.log(e); })))
    .pipe($.if(PRODUCTION, $.size({ title: MESSAGE.sizeTitle, showFiles: true, showTotal: false })))
    .pipe($.if(PRODUCTION, dest(PATHS.build + '/js')))
    .pipe($.if(!PRODUCTION, browser.stream()));
}

function JS(cb) {
  parallel(jsAPP, jsProject, jsCustom)(cb);
}

function jsAPPReset(cb) {
  PATHS_JS = loadConfig(PATHS.appJS);
  jsAPP();
  cb();
}

exports.jsAPP = jsAPP;
exports.jsProject = jsProject;
exports.jsCustom = jsCustom;
exports.js = series(delJS, JS);

//---------------------------------------
// Сборка стилей проекта (CSS)
function CSS() {
  return src(PATHS.appCSS)
    .pipe($.plumber())
    .pipe($.if(!PRODUCTION, $.sourcemaps.init()))
    .pipe($.sass({ outputStyle: 'expanded' }).on('error', $.sass.logError))
    .on('error', $.notify.onError({
      title: MESSAGE.title,
      message: MESSAGE.css
    }))
    .pipe($.postcss([
      autoprefixer({ browsers: COMPATIBILITY })
    ]))
    .pipe($.if(!PRODUCTION, $.sourcemaps.write('.')))
    .pipe($.size({ title: MESSAGE.sizeTitle, showFiles: true, showTotal: false }))
    .pipe($.if(PRODUCTION, dest(PATHS.build + '/css')))
    .pipe($.if(PRODUCTION, $.cssnano({ CSS_NANO })))
    .pipe($.if(PRODUCTION, $.rename('app.min.css')))
    .pipe($.if(PRODUCTION, $.size({ title: MESSAGE.sizeTitle, showFiles: true, showTotal: false })))
    .pipe(dest(PATHS.build + '/css'))
    .pipe($.if(!PRODUCTION, browser.stream()));
}

exports.css = series(delCSS, CSS);

//---------------------------------------
// Собираем картинки

function spritePNG(cb) {
  if (fileExist(PATHS.spritePNG) !== false) {
    const spriteData = src(PATHS.spritePNG + '*.png')
      .pipe($.spritesmith({
        imgName: SPRITE_PNG.imgName,
        cssName: SPRITE_PNG.cssName,
        algorithm: SPRITE_PNG.algorithm,
        padding: SPRITE_PNG.padding,
        cssTemplate: SPRITE_PNG.cssTemplate,
        cssVarMap: (sprite) => {
          sprite.name = 's-' + sprite.name;
        }
      }));

    spriteData.img
      .pipe(dest(PATHS.build + '/img/'))
      .pipe($.size({ title: MESSAGE.sizeTitle, showFiles: true, showTotal: false }));
    spriteData.css.pipe(dest(PATHS.dev + '/service/'));
    cb();
  }
  else {
    console.log('----- Сборка PNG-спрайта: нет папки с картинками -----');
    cb();
  }
}

// Сборка спрайта для SVG
function spriteSVG(cb) {
  if (fileExist(PATHS.spriteSVG) !== false) {
    return src(PATHS.spriteSVG + '*.svg')
      .pipe($.rename({prefix: 'icon-'}))
      .pipe($.svgmin(function(file) {
        return {
          plugins: [{
            cleanupIDs: {
              minify: true
            }
          }]
        }
      }))
      .pipe($.svgstore({ inlineSvg: true }))
      .pipe($.cheerio({
        run: function($) {
          $('svg').attr('style', 'display:none');
          $('[fill]').not('[fill="currentColor"]').not('[fill="none"]').not('circle').removeAttr('fill');
          $('[stroke]').not('[fill="none"]').removeAttr('stroke');
        },
        parserOptions: {
          xmlMode: true
        }
      }))
      .pipe($.rename('spriteSVG.svg'))
      .pipe($.size({ title: MESSAGE.sizeTitle, showFiles: true, showTotal: false }))
      .pipe(dest(PATHS.build + '/img/'));
  }
  else {
    console.log('----- Сборка SVG-спрайта: нет папки с картинками -----');
    cb();
  }
}

exports.spritePNG = spritePNG;
exports.spriteSVG = spriteSVG;
exports.img = series(delImg, parallel(spritePNG, spriteSVG));

//---------------------------------------
// Боремся с кешем браузера и добавляем min-версии файлов для js/css, а так же убираем лишнее из HTML-файлов
function HTMLReplace()  {
  return src(PATHS.build + '/*.html')
    .pipe($.plumber())
    .pipe($.if(PRODUCTION, $.htmlReplace({
      css: {
        src: 'css',
        tpl: '<link rel="stylesheet" href="%s/app.min.css">'
      },
      js: {
        src: 'js',
        tpl: '<script src="%s/app.min.js"></script>'
      },
      'pixel-glass': ''
    })))
    .pipe($.if(CACHE, $.cacheBust()))
    .pipe(dest(PATHS.build));
}

//---------------------------------------
// Запуск сервера
function server() {
  return browser.init({
    server: PATHS.build,
    port: PORT
  });
}

function reload(cb) {
  browser.reload();
  cb();
}

exports.server = server;

//---------------------------------------
// Запуск сборки по умолчанию для разработки
exports.default = series(clear, parallel(pages, JS, spritePNG, spriteSVG), CSS, HTMLReplace, watcher, server);

// Сборка для интеграции в CMS или для показа клиенту
exports.build = series(clear, parallel(pages, JS, spritePNG, spriteSVG), CSS, HTMLReplace);

//---------------------------------------
// Включаем слежение за изменениями файлов
function watcher(cb) {
  watch([
    PATHS.pages + '**/*.html',
    PATHS.layouts + '**/*.html',
    PATHS.partials + '**/*.html',
    PATHS.data + '**/*.{yml,json}',
    PATHS.helpers + '**/*.js'
  ], series(delHTML, pagesReset, pages, reload));

  watch(PATHS.appJS, jsAPPReset);
  watch(PATHS_JS.APP, jsAPP);
  watch(PATHS_JS.PROJECT, jsProject);
  watch(PATHS_JS.CUSTOM, jsCustom);

  watch(PATHS.css, CSS);

  watch(PATHS.spritePNG + '*.png', series(spritePNG, reload));
  watch(PATHS.spriteSVG + '*.svg', series(spriteSVG, reload));

  cb();
}

//---------------------------------------
/**
 * Проверка существования файла или папки
 * @param  {string} filepath - Путь до файла или папки
 * @return {boolean}
 */
function fileExist(filepath) {
  let flag = true;
  try {
    fs.accessSync(filepath, fs.F_OK);
  } catch(e) {
    flag = false;
  }
  return flag;
}
