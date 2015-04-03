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

enum Task {
    bundle,
    clean,
    copy,
    lint,
    scripts,
    spec,
    test
}

register(Task.bundle, [Task.copy], () => {
    dts.bundle({
        main: "index.d.ts",
        name: "gulp-tsfmt",
        prefix: ""
    });
});

register(Task.clean, [], (callback) => {
    del("_build", callback);
});

register(Task.copy, [Task.scripts], () => {
    return gulp.src(path.join("_build", "src", "**", "*"))
        .pipe(gulp.dest("."));
});

register(Task.lint, [], () => {
    return gulp.src([
            "gulpfile.ts",
            path.join("{src,test}", "**", "*.ts")
        ])
        .pipe(tslint())
        .pipe(tslint.report("verbose", {
            emitError: true
        }));
});

register(Task.scripts, [Task.clean], () => {
    var compiler = gulp.src(path.join("{src,test,typings}", "**", "*.ts"))
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
    return results.pipe(gulp.dest("_build"));
});

register(Task.spec, [Task.scripts], (callback) => {
    gulp.src(path.join("_build", "src", "**", "*.js"))
        .pipe(istanbul({
            includeUntested: true
        }))
        .pipe(istanbul.hookRequire())
        .on("finish", () => {
            gulp.src(path.join("_build", "test", "**", "*.js"))
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
