import gutil = require("gulp-util");
import path = require("path");
import through = require("through2");
import ts = require("typescript");

var PLUGIN_NAME = "gulp-tsfmt";

var DEFAULTS: {options?: ts.FormatCodeOptions; target?: string} = {
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
    },
    target: "ES5"
};

class Transformer {
    private _formatter: Formatter;
    private _options: ts.FormatCodeOptions;
    private _rulesProvider: RulesProvider;
    private _target: ts.ScriptTarget;

    constructor(options: ts.FormatCodeOptions, target: ts.ScriptTarget) {
        this._formatter = (<{formatting?: Formatter}>ts).formatting;
        this._options = options;
        this._rulesProvider = new this._formatter.RulesProvider();
        this._rulesProvider.ensureUpToDate(this._options);
        this._target = target;
    }

    process(file: VinylFile): void {
        var source = this._toSourceFile(file);
        var edits = this._formatSource(source);
        file.contents = this._applyEdits(file, edits);
    }

    private _toSourceFile(file: VinylFile): ts.SourceFile {
        return ts.createSourceFile(path.basename(file.path), file.contents.toString(), this._target, ts.servicesVersion);
    }

    private _formatSource(source: ts.SourceFile): ts.TextChange[] {
        return this._formatter.formatDocument(source, this._rulesProvider, this._options);
    }

    private _applyEdits(file: VinylFile, edits: ts.TextChange[]): Buffer {
        return edits.reduceRight((contents, edit) => {
            var head = contents.slice(0, edit.span.start);
            var tail = contents.slice(edit.span.start + edit.span.length);
            var change = new Buffer(edit.newText, "utf8");
            return Buffer.concat([head, change, tail]);
        }, file.contents);
    }
}

function formatOptions(options: {
    IndentSize?: number;
    TabSize?: number;
    NewLineCharacter?: string;
    ConvertTabsToSpaces?: boolean;
    InsertSpaceAfterCommaDelimiter?: boolean;
    InsertSpaceAfterSemicolonInForStatements?: boolean;
    InsertSpaceBeforeAndAfterBinaryOperators?: boolean;
    InsertSpaceAfterKeywordsInControlFlowStatements?: boolean;
    InsertSpaceAfterFunctionKeywordForAnonymousFunctions?: boolean;
    InsertSpaceAfterOpeningAndBeforeClosingNonemptyParenthesis?: boolean;
    PlaceOpenBraceOnNewLineForFunctions?: boolean;
    PlaceOpenBraceOnNewLineForControlBlocks?: boolean;
}): ts.FormatCodeOptions {
    var defaults: any = DEFAULTS.options;
    var params: any = options;
    var result: any = {};
    Object.keys(defaults).forEach((key) => {
        result[key] = params.hasOwnProperty(key) ? params[key] : defaults[key];
    });
    return result;
}

function scriptTarget(target: string): ts.ScriptTarget {
    if (!ts.ScriptTarget.hasOwnProperty(target)) {
        throw new gutil.PluginError(PLUGIN_NAME, `${target} is not a valid script target`);
    }
    return (<{[key: string]: ts.ScriptTarget}>(<any>ts).ScriptTarget)[target];
}

function format(params?: {
    options?: {
        IndentSize?: number;
        TabSize?: number;
        NewLineCharacter?: string;
        ConvertTabsToSpaces?: boolean;
        InsertSpaceAfterCommaDelimiter?: boolean;
        InsertSpaceAfterSemicolonInForStatements?: boolean;
        InsertSpaceBeforeAndAfterBinaryOperators?: boolean;
        InsertSpaceAfterKeywordsInControlFlowStatements?: boolean;
        InsertSpaceAfterFunctionKeywordForAnonymousFunctions?: boolean;
        InsertSpaceAfterOpeningAndBeforeClosingNonemptyParenthesis?: boolean;
        PlaceOpenBraceOnNewLineForFunctions?: boolean;
        PlaceOpenBraceOnNewLineForControlBlocks?: boolean;
    };
    target?: string
}): NodeJS.ReadWriteStream {
    params = params || DEFAULTS;
    var options = params.options || DEFAULTS.options;
    var target = params.target || DEFAULTS.target;
    var transformer = new Transformer(formatOptions(options), scriptTarget(target));
    return through.obj(function (file: VinylFile, encoding: string, callback: () => void) {
        var stream = <NodeJS.ReadWriteStream>this;
        if (file.isStream()) {
            stream.emit("error", new gutil.PluginError(PLUGIN_NAME, "Streams are not supported"));
        }
        if (file.isBuffer()) {
            transformer.process(file);
        }
        (<any>stream).push(file);
        callback();
    });
}

interface Formatter {
    RulesProvider: { new(): RulesProvider };
    formatDocument(source: ts.SourceFile, rulesProvider: RulesProvider, options: ts.FormatCodeOptions): ts.TextChange[];
}

interface RulesProvider {
    ensureUpToDate(options: ts.FormatCodeOptions): void;
}

interface VinylFile {
    path: string;
    contents: Buffer;
    isBuffer(): boolean;
    isStream(): boolean;
}

export = format;
