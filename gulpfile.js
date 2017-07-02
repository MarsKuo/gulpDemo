//gulp主程式，要先裝全域，在裝local
var gulp = require('gulp');

//gulp-clean 刪檔案用
//gulp-minify-css //壓縮CSS
//gulp-uglify 壓縮js並移除console.log
//gulp-if 搭配minimist使用
//gulp-gh-pages 部屬至github
// var sourcemaps = require('gulp-sourcemaps'); // 避免被壓縮找不到檔案
// var babel = require('gulp-babel'); //es6解譯 記得安裝babel-preset-es2015
// var concat = require('gulp-concat'); //合併檔案
// var jade = require('gulp-jade'); //-----------jade轉HTML
// var sass = require('gulp-sass'); //-----------Sass轉CSS
// var plumber = require('gulp-plumber'); //-----------執行出錯，不中斷
// var postcss = require('gulp-postcss'); //-----------可安裝插件，例如autoprefixer

var $ = require('gulp-load-plugins')();//gulp-load-plugins可直接執行已安裝的gulp開頭的程式，不需要額外require

var gulpSequence = require('gulp-sequence') //依序執行process
var mainBowerFiles = require('main-bower-files');//取出bower內的套件

var browserSync = require('browser-sync').create();//WebServer，可搭配自動重新整理

var minimist = require('minimist');

var envOptions = {
    string: 'env',
    default: {env: 'develop'}
}
var option = minimist(process.argv.slice(2),envOptions)
console.log(option);

gulp.task('clean', function () {
    return gulp.src(['./.tmp','./public'], {read: false})
        .pipe($.clean());
});

//自動補上前贅詞，屬於postcss的延伸套件
var autoprefixer = require('autoprefixer');

gulp.task('CopyHtml',function(){
    return gulp.src('./source/**/*.html')     
    .pipe(gulp.dest('./public/'))
})


gulp.task('jade', function() {
  gulp.src('./source/**/*.jade')
    .pipe($.plumber())
    .pipe($.jade({
        pretty: true
    }))
    .pipe(gulp.dest('./public/'))
    .pipe(browserSync.stream());
});

gulp.task('sass', function () {
  
  //宣告給postcss用的plugins
   var plugins = [
        autoprefixer({browsers: ['last 2 version']})
    ];

  return gulp.src('./source/scss/**/*.scss')
    .pipe($.plumber()) //執行出錯，不中斷
    .pipe($.sourcemaps.init())//寫入sourcemaps方便debug，但實際只有一個request
    .pipe($.sass().on('error', $.sass.logError))
    .pipe($.postcss(plugins)) //透過postcss來執行autoprefixer
    .pipe($.concat('all.css'))//合併CSS
    .pipe($.if(option.env==='production',$.minifyCss()))//壓縮css 如果傳入gulp sass --env production，就會壓縮
    .pipe($.sourcemaps.write('.'))
    .pipe(gulp.dest('./public/css'))//輸出到public/css
    .pipe(browserSync.stream());
});

//es6解譯為es2015，需安裝es2015
gulp.task('babel', () => {
    return gulp.src('./source/js/**/*.js')
      .pipe($.sourcemaps.init())
      .pipe($.babel({
          presets: ['es2015']
      }))
      .pipe($.concat('all.js'))
      .pipe($.if(option.env==='production',$.uglify({
        compress: {
            drop_console:true
        }
      })))//js 如果傳入gulp --env production，就會壓縮
      .pipe($.sourcemaps.write('.'))
      .pipe(gulp.dest('./public/js'))
      .pipe(browserSync.stream());
});

//把透過mainBowerFiles把所需要js載到特定位置
gulp.task('bower', function() {
  return gulp.src(mainBowerFiles({
    //以 Vue.js 來說，他就不會正確取得 dist 資料夾內的 vue.js 此時可以透過自訂 mainBowerFiles 方式來作調整
    "overrides": {
        "vue": {                       // 套件名稱
            "main": "dist/vue.js"      // 取用的資料夾路徑
        }
    }
  }))
    .pipe(gulp.dest('./.tmp/vendors'));
    cb(err);
});

//執行vendorJs會先做bower，所以watch不用call bower
gulp.task('vendorJs',['bower'],function(){
    return gulp.src('./.tmp/vendors/**/**.js')
    .pipe($.order([   //排序，因為bootstrap相依jquery
      'jquery.js',
      'bootstrap.js'
    ]))
    //合併
    .pipe($.concat('vendors.js'))
    //壓縮
    .pipe($.if(option.env==='production',$.uglify()))//js 如果傳入gulp --env production，就會壓縮
    .pipe(gulp.dest('./public/js'));
})


//WebServer，並設定起始目錄
gulp.task('browser-sync', function() {
    browserSync.init({
        server: {
            baseDir: "./public"
        }
    });
});

gulp.task('image-min', () =>
    gulp.src('./source/images/*')
        .pipe($.if(option.env==='production',$.imagemin()))//圖片壓縮 如果傳入gulp --env production，就會壓縮
        .pipe(gulp.dest('./public/images'))
);

//監聽事件，並觸發function
gulp.task('watch', function () {
  gulp.watch('./source/scss/**/*.scss', ['sass']);
  gulp.watch('./source/*.jade', ['jade']);
  gulp.watch('./source/js/*.jade', ['babel']);
});

gulp.task('deploy', function() {
  return gulp.src('./public/**/*')
    .pipe($.ghPages());
});

gulp.task('build', gulpSequence('clean', 'jade', 'sass','vendorJs'))
gulp.task('default',['jade','sass','babel','vendorJs','browser-sync','image-min','watch'])