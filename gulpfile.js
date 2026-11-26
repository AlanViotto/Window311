const { src, dest, parallel, watch } = require("gulp");
const less = require("gulp-less");
const terser = require("gulp-terser");

function styles() {
  return src(["assets/less/screen.less", "assets/less/classic.less"])
    .pipe(less())
    .pipe(dest("dist/css"));
}

function scripts() {
  return src("assets/js/*.js")
    .pipe(terser({ format: { comments: /^!/ } }))
    .pipe(dest("dist/js"));
}

function watchSources() {
  watch("assets/less/**/*.less", styles);
  watch("assets/js/**/*.js", scripts);
}

exports.styles = styles;
exports.scripts = scripts;
exports.build = parallel(styles, scripts);
exports.default = exports.build;
exports.watch = require("gulp").series(exports.build, watchSources);
