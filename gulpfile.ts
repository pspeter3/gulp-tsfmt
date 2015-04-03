/// <reference path="./typings/tsd.d.ts"/>
import del = require("del");
import dts = require("dts-bundle");
import gulp = require("gulp");
import istanbul = require("gulp-istanbul");
import mocha = require("gulp-mocha");
import path = require("path");
import through = require("through2");
import tslint = require("gulp-tslint");
import typescript = require("gulp-typescript");

// Tasks
enum Task {
    bundle,
    clean,
    copy,
    lint,
    scripts,
    spec,
    test
}

// Directories
var all = dir("**");
var build = dir("_build");
var root = dir(path.dirname(__filename));
var src = dir("src");
var test = dir("test");
var typings = dir("typings");

// Extensions
var js = ext.bind(null, "js");
var ts = ext.bind(null, "ts");

// Tasks
var gulpfile = "gulpfile";
var match = "*";

register(Task.bundle, [Task.copy], () => {
    dts.bundle({
        main: "index.d.ts",
        name: "gulp-tsfmt",
        prefix: ""
    });
});

register(Task.clean, [], (callback) => {
    del(root(build()), callback);
});

register(Task.copy, [Task.scripts], () => {
    return gulp.src(root(build(src(all("*")))))
        .pipe(gulp.dest(root()));
});

register(Task.lint, [], () => {
    return gulp.src([
            root(ts(gulpfile)),
            root(union(src(), test()), all(ts(match)))
        ])
        .pipe(tslint())
        .pipe(tslint.report("verbose", {
            emitError: true
        }));
});

register(Task.scripts, [Task.clean], () => {
    var compiler = gulp.src(root(union(src(), test(), typings()), all(ts(match))))
        .pipe(typescript({
            declarationFiles: true,
            module: "commonjs",
            noExternalResolve: true,
            noImplicitAny: true,
            noLib: false,
            removeComments: true,
            sortOutput: false,
            target: "ES5"
        }));
    var results = through.obj();
    var sources = [compiler.js, compiler.dts];
    sources.forEach((source) => {
        source.once("end", () => {
            sources = sources.filter((element) => {
                return element !== source;
            });
            if (sources.length === 0) {
                results.end();
            }
        });
        source.pipe(results, {end: false});
    });
    return results.pipe(gulp.dest(build()));
});

register(Task.spec, [Task.scripts], (callback) => {
    gulp.src(root(build(src(all(js(match))))))
        .pipe(istanbul({
            includeUntested: true
        }))
        .pipe(istanbul.hookRequire())
        .on("finish", () => {
            gulp.src(root(build(test(all(js(match))))))
                .pipe(mocha())
                .pipe(istanbul.writeReports())
                .on("finish", () => {
                    var err: Error = null;
                    var coverage = istanbul.summarizeCoverage();
                    var incomplete = Object.keys(coverage).filter((key) => {
                        return coverage[key].pct !== 100;
                    });
                    if (incomplete.length > 0) {
                        err = new Error(`Incomplete coverage for ${incomplete.join(", ")}`);
                    }
                    callback(err);
                });
        });
});

register(Task.test, [Task.lint, Task.spec]);

function name(task: Task): string {
    return Task[task];
}

function register(task: Task, deps: Task[], callback?: gulp.ITaskCallback): void {
    gulp.task(name(task), deps.map(name), callback);
}

function dir(prefix: string, join: (...parts: string[]) => string = path.join): (...parts: string[]) => string {
    return join.bind(path, prefix);
}

function union(...parts: string[]): string {
    return `{${parts.join(",")}}`;
}

function ext(extension: string, filename: string): string {
    return `${filename}.${extension}`;
}
