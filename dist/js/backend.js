'use strict';

(function ($) {
  $(function () {
    App.auth = function (form) {
      console.log('auth:', form);

      // Получаем данные из формы
      // var dataForm = form.serialize();

      // Отправляем данные на сервер
      // $.post(form.attr('action'), dataForm, function(resp) {
      // Обработка данных с сервера
      // ...
      // Выключаем анимацию и перекрытие
      // App.removeLoading(form);
      // App.removeOverlay(form);
      // Если произошла ошибка авторизации, выводим ошибку с сервера
      // App.setErrorForm(form, 'Неверный логин или пароль');
      // Иначе
      // Скрываем форму
      // App.hideBlock(form.find(App.data.formContent));
      // Показываем блок Success в форме
      // App.showBlock(form.find(App.data.formSuccess));
      // });
    };

    App.recovery = function (form) {
      console.log('recovery:', form);

      // Получаем данные из формы
      // var dataForm = form.serialize();

      // Отправляем данные на сервер
      // $.post(form.attr('action'), dataForm, function(resp) {
      // Обработка данных с сервера
      // ...
      // Выключаем анимацию и перекрытие
      // App.removeLoading(form);
      // App.removeOverlay(form);
      // Если произошла ошибка авторизации, выводим ошибку с сервера
      // App.setErrorForm(form, 'Неверный email или логин');
      // Скрываем форму
      // App.hideBlock(form.find(App.data.formContent));
      // Показываем блок Success в форме
      // App.showBlock(form.find(App.data.formSuccess));
      // });
    };
  });
})(jQuery);