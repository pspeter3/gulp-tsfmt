import chai = require("chai");
import gutil = require("gulp-util");
import stream = require("stream");
import tsfmt = require("../src/index");
import VinylFile = require("vinyl");

var assert = chai.assert;

describe("gulp-tsfmt", () => {
    describe("params", () => {
        it("should handle no params", () => {
            tsfmt();
        });

        describe("options", () => {
            it("should handle options", () => {
                tsfmt({
                    options: {
                        IndentSize: 4,
                        TabSize: 4,
                        NewLineCharacter: "\r\n",
                        ConvertTabsToSpaces: true,
                        InsertSpaceAfterCommaDelimiter: true,
                        InsertSpaceAfterSemicolonInForStatements: true,
                        InsertSpaceBeforeAndAfterBinaryOperators: true,
                        InsertSpaceAfterKeywordsInControlFlowStatements: true,
                        InsertSpaceAfterFunctionKeywordForAnonymousFunctions: false,
                        InsertSpaceAfterOpeningAndBeforeClosingNonemptyParenthesis: false,
                        PlaceOpenBraceOnNewLineForFunctions: false,
                        PlaceOpenBraceOnNewLineForControlBlocks: false
                    }
                });
            });

            it("should handle some options", () => {
                tsfmt({
                    options: {
                        IndentSize: 2,
                        TabSize: 2
                    }
                });
            });
        });

        describe("target", () => {
            it("should handle target", () => {
                tsfmt({
                    target: "ES6"
                });
            });

            it("should throw an error for an invalid target", () => {
                const fn = () => {
                    tsfmt({
                        target: "Fail"
                    });
                };
                assert.throws(fn, "Fail is not a valid script target");
            });
        });
    });

    describe("buffers", () => {
        it("should format the code", (done) => {
            var file = new VinylFile({
                contents: new Buffer("var a=function(v:number){return 0+1+2+3;}", "utf8")
            });
            var formatter = tsfmt();
            formatter.once("data", (file: VinylFile) => {
                assert.equal(file.contents.toString(), "var a = function(v: number) { return 0 + 1 + 2 + 3; }");
                done();
            });
            formatter.write(<any>file);
        });
    });

    describe("streams", () => {
        it("should not be supported", (done) => {
            var file = new VinylFile({
                contents: new stream.Readable()
            });
            var formatter = tsfmt();
            formatter.once("error", (error: Error) => {
                assert.equal(error.message, "Streams are not supported");
                assert.equal((<{plugin?: string}>error).plugin, "gulp-tsfmt");
                assert.instanceOf(error, gutil.PluginError);
                done();
            });
            formatter.write(<any>file);
        });
    });
});
