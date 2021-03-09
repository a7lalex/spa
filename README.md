# FTED Template 2

Это официальный шаблон для фронтенд-разработки используемый в [IS4Business](http://www.is4business.ru). 

** Пожалуйста, при возникновении проблем создавайте issuses в [FTED](http://git.apps4b-demo.ru/frontend/fted-2/issues) репозитории. **

Система сборки имеет следующие возможности:
- Handlebars HTML шаблоны в оберке с Panini
- Sass компиляция
- JavaScript конкантинация
- Автогенерация спрайта из мелких картинок
- Разработка с BrowserSync сервером и автоматической перезагрузкой страницы + синхронизация в разных браузерах, устройствах
- Компрессия js и css
- Проверки кода на качество (StyleLint, ESLint)
- Проверка опечаток и ошибок в html-файлах


## Установка окружения (если оно не было установлено ранее)

Чтобы использовать этот шаблон на компьютере должно быть установлено:

- [NodeJS](https://nodejs.org/en/) (8.11 или новее)
- [Git](https://git-scm.com/)
- [ImageMagick](http://imagemagick.org)

## Настройка окружения (если оно не было настроенно ранее)

Установить gulp-cli глобально, набрав в консоли `npm i -g gulp-cli`

## Установка шаблона FTED 2

Скачайте себе на компьютер текущей проект и распакуйте архив.
Далее откройте директорию проекта в командной строке и установите зависимости:

```bash
npm i
```

## Повседневная работа с проектом

Запустите `npm start` для запуска сборки. Ваш готовый сайт будет создан в папке под названием `dist`, который можно просмотреть по адресу URL:

```
http://localhost:8000
```

### Автоматическая генерации спрайтов

Картинки формата PNG помещать в папку `dev/img/spritePNG/` из них и будет собран спрайт.
Сам спрайт будет находиться в папке `dist/img/spritePNG.png`.

Картинки формата SVG помещать в папку `dev/img/spriteSVG/` из них и будет собран спрайт.
Сам спрайт будет находиться в папке `dist/img/spriteSVG.svg`.

### Все команды

<table>
  <thead>
    <tr>
      <th>Команда</th>
      <th>Результат</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td width="25%"><code>npm i</code></td>
      <td>Установить зависимости</td>
    </tr>
    <tr>
      <td><code>npm start</code></td>
      <td>Запустить сборку, сервер и слежение за файлами</td>
    </tr>
    <tr>
      <td><code>npm run build</code></td>
      <td>Сборка проекта без карт кода (сжатый вид, как результат работы)</td>
    </tr>
    <tr>
      <td><code>npm run clear</code></td>
      <td>Очистка директории сборки от собранных файлов</td>
    </tr>
    <tr>
      <td><code>npm run img</code></td>
      <td>Сборка картинок</td>
    </tr>
    <tr>
      <td><code>npm run test:css</code></td>
      <td>Проверка всех scss</td>
    </tr>
    <tr>
      <td><code>npm run test:css:blocks</code></td>
      <td>Проверка scss в директории blocks</td>
    </tr>
    <tr>
      <td><code>npm run test:css:components</code></td>
      <td>Проверка scss в директории dev/css/components</td>
    </tr>
    <tr>
      <td><code>npm run test:js</code></td>
      <td>Проверить на ошибки JS всего проекта</td>
    </tr>
    <tr>
      <td><code>npm run test:js:project</code></td>
      <td>Проверить на ошибки файл `project`</td>
    </tr>
    <tr>
      <td><code>npm run test:js:project:fix</code></td>
      <td>Проверить на ошибки файл `project` и автоматически их исправить</td>
    </tr>
    <tr>
      <td><code>npm run test:orpho</code></td>
      <td>Проверка орфографии и опечаток в собранных файлах (html)</td>
    </tr>
  </tbody>
</table>
