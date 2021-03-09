'use strict';

/*(function($) {
  $(() => {
    $(document).foundation();

    const App = {

      data: {
        formSuccess: '.form-success',
        formError: '.form-error',
        formContent: '.form-content',
        formContentText: '.form-content__text',
        hide: 'hide',
        overlay: 'overlay',
      },

      _initApp() {
        this._modal();
        this._form();
        this._startSliderMain();
        this._startSliderServices();
        this._startLightGallery();
        this._sticky();
      },

      _reflowApp() {
        this._modal();
        this._form();
      },

      // Modals
      _modal() {
        const $modal = $('#modalAjax');
        const $content = $('#modalContentAjax');

        $('[data-modal]').off('click').on('click', (e) => {
          e.preventDefault();

          $.ajax({
            url: $(e.currentTarget).data('modal')
          })
            .done((resp) => {
              $content.empty().html(resp).foundation();
              App._reflowApp();
              $modal.foundation('open');
            });
        });
      },

      // Form Validation
      _form() {
        const $form = $('[data-abide]');

        $form.on('submit.zf.abide', (e) => {
          e.preventDefault();
        }).on('formvalid.zf.abide', (e) => {
          const $target = $(e.currentTarget);

          // Включаем анимацию и перекрытие
          App.addLoading($target);
          App.addOverlay($target);
          // Скрываем блок с ошибкой формы
          App.hideBlock($target.find(App.data.formError));

          // Метод бекенда для отправки данных
          App.appMethod($target.data('backend'), $target);
        });
      },

      // Запуск backend-метода
      appMethod(method, event) {
        if (method in App) {
          event ? App[method](event) : App[method]();
        } else {
          method ? console.log("Backend action: ", method) : console.log("Not method");
        }
      },

      // Function for created loading
      addLoading: function (obj, size) {
        var spinner = 'spinner';
        size ? spinner += ` spinner--${size}` : spinner;
        if (obj.hasClass('btn')) {
          obj.addClass('btn--loading');
          obj.wrapInner('<span class="btn__text"></span>');
          obj.prepend(`<div class="${spinner}"><div class="spinner__circle"></div></div>`);
        } else {
          obj.wrap('<div class="spinner-mask spinner-mask--start"></div>').parent().prepend(`<div class="${spinner}"><div class="spinner__circle"></div></div>`);
        }
      },
      // Function for deleted loading
      removeLoading: function (obj) {
        if (obj.hasClass('btn')) {
          obj.removeClass('btn--loading').find('btn__text').unwrap();
        } else {
          obj.parent().find('.spinner').remove();
          obj.unwrap();
        }
      },
      // Add to Overlay
      addOverlay: function (obj) {
        obj.addClass(App.data.overlay);
      },
      // Remove to Overlay
      removeOverlay: function (obj) {
        obj.removeClass(App.data.overlay);
      },
      // Hide block
      hideBlock: function (obj) {
        obj.addClass(App.data.hide);
      },
      // Show block
      showBlock: function (obj) {
        obj.removeClass(App.data.hide);
      },
      // Show Error Form
      setErrorForm: function (obj, message) {
        var formError = obj.find(App.data.formError);
        formError.find(App.data.formContentText).empty().html(message);
        App.showBlock(formError);
      },
      // Slider Main to header in index-page
      _startSliderMain: function () {
        if ( $('.js-slider-main').length ) {
          tns({
            container: '.js-slider-main',
            items: 1,
            slideBy: 'page',
            autoplay: false,
            autoplayButtonOutput: false,
            nav: true,
            controls: false,
            navPosition: 'bottom',
            //navContainer: '.js-slider-main .page-header__slider-nav',
            //controlsContainer: ".js-slider-banner > .photo-list__control"
          });
        }
      },
      // Slider Services to Main
      _startSliderServices: function () {
        if ( $('.js-slider-services').length ) {
          tns({
            "container": ".js-slider-services",
            "items": 2,
            controlsContainer: ".slider-controls-services",
            "autoplay": false,
            "swipeAngle": false,
            "speed": 400,
            "loop" : true,
            autoplayButtonOutput: false,
            nav: false,
            controls: false,
            center: true,
            responsive: {
              1000: {
                controls: true
              },
              1024: {
                items: 3,
                center: false,
              },
              1400: {
                items: 4
              }
            }
          });
        }
      },
      // Gallery
      _startLightGallery: function () {
        $('.js-gallery').lightGallery({
          selector: '.js-gallery-item',
          download: false,
          fullScreen: false,
          autoplay: false,
          autoplayControls: false,
          share: false
        });
      },
      // Sticky menu in header
      _sticky: function () {
        var _this = this;
        var sticky = $('.js-sticky');
        var sticky_margin_top_init = 100;
        var sticky_margin_top_active = 110;
        // For only Table & Desktop
        if (document.documentElement.clientWidth > 1024) {
          var win = $(window);

          win.scroll(function() {
            var scrollTop = +win.scrollTop();
            if (scrollTop > sticky_margin_top_init) {
              sticky.addClass('is-init');
            } else {
              sticky.removeClass('is-init');
            }
            if (scrollTop > sticky_margin_top_active) {
              sticky.addClass('is-active');
            } else {
              sticky.removeClass('is-active');
            }
          });
        }

        sticky.off('resizeme.zf.trigger').on('resizeme.zf.trigger', function(e, el) {
          _this._sticky();
        });
      }
    };

    App._initApp();
    window.App = App;
  });
}(jQuery));

/* Параметры jslint */
// Модуль /spa/
// Обеспечивает функциональность выплывающего чата
//
/*var spa = (function ( $ ) {
// Переменные в области видимости модуля
var
// Задать константы
configMap = {
extended_height : 434,
extended_title : 'Click to retract',
retracted_height : 16,
retracted_title : 'Click to extend',
template_html : '<div class="spa-slider"><\/div>'
},
// Объявить все прочие переменные в области видимости модуля
$chatSlider,
toggleSlider, onClickSlider, initModule;
// Метод DOM /toggleSlider/
// изменяет высоту окна чата
toggleSlider = function () {
var
slider_height = $chatSlider.height();
// раскрыть окно чата, если оно свернуто ча та. Он сравнивает теку-щую высоту окна с мини-
if ( slider_height === configMap.retracted_height ) {
$chatSlider
.animate({ height : configMap.extended_height })
.attr( 'title', configMap.extended_title );
return true;
}
// свернуть окно чата, если оно раскрыто Этот
else if ( slider_height === configMap.extended_height ) {
$chatSlider
.animate({ height : configMap.retracted_height })
.attr( 'title', configMap.retracted_title );
return true;
}
// ничего не делать, если окно чата в процессе перехода
return false;
}
// Обработчик события /onClickSlider/ По ме ща ем все методы обработки
// получает событие щелчка и вызывает toggleSlider
onClickSlider = function ( event ) {
toggleSlider();
return false;
};
// Открытый метод /initModule/
// устанавливает начальное состояние и предоставляет функциональность
//
initModule = function ( $container ) {
// отрисовать HTML
$container.html( configMap.template_html );
$chatSlider = $container.find( '.spa-slider' );
// инициализировать высоту и описание окна чата
// привязать обработчик к событию щелчка мышью
$chatSlider
.attr( 'title', configMap.retracted_title )
.click( onClickSlider );
return true;
};
return { initModule : initModule };
}( jQuery ));*/
// запустить spa, когда модель DOM будет готова
//Запускаем SPA только после того, как
