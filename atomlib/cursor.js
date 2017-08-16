(function() {
  var Cursor, Emitter, EmptyLineRegExp, Model, Point, Range, _, ref,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  ref = require('text-buffer'), Point = ref.Point, Range = ref.Range;

  Emitter = require('event-kit').Emitter;

  _ = require('underscore-plus');

  Model = require('./model');

  EmptyLineRegExp = /(\r\n[\t ]*\r\n)|(\n[\t ]*\n)/g;

  module.exports = Cursor = (function(superClass) {
    extend(Cursor, superClass);

    Cursor.prototype.screenPosition = null;

    Cursor.prototype.bufferPosition = null;

    Cursor.prototype.goalColumn = null;

    function Cursor(arg) {
      var id;
      this.editor = arg.editor, this.marker = arg.marker, id = arg.id;
      this.emitter = new Emitter;
      this.assignId(id);
    }

    Cursor.prototype.destroy = function() {
      return this.marker.destroy();
    };


    /*
    Section: Event Subscription
     */

    Cursor.prototype.onDidChangePosition = function(callback) {
      return this.emitter.on('did-change-position', callback);
    };

    Cursor.prototype.onDidDestroy = function(callback) {
      return this.emitter.on('did-destroy', callback);
    };


    /*
    Section: Managing Cursor Position
     */

    Cursor.prototype.setScreenPosition = function(screenPosition, options) {
      if (options == null) {
        options = {};
      }
      return this.changePosition(options, (function(_this) {
        return function() {
          return _this.marker.setHeadScreenPosition(screenPosition, options);
        };
      })(this));
    };

    Cursor.prototype.getScreenPosition = function() {
      return this.marker.getHeadScreenPosition();
    };

    Cursor.prototype.setBufferPosition = function(bufferPosition, options) {
      if (options == null) {
        options = {};
      }
      return this.changePosition(options, (function(_this) {
        return function() {
          return _this.marker.setHeadBufferPosition(bufferPosition, options);
        };
      })(this));
    };

    Cursor.prototype.getBufferPosition = function() {
      return this.marker.getHeadBufferPosition();
    };

    Cursor.prototype.getScreenRow = function() {
      return this.getScreenPosition().row;
    };

    Cursor.prototype.getScreenColumn = function() {
      return this.getScreenPosition().column;
    };

    Cursor.prototype.getBufferRow = function() {
      return this.getBufferPosition().row;
    };

    Cursor.prototype.getBufferColumn = function() {
      return this.getBufferPosition().column;
    };

    Cursor.prototype.getCurrentBufferLine = function() {
      return this.editor.lineTextForBufferRow(this.getBufferRow());
    };

    Cursor.prototype.isAtBeginningOfLine = function() {
      return this.getBufferPosition().column === 0;
    };

    Cursor.prototype.isAtEndOfLine = function() {
      return this.getBufferPosition().isEqual(this.getCurrentLineBufferRange().end);
    };


    /*
    Section: Cursor Position Details
     */

    Cursor.prototype.getMarker = function() {
      return this.marker;
    };

    Cursor.prototype.isSurroundedByWhitespace = function() {
      var column, range, ref1, row;
      ref1 = this.getBufferPosition(), row = ref1.row, column = ref1.column;
      range = [[row, column - 1], [row, column + 1]];
      return /^\s+$/.test(this.editor.getTextInBufferRange(range));
    };

    Cursor.prototype.isBetweenWordAndNonWord = function() {
      var after, before, column, nonWordCharacters, range, ref1, ref2, row;
      if (this.isAtBeginningOfLine() || this.isAtEndOfLine()) {
        return false;
      }
      ref1 = this.getBufferPosition(), row = ref1.row, column = ref1.column;
      range = [[row, column - 1], [row, column + 1]];
      ref2 = this.editor.getTextInBufferRange(range), before = ref2[0], after = ref2[1];
      if (/\s/.test(before) || /\s/.test(after)) {
        return false;
      }
      nonWordCharacters = this.getNonWordCharacters();
      return nonWordCharacters.includes(before) !== nonWordCharacters.includes(after);
    };

    Cursor.prototype.isInsideWord = function(options) {
      var column, range, ref1, ref2, row;
      ref1 = this.getBufferPosition(), row = ref1.row, column = ref1.column;
      range = [[row, column], [row, 2e308]];
      return this.editor.getTextInBufferRange(range).search((ref2 = options != null ? options.wordRegex : void 0) != null ? ref2 : this.wordRegExp()) === 0;
    };

    Cursor.prototype.getIndentLevel = function() {
      if (this.editor.getSoftTabs()) {
        return this.getBufferColumn() / this.editor.getTabLength();
      } else {
        return this.getBufferColumn();
      }
    };

    Cursor.prototype.getScopeDescriptor = function() {
      return this.editor.scopeDescriptorForBufferPosition(this.getBufferPosition());
    };

    Cursor.prototype.hasPrecedingCharactersOnLine = function() {
      var bufferPosition, firstCharacterColumn, line;
      bufferPosition = this.getBufferPosition();
      line = this.editor.lineTextForBufferRow(bufferPosition.row);
      firstCharacterColumn = line.search(/\S/);
      if (firstCharacterColumn === -1) {
        return false;
      } else {
        return bufferPosition.column > firstCharacterColumn;
      }
    };

    Cursor.prototype.isLastCursor = function() {
      return this === this.editor.getLastCursor();
    };


    /*
    Section: Moving the Cursor
     */

    Cursor.prototype.moveUp = function(rowCount, arg) {
      var column, moveToEndOfSelection, range, ref1, ref2, row;
      if (rowCount == null) {
        rowCount = 1;
      }
      moveToEndOfSelection = (arg != null ? arg : {}).moveToEndOfSelection;
      range = this.marker.getScreenRange();
      if (moveToEndOfSelection && !range.isEmpty()) {
        ref1 = range.start, row = ref1.row, column = ref1.column;
      } else {
        ref2 = this.getScreenPosition(), row = ref2.row, column = ref2.column;
      }
      if (this.goalColumn != null) {
        column = this.goalColumn;
      }
      this.setScreenPosition({
        row: row - rowCount,
        column: column
      }, {
        skipSoftWrapIndentation: true
      });
      return this.goalColumn = column;
    };

    Cursor.prototype.moveDown = function(rowCount, arg) {
      var column, moveToEndOfSelection, range, ref1, ref2, row;
      if (rowCount == null) {
        rowCount = 1;
      }
      moveToEndOfSelection = (arg != null ? arg : {}).moveToEndOfSelection;
      range = this.marker.getScreenRange();
      if (moveToEndOfSelection && !range.isEmpty()) {
        ref1 = range.end, row = ref1.row, column = ref1.column;
      } else {
        ref2 = this.getScreenPosition(), row = ref2.row, column = ref2.column;
      }
      if (this.goalColumn != null) {
        column = this.goalColumn;
      }
      this.setScreenPosition({
        row: row + rowCount,
        column: column
      }, {
        skipSoftWrapIndentation: true
      });
      return this.goalColumn = column;
    };

    Cursor.prototype.moveLeft = function(columnCount, arg) {
      var column, moveToEndOfSelection, range, ref1, row;
      if (columnCount == null) {
        columnCount = 1;
      }
      moveToEndOfSelection = (arg != null ? arg : {}).moveToEndOfSelection;
      range = this.marker.getScreenRange();
      if (moveToEndOfSelection && !range.isEmpty()) {
        return this.setScreenPosition(range.start);
      } else {
        ref1 = this.getScreenPosition(), row = ref1.row, column = ref1.column;
        while (columnCount > column && row > 0) {
          columnCount -= column;
          column = this.editor.lineLengthForScreenRow(--row);
          columnCount--;
        }
        column = column - columnCount;
        return this.setScreenPosition({
          row: row,
          column: column
        }, {
          clipDirection: 'backward'
        });
      }
    };

    Cursor.prototype.moveRight = function(columnCount, arg) {
      var column, columnsRemainingInLine, maxLines, moveToEndOfSelection, range, ref1, row, rowLength;
      if (columnCount == null) {
        columnCount = 1;
      }
      moveToEndOfSelection = (arg != null ? arg : {}).moveToEndOfSelection;
      range = this.marker.getScreenRange();
      if (moveToEndOfSelection && !range.isEmpty()) {
        return this.setScreenPosition(range.end);
      } else {
        ref1 = this.getScreenPosition(), row = ref1.row, column = ref1.column;
        maxLines = this.editor.getScreenLineCount();
        rowLength = this.editor.lineLengthForScreenRow(row);
        columnsRemainingInLine = rowLength - column;
        while (columnCount > columnsRemainingInLine && row < maxLines - 1) {
          columnCount -= columnsRemainingInLine;
          columnCount--;
          column = 0;
          rowLength = this.editor.lineLengthForScreenRow(++row);
          columnsRemainingInLine = rowLength;
        }
        column = column + columnCount;
        return this.setScreenPosition({
          row: row,
          column: column
        }, {
          clipDirection: 'forward'
        });
      }
    };

    Cursor.prototype.moveToTop = function() {
      return this.setBufferPosition([0, 0]);
    };

    Cursor.prototype.moveToBottom = function() {
      return this.setBufferPosition(this.editor.getEofBufferPosition());
    };

    Cursor.prototype.moveToBeginningOfScreenLine = function() {
      return this.setScreenPosition([this.getScreenRow(), 0]);
    };

    Cursor.prototype.moveToBeginningOfLine = function() {
      return this.setBufferPosition([this.getBufferRow(), 0]);
    };

    Cursor.prototype.moveToFirstCharacterOfLine = function() {
      var firstCharacterColumn, screenLineBufferRange, screenLineEnd, screenLineStart, screenRow, targetBufferColumn;
      screenRow = this.getScreenRow();
      screenLineStart = this.editor.clipScreenPosition([screenRow, 0], {
        skipSoftWrapIndentation: true
      });
      screenLineEnd = [screenRow, 2e308];
      screenLineBufferRange = this.editor.bufferRangeForScreenRange([screenLineStart, screenLineEnd]);
      firstCharacterColumn = null;
      this.editor.scanInBufferRange(/\S/, screenLineBufferRange, function(arg) {
        var range, stop;
        range = arg.range, stop = arg.stop;
        firstCharacterColumn = range.start.column;
        return stop();
      });
      if ((firstCharacterColumn != null) && firstCharacterColumn !== this.getBufferColumn()) {
        targetBufferColumn = firstCharacterColumn;
      } else {
        targetBufferColumn = screenLineBufferRange.start.column;
      }
      return this.setBufferPosition([screenLineBufferRange.start.row, targetBufferColumn]);
    };

    Cursor.prototype.moveToEndOfScreenLine = function() {
      return this.setScreenPosition([this.getScreenRow(), 2e308]);
    };

    Cursor.prototype.moveToEndOfLine = function() {
      return this.setBufferPosition([this.getBufferRow(), 2e308]);
    };

    Cursor.prototype.moveToBeginningOfWord = function() {
      return this.setBufferPosition(this.getBeginningOfCurrentWordBufferPosition());
    };

    Cursor.prototype.moveToEndOfWord = function() {
      var position;
      if (position = this.getEndOfCurrentWordBufferPosition()) {
        return this.setBufferPosition(position);
      }
    };

    Cursor.prototype.moveToBeginningOfNextWord = function() {
      var position;
      if (position = this.getBeginningOfNextWordBufferPosition()) {
        return this.setBufferPosition(position);
      }
    };

    Cursor.prototype.moveToPreviousWordBoundary = function() {
      var position;
      if (position = this.getPreviousWordBoundaryBufferPosition()) {
        return this.setBufferPosition(position);
      }
    };

    Cursor.prototype.moveToNextWordBoundary = function() {
      var position;
      if (position = this.getNextWordBoundaryBufferPosition()) {
        return this.setBufferPosition(position);
      }
    };

    Cursor.prototype.moveToPreviousSubwordBoundary = function() {
      var options, position;
      options = {
        wordRegex: this.subwordRegExp({
          backwards: true
        })
      };
      if (position = this.getPreviousWordBoundaryBufferPosition(options)) {
        return this.setBufferPosition(position);
      }
    };

    Cursor.prototype.moveToNextSubwordBoundary = function() {
      var options, position;
      options = {
        wordRegex: this.subwordRegExp()
      };
      if (position = this.getNextWordBoundaryBufferPosition(options)) {
        return this.setBufferPosition(position);
      }
    };

    Cursor.prototype.skipLeadingWhitespace = function() {
      var endOfLeadingWhitespace, position, scanRange;
      position = this.getBufferPosition();
      scanRange = this.getCurrentLineBufferRange();
      endOfLeadingWhitespace = null;
      this.editor.scanInBufferRange(/^[ \t]*/, scanRange, function(arg) {
        var range;
        range = arg.range;
        return endOfLeadingWhitespace = range.end;
      });
      if (endOfLeadingWhitespace.isGreaterThan(position)) {
        return this.setBufferPosition(endOfLeadingWhitespace);
      }
    };

    Cursor.prototype.moveToBeginningOfNextParagraph = function() {
      var position;
      if (position = this.getBeginningOfNextParagraphBufferPosition()) {
        return this.setBufferPosition(position);
      }
    };

    Cursor.prototype.moveToBeginningOfPreviousParagraph = function() {
      var position;
      if (position = this.getBeginningOfPreviousParagraphBufferPosition()) {
        return this.setBufferPosition(position);
      }
    };


    /*
    Section: Local Positions and Ranges
     */

    Cursor.prototype.getPreviousWordBoundaryBufferPosition = function(options) {
      var beginningOfWordPosition, currentBufferPosition, previousNonBlankRow, ref1, scanRange;
      if (options == null) {
        options = {};
      }
      currentBufferPosition = this.getBufferPosition();
      previousNonBlankRow = this.editor.buffer.previousNonBlankRow(currentBufferPosition.row);
      scanRange = [[previousNonBlankRow != null ? previousNonBlankRow : 0, 0], currentBufferPosition];
      beginningOfWordPosition = null;
      this.editor.backwardsScanInBufferRange((ref1 = options.wordRegex) != null ? ref1 : this.wordRegExp(), scanRange, function(arg) {
        var range, stop;
        range = arg.range, stop = arg.stop;
        if (range.start.row < currentBufferPosition.row && currentBufferPosition.column > 0) {
          beginningOfWordPosition = new Point(currentBufferPosition.row, 0);
        } else if (range.end.isLessThan(currentBufferPosition)) {
          beginningOfWordPosition = range.end;
        } else {
          beginningOfWordPosition = range.start;
        }
        if (!(beginningOfWordPosition != null ? beginningOfWordPosition.isEqual(currentBufferPosition) : void 0)) {
          return stop();
        }
      });
      return beginningOfWordPosition || currentBufferPosition;
    };

    Cursor.prototype.getNextWordBoundaryBufferPosition = function(options) {
      var currentBufferPosition, endOfWordPosition, ref1, scanRange;
      if (options == null) {
        options = {};
      }
      currentBufferPosition = this.getBufferPosition();
      scanRange = [currentBufferPosition, this.editor.getEofBufferPosition()];
      endOfWordPosition = null;
      this.editor.scanInBufferRange((ref1 = options.wordRegex) != null ? ref1 : this.wordRegExp(), scanRange, function(arg) {
        var range, stop;
        range = arg.range, stop = arg.stop;
        if (range.start.row > currentBufferPosition.row) {
          endOfWordPosition = new Point(range.start.row, 0);
        } else if (range.start.isGreaterThan(currentBufferPosition)) {
          endOfWordPosition = range.start;
        } else {
          endOfWordPosition = range.end;
        }
        if (!(endOfWordPosition != null ? endOfWordPosition.isEqual(currentBufferPosition) : void 0)) {
          return stop();
        }
      });
      return endOfWordPosition || currentBufferPosition;
    };

    Cursor.prototype.getBeginningOfCurrentWordBufferPosition = function(options) {
      var allowPrevious, beginningOfWordPosition, currentBufferPosition, previousNonBlankRow, ref1, ref2, ref3, scanRange;
      if (options == null) {
        options = {};
      }
      allowPrevious = (ref1 = options.allowPrevious) != null ? ref1 : true;
      currentBufferPosition = this.getBufferPosition();
      previousNonBlankRow = (ref2 = this.editor.buffer.previousNonBlankRow(currentBufferPosition.row)) != null ? ref2 : 0;
      scanRange = [[previousNonBlankRow, 0], currentBufferPosition];
      beginningOfWordPosition = null;
      this.editor.backwardsScanInBufferRange((ref3 = options.wordRegex) != null ? ref3 : this.wordRegExp(options), scanRange, function(arg) {
        var matchText, range, stop;
        range = arg.range, matchText = arg.matchText, stop = arg.stop;
        if (matchText === '' && range.start.column !== 0) {
          return;
        }
        if (range.start.isLessThan(currentBufferPosition)) {
          if (range.end.isGreaterThanOrEqual(currentBufferPosition) || allowPrevious) {
            beginningOfWordPosition = range.start;
          }
          return stop();
        }
      });
      if (beginningOfWordPosition != null) {
        return beginningOfWordPosition;
      } else if (allowPrevious) {
        return new Point(0, 0);
      } else {
        return currentBufferPosition;
      }
    };

    Cursor.prototype.getEndOfCurrentWordBufferPosition = function(options) {
      var allowNext, currentBufferPosition, endOfWordPosition, ref1, ref2, scanRange;
      if (options == null) {
        options = {};
      }
      allowNext = (ref1 = options.allowNext) != null ? ref1 : true;
      currentBufferPosition = this.getBufferPosition();
      scanRange = [currentBufferPosition, this.editor.getEofBufferPosition()];
      endOfWordPosition = null;
      this.editor.scanInBufferRange((ref2 = options.wordRegex) != null ? ref2 : this.wordRegExp(options), scanRange, function(arg) {
        var matchText, range, stop;
        range = arg.range, matchText = arg.matchText, stop = arg.stop;
        if (matchText === '' && range.start.column !== 0) {
          return;
        }
        if (range.end.isGreaterThan(currentBufferPosition)) {
          if (allowNext || range.start.isLessThanOrEqual(currentBufferPosition)) {
            endOfWordPosition = range.end;
          }
          return stop();
        }
      });
      return endOfWordPosition != null ? endOfWordPosition : currentBufferPosition;
    };

    Cursor.prototype.getBeginningOfNextWordBufferPosition = function(options) {
      var beginningOfNextWordPosition, currentBufferPosition, ref1, scanRange, start;
      if (options == null) {
        options = {};
      }
      currentBufferPosition = this.getBufferPosition();
      start = this.isInsideWord(options) ? this.getEndOfCurrentWordBufferPosition(options) : currentBufferPosition;
      scanRange = [start, this.editor.getEofBufferPosition()];
      beginningOfNextWordPosition = null;
      this.editor.scanInBufferRange((ref1 = options.wordRegex) != null ? ref1 : this.wordRegExp(), scanRange, function(arg) {
        var range, stop;
        range = arg.range, stop = arg.stop;
        beginningOfNextWordPosition = range.start;
        return stop();
      });
      return beginningOfNextWordPosition || currentBufferPosition;
    };

    Cursor.prototype.getCurrentWordBufferRange = function(options) {
      var endOptions, startOptions;
      if (options == null) {
        options = {};
      }
      startOptions = Object.assign(_.clone(options), {
        allowPrevious: false
      });
      endOptions = Object.assign(_.clone(options), {
        allowNext: false
      });
      return new Range(this.getBeginningOfCurrentWordBufferPosition(startOptions), this.getEndOfCurrentWordBufferPosition(endOptions));
    };

    Cursor.prototype.getCurrentLineBufferRange = function(options) {
      return this.editor.bufferRangeForBufferRow(this.getBufferRow(), options);
    };

    Cursor.prototype.getCurrentParagraphBufferRange = function() {
      return this.editor.languageMode.rowRangeForParagraphAtBufferRow(this.getBufferRow());
    };

    Cursor.prototype.getCurrentWordPrefix = function() {
      return this.editor.getTextInBufferRange([this.getBeginningOfCurrentWordBufferPosition(), this.getBufferPosition()]);
    };


    /*
    Section: Visibility
     */


    /*
    Section: Comparing to another cursor
     */

    Cursor.prototype.compare = function(otherCursor) {
      return this.getBufferPosition().compare(otherCursor.getBufferPosition());
    };


    /*
    Section: Utilities
     */

    Cursor.prototype.clearSelection = function(options) {
      var ref1;
      return (ref1 = this.selection) != null ? ref1.clear(options) : void 0;
    };

    Cursor.prototype.wordRegExp = function(options) {
      var nonWordCharacters, ref1, source;
      nonWordCharacters = _.escapeRegExp(this.getNonWordCharacters());
      source = "^[\t ]*$|[^\\s" + nonWordCharacters + "]+";
      if ((ref1 = options != null ? options.includeNonWordCharacters : void 0) != null ? ref1 : true) {
        source += "|" + ("[" + nonWordCharacters + "]+");
      }
      return new RegExp(source, "g");
    };

    Cursor.prototype.subwordRegExp = function(options) {
      var lowercaseLetters, nonWordCharacters, segments, snakeCamelSegment, uppercaseLetters;
      if (options == null) {
        options = {};
      }
      nonWordCharacters = this.getNonWordCharacters();
      lowercaseLetters = 'a-z\\u00DF-\\u00F6\\u00F8-\\u00FF';
      uppercaseLetters = 'A-Z\\u00C0-\\u00D6\\u00D8-\\u00DE';
      snakeCamelSegment = "[" + uppercaseLetters + "]?[" + lowercaseLetters + "]+";
      segments = ["^[\t ]+", "[\t ]+$", "[" + uppercaseLetters + "]+(?![" + lowercaseLetters + "])", "\\d+"];
      if (options.backwards) {
        segments.push(snakeCamelSegment + "_*");
        segments.push("[" + (_.escapeRegExp(nonWordCharacters)) + "]+\\s*");
      } else {
        segments.push("_*" + snakeCamelSegment);
        segments.push("\\s*[" + (_.escapeRegExp(nonWordCharacters)) + "]+");
      }
      segments.push("_+");
      return new RegExp(segments.join("|"), "g");
    };


    /*
    Section: Private
     */

    Cursor.prototype.getNonWordCharacters = function() {
      return this.editor.getNonWordCharacters(this.getScopeDescriptor().getScopesArray());
    };

    Cursor.prototype.changePosition = function(options, fn) {
      var ref1;
      this.clearSelection({
        autoscroll: false
      });
      fn();
      if ((ref1 = options.autoscroll) != null ? ref1 : this.isLastCursor()) {
        return this.autoscroll();
      }
    };

    Cursor.prototype.getScreenRange = function() {
      var column, ref1, row;
      ref1 = this.getScreenPosition(), row = ref1.row, column = ref1.column;
      return new Range(new Point(row, column), new Point(row, column + 1));
    };

    Cursor.prototype.autoscroll = function(options) {
      if (options == null) {
        options = {};
      }
      options.clip = false;
      return this.editor.scrollToScreenRange(this.getScreenRange(), options);
    };

    Cursor.prototype.getBeginningOfNextParagraphBufferPosition = function() {
      var column, eof, position, row, scanRange, start;
      start = this.getBufferPosition();
      eof = this.editor.getEofBufferPosition();
      scanRange = [start, eof];
      row = eof.row, column = eof.column;
      position = new Point(row, column - 1);
      this.editor.scanInBufferRange(EmptyLineRegExp, scanRange, function(arg) {
        var range, stop;
        range = arg.range, stop = arg.stop;
        position = range.start.traverse(Point(1, 0));
        if (!position.isEqual(start)) {
          return stop();
        }
      });
      return position;
    };

    Cursor.prototype.getBeginningOfPreviousParagraphBufferPosition = function() {
      var column, position, row, scanRange, start;
      start = this.getBufferPosition();
      row = start.row, column = start.column;
      scanRange = [[row - 1, column], [0, 0]];
      position = new Point(0, 0);
      this.editor.backwardsScanInBufferRange(EmptyLineRegExp, scanRange, function(arg) {
        var range, stop;
        range = arg.range, stop = arg.stop;
        position = range.start.traverse(Point(1, 0));
        if (!position.isEqual(start)) {
          return stop();
        }
      });
      return position;
    };

    return Cursor;

  })(Model);

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiL1VzZXJzL2Rpc3RpbGxlci9hdG9tL291dC9hcHAvc3JjL2N1cnNvci5jb2ZmZWUiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFBQSxNQUFBLDZEQUFBO0lBQUE7OztFQUFBLE1BQWlCLE9BQUEsQ0FBUSxhQUFSLENBQWpCLEVBQUMsaUJBQUQsRUFBUTs7RUFDUCxVQUFXLE9BQUEsQ0FBUSxXQUFSOztFQUNaLENBQUEsR0FBSSxPQUFBLENBQVEsaUJBQVI7O0VBQ0osS0FBQSxHQUFRLE9BQUEsQ0FBUSxTQUFSOztFQUVSLGVBQUEsR0FBa0I7O0VBT2xCLE1BQU0sQ0FBQyxPQUFQLEdBQ007OztxQkFDSixjQUFBLEdBQWdCOztxQkFDaEIsY0FBQSxHQUFnQjs7cUJBQ2hCLFVBQUEsR0FBWTs7SUFHQyxnQkFBQyxHQUFEO0FBQ1gsVUFBQTtNQURhLElBQUMsQ0FBQSxhQUFBLFFBQVEsSUFBQyxDQUFBLGFBQUEsUUFBUTtNQUMvQixJQUFDLENBQUEsT0FBRCxHQUFXLElBQUk7TUFDZixJQUFDLENBQUEsUUFBRCxDQUFVLEVBQVY7SUFGVzs7cUJBSWIsT0FBQSxHQUFTLFNBQUE7YUFDUCxJQUFDLENBQUEsTUFBTSxDQUFDLE9BQVIsQ0FBQTtJQURPOzs7QUFHVDs7OztxQkFnQkEsbUJBQUEsR0FBcUIsU0FBQyxRQUFEO2FBQ25CLElBQUMsQ0FBQSxPQUFPLENBQUMsRUFBVCxDQUFZLHFCQUFaLEVBQW1DLFFBQW5DO0lBRG1COztxQkFRckIsWUFBQSxHQUFjLFNBQUMsUUFBRDthQUNaLElBQUMsQ0FBQSxPQUFPLENBQUMsRUFBVCxDQUFZLGFBQVosRUFBMkIsUUFBM0I7SUFEWTs7O0FBR2Q7Ozs7cUJBVUEsaUJBQUEsR0FBbUIsU0FBQyxjQUFELEVBQWlCLE9BQWpCOztRQUFpQixVQUFROzthQUMxQyxJQUFDLENBQUEsY0FBRCxDQUFnQixPQUFoQixFQUF5QixDQUFBLFNBQUEsS0FBQTtlQUFBLFNBQUE7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LENBQUQsRUFBSSxDQUFKLENBQWxCO01BQ1osUUFBQSxHQUFlLElBQUEsS0FBQSxDQUFNLENBQU4sRUFBUyxDQUFUO01BQ2YsSUFBQyxDQUFBLE1BQU0sQ0FBQywwQkFBUixDQUFtQyxlQUFuQyxFQUFvRCxTQUFwRCxFQUErRCxTQUFDLEdBQUQ7QUFDN0QsWUFBQTtRQUQrRCxtQkFBTztRQUN0RSxRQUFBLEdBQVcsS0FBSyxDQUFDLEtBQUssQ0FBQyxRQUFaLENBQXFCLEtBQUEsQ0FBTSxDQUFOLEVBQVMsQ0FBVCxDQUFyQjtRQUNYLElBQUEsQ0FBYyxRQUFRLENBQUMsT0FBVCxDQUFpQixLQUFqQixDQUFkO2lCQUFBLElBQUEsQ0FBQSxFQUFBOztNQUY2RCxDQUEvRDthQUdBO0lBVDZDOzs7O0tBNW5CNUI7QUFickIiLCJzb3VyY2VzQ29udGVudCI6WyJ7UG9pbnQsIFJhbmdlfSA9IHJlcXVpcmUgJ3RleHQtYnVmZmVyJ1xue0VtaXR0ZXJ9ID0gcmVxdWlyZSAnZXZlbnQta2l0J1xuXyA9IHJlcXVpcmUgJ3VuZGVyc2NvcmUtcGx1cydcbk1vZGVsID0gcmVxdWlyZSAnLi9tb2RlbCdcblxuRW1wdHlMaW5lUmVnRXhwID0gLyhcXHJcXG5bXFx0IF0qXFxyXFxuKXwoXFxuW1xcdCBdKlxcbikvZ1xuXG4jIEV4dGVuZGVkOiBUaGUgYEN1cnNvcmAgY2xhc3MgcmVwcmVzZW50cyB0aGUgbGl0dGxlIGJsaW5raW5nIGxpbmUgaWRlbnRpZnlpbmdcbiMgd2hlcmUgdGV4dCBjYW4gYmUgaW5zZXJ0ZWQuXG4jXG4jIEN1cnNvcnMgYmVsb25nIHRvIHtUZXh0RWRpdG9yfXMgYW5kIGhhdmUgc29tZSBtZXRhZGF0YSBhdHRhY2hlZCBpbiB0aGUgZm9ybVxuIyBvZiBhIHtEaXNwbGF5TWFya2VyfS5cbm1vZHVsZS5leHBvcnRzID1cbmNsYXNzIEN1cnNvciBleHRlbmRzIE1vZGVsXG4gIHNjcmVlblBvc2l0aW9uOiBudWxsXG4gIGJ1ZmZlclBvc2l0aW9uOiBudWxsXG4gIGdvYWxDb2x1bW46IG51bGxcblxuICAjIEluc3RhbnRpYXRlZCBieSBhIHtUZXh0RWRpdG9yfVxuICBjb25zdHJ1Y3RvcjogKHtAZWRpdG9yLCBAbWFya2VyLCBpZH0pIC0+XG4gICAgQGVtaXR0ZXIgPSBuZXcgRW1pdHRlclxuICAgIEBhc3NpZ25JZChpZClcblxuICBkZXN0cm95OiAtPlxuICAgIEBtYXJrZXIuZGVzdHJveSgpXG5cbiAgIyMjXG4gIFNlY3Rpb246IEV2ZW50IFN1YnNjcmlwdGlvblxuICAjIyNcblxuICAjIFB1YmxpYzogQ2FsbHMgeW91ciBgY2FsbGJhY2tgIHdoZW4gdGhlIGN1cnNvciBoYXMgYmVlbiBtb3ZlZC5cbiAgI1xuICAjICogYGNhbGxiYWNrYCB7RnVuY3Rpb259XG4gICMgICAqIGBldmVudGAge09iamVjdH1cbiAgIyAgICAgKiBgb2xkQnVmZmVyUG9zaXRpb25gIHtQb2ludH1cbiAgIyAgICAgKiBgb2xkU2NyZWVuUG9zaXRpb25gIHtQb2ludH1cbiAgIyAgICAgKiBgbmV3QnVmZmVyUG9zaXRpb25gIHtQb2ludH1cbiAgIyAgICAgKiBgbmV3U2NyZWVuUG9zaXRpb25gIHtQb2ludH1cbiAgIyAgICAgKiBgdGV4dENoYW5nZWRgIHtCb29sZWFufVxuICAjICAgICAqIGBDdXJzb3JgIHtDdXJzb3J9IHRoYXQgdHJpZ2dlcmVkIHRoZSBldmVudFxuICAjXG4gICMgUmV0dXJucyBhIHtEaXNwb3NhYmxlfSBvbiB3aGljaCBgLmRpc3Bvc2UoKWAgY2FuIGJlIGNhbGxlZCB0byB1bnN1YnNjcmliZS5cbiAgb25EaWRDaGFuZ2VQb3NpdGlvbjogKGNhbGxiYWNrKSAtPlxuICAgIEBlbWl0dGVyLm9uICdkaWQtY2hhbmdlLXBvc2l0aW9uJywgY2FsbGJhY2tcblxuICAjIFB1YmxpYzogQ2FsbHMgeW91ciBgY2FsbGJhY2tgIHdoZW4gdGhlIGN1cnNvciBpcyBkZXN0cm95ZWRcbiAgI1xuICAjICogYGNhbGxiYWNrYCB7RnVuY3Rpb259XG4gICNcbiAgIyBSZXR1cm5zIGEge0Rpc3Bvc2FibGV9IG9uIHdoaWNoIGAuZGlzcG9zZSgpYCBjYW4gYmUgY2FsbGVkIHRvIHVuc3Vic2NyaWJlLlxuICBvbkRpZERlc3Ryb3k6IChjYWxsYmFjaykgLT5cbiAgICBAZW1pdHRlci5vbiAnZGlkLWRlc3Ryb3knLCBjYWxsYmFja1xuXG4gICMjI1xuICBTZWN0aW9uOiBNYW5hZ2luZyBDdXJzb3IgUG9zaXRpb25cbiAgIyMjXG5cbiAgIyBQdWJsaWM6IE1vdmVzIGEgY3Vyc29yIHRvIGEgZ2l2ZW4gc2NyZWVuIHBvc2l0aW9uLlxuICAjXG4gICMgKiBgc2NyZWVuUG9zaXRpb25gIHtBcnJheX0gb2YgdHdvIG51bWJlcnM6IHRoZSBzY3JlZW4gcm93LCBhbmQgdGhlIHNjcmVlbiBjb2x1bW4uXG4gICMgKiBgb3B0aW9uc2AgKG9wdGlvbmFsKSB7T2JqZWN0fSB3aXRoIHRoZSBmb2xsb3dpbmcga2V5czpcbiAgIyAgICogYGF1dG9zY3JvbGxgIEEgQm9vbGVhbiB3aGljaCwgaWYgYHRydWVgLCBzY3JvbGxzIHRoZSB7VGV4dEVkaXRvcn0gdG8gd2hlcmV2ZXJcbiAgIyAgICAgdGhlIGN1cnNvciBtb3ZlcyB0by5cbiAgc2V0U2NyZWVuUG9zaXRpb246IChzY3JlZW5Qb3NpdGlvbiwgb3B0aW9ucz17fSkgLT5cbiAgICBAY2hhbmdlUG9zaXRpb24gb3B0aW9ucywgPT5cbiAgICAgIEBtYXJrZXIuc2V0SGVhZFNjcmVlblBvc2l0aW9uKHNjcmVlblBvc2l0aW9uLCBvcHRpb25zKVxuXG4gICMgUHVibGljOiBSZXR1cm5zIHRoZSBzY3JlZW4gcG9zaXRpb24gb2YgdGhlIGN1cnNvciBhcyBhIHtQb2ludH0uXG4gIGdldFNjcmVlblBvc2l0aW9uOiAtPlxuICAgIEBtYXJrZXIuZ2V0SGVhZFNjcmVlblBvc2l0aW9uKClcblxuICAjIFB1YmxpYzogTW92ZXMgYSBjdXJzb3IgdG8gYSBnaXZlbiBidWZmZXIgcG9zaXRpb24uXG4gICNcbiAgIyAqIGBidWZmZXJQb3NpdGlvbmAge0FycmF5fSBvZiB0d28gbnVtYmVyczogdGhlIGJ1ZmZlciByb3csIGFuZCB0aGUgYnVmZmVyIGNvbHVtbi5cbiAgIyAqIGBvcHRpb25zYCAob3B0aW9uYWwpIHtPYmplY3R9IHdpdGggdGhlIGZvbGxvd2luZyBrZXlzOlxuICAjICAgKiBgYXV0b3Njcm9sbGAge0Jvb2xlYW59IGluZGljYXRpbmcgd2hldGhlciB0byBhdXRvc2Nyb2xsIHRvIHRoZSBuZXdcbiAgIyAgICAgcG9zaXRpb24uIERlZmF1bHRzIHRvIGB0cnVlYCBpZiB0aGlzIGlzIHRoZSBtb3N0IHJlY2VudGx5IGFkZGVkIGN1cnNvcixcbiAgIyAgICAgYGZhbHNlYCBvdGhlcndpc2UuXG4gIHNldEJ1ZmZlclBvc2l0aW9uOiAoYnVmZmVyUG9zaXRpb24sIG9wdGlvbnM9e30pIC0+XG4gICAgQGNoYW5nZVBvc2l0aW9uIG9wdGlvbnMsID0+XG4gICAgICBAbWFya2VyLnNldEhlYWRCdWZmZXJQb3NpdGlvbihidWZmZXJQb3NpdGlvbiwgb3B0aW9ucylcblxuICAjIFB1YmxpYzogUmV0dXJucyB0aGUgY3VycmVudCBidWZmZXIgcG9zaXRpb24gYXMgYW4gQXJyYXkuXG4gIGdldEJ1ZmZlclBvc2l0aW9uOiAtPlxuICAgIEBtYXJrZXIuZ2V0SGVhZEJ1ZmZlclBvc2l0aW9uKClcblxuICAjIFB1YmxpYzogUmV0dXJucyB0aGUgY3Vyc29yJ3MgY3VycmVudCBzY3JlZW4gcm93LlxuICBnZXRTY3JlZW5Sb3c6IC0+XG4gICAgQGdldFNjcmVlblBvc2l0aW9uKCkucm93XG5cbiAgIyBQdWJsaWM6IFJldHVybnMgdGhlIGN1cnNvcidzIGN1cnJlbnQgc2NyZWVuIGNvbHVtbi5cbiAgZ2V0U2NyZWVuQ29sdW1uOiAtPlxuICAgIEBnZXRTY3JlZW5Qb3NpdGlvbigpLmNvbHVtblxuXG4gICMgUHVibGljOiBSZXRyaWV2ZXMgdGhlIGN1cnNvcidzIGN1cnJlbnQgYnVmZmVyIHJvdy5cbiAgZ2V0QnVmZmVyUm93OiAtPlxuICAgIEBnZXRCdWZmZXJQb3NpdGlvbigpLnJvd1xuXG4gICMgUHVibGljOiBSZXR1cm5zIHRoZSBjdXJzb3IncyBjdXJyZW50IGJ1ZmZlciBjb2x1bW4uXG4gIGdldEJ1ZmZlckNvbHVtbjogLT5cbiAgICBAZ2V0QnVmZmVyUG9zaXRpb24oKS5jb2x1bW5cblxuICAjIFB1YmxpYzogUmV0dXJucyB0aGUgY3Vyc29yJ3MgY3VycmVudCBidWZmZXIgcm93IG9mIHRleHQgZXhjbHVkaW5nIGl0cyBsaW5lXG4gICMgZW5kaW5nLlxuICBnZXRDdXJyZW50QnVmZmVyTGluZTogLT5cbiAgICBAZWRpdG9yLmxpbmVUZXh0Rm9yQnVmZmVyUm93KEBnZXRCdWZmZXJSb3coKSlcblxuICAjIFB1YmxpYzogUmV0dXJucyB3aGV0aGVyIHRoZSBjdXJzb3IgaXMgYXQgdGhlIHN0YXJ0IG9mIGEgbGluZS5cbiAgaXNBdEJlZ2lubmluZ09mTGluZTogLT5cbiAgICBAZ2V0QnVmZmVyUG9zaXRpb24oKS5jb2x1bW4gaXMgMFxuXG4gICMgUHVibGljOiBSZXR1cm5zIHdoZXRoZXIgdGhlIGN1cnNvciBpcyBvbiB0aGUgbGluZSByZXR1cm4gY2hhcmFjdGVyLlxuICBpc0F0RW5kT2ZMaW5lOiAtPlxuICAgIEBnZXRCdWZmZXJQb3NpdGlvbigpLmlzRXF1YWwoQGdldEN1cnJlbnRMaW5lQnVmZmVyUmFuZ2UoKS5lbmQpXG5cbiAgIyMjXG4gIFNlY3Rpb246IEN1cnNvciBQb3NpdGlvbiBEZXRhaWxzXG4gICMjI1xuXG4gICMgUHVibGljOiBSZXR1cm5zIHRoZSB1bmRlcmx5aW5nIHtEaXNwbGF5TWFya2VyfSBmb3IgdGhlIGN1cnNvci5cbiAgIyBVc2VmdWwgd2l0aCBvdmVybGF5IHtEZWNvcmF0aW9ufXMuXG4gIGdldE1hcmtlcjogLT4gQG1hcmtlclxuXG4gICMgUHVibGljOiBJZGVudGlmaWVzIGlmIHRoZSBjdXJzb3IgaXMgc3Vycm91bmRlZCBieSB3aGl0ZXNwYWNlLlxuICAjXG4gICMgXCJTdXJyb3VuZGVkXCIgaGVyZSBtZWFucyB0aGF0IHRoZSBjaGFyYWN0ZXIgZGlyZWN0bHkgYmVmb3JlIGFuZCBhZnRlciB0aGVcbiAgIyBjdXJzb3IgYXJlIGJvdGggd2hpdGVzcGFjZS5cbiAgI1xuICAjIFJldHVybnMgYSB7Qm9vbGVhbn0uXG4gIGlzU3Vycm91bmRlZEJ5V2hpdGVzcGFjZTogLT5cbiAgICB7cm93LCBjb2x1bW59ID0gQGdldEJ1ZmZlclBvc2l0aW9uKClcbiAgICByYW5nZSA9IFtbcm93LCBjb2x1bW4gLSAxXSwgW3JvdywgY29sdW1uICsgMV1dXG4gICAgL15cXHMrJC8udGVzdCBAZWRpdG9yLmdldFRleHRJbkJ1ZmZlclJhbmdlKHJhbmdlKVxuXG4gICMgUHVibGljOiBSZXR1cm5zIHdoZXRoZXIgdGhlIGN1cnNvciBpcyBjdXJyZW50bHkgYmV0d2VlbiBhIHdvcmQgYW5kIG5vbi13b3JkXG4gICMgY2hhcmFjdGVyLiBUaGUgbm9uLXdvcmQgY2hhcmFjdGVycyBhcmUgZGVmaW5lZCBieSB0aGVcbiAgIyBgZWRpdG9yLm5vbldvcmRDaGFyYWN0ZXJzYCBjb25maWcgdmFsdWUuXG4gICNcbiAgIyBUaGlzIG1ldGhvZCByZXR1cm5zIGZhbHNlIGlmIHRoZSBjaGFyYWN0ZXIgYmVmb3JlIG9yIGFmdGVyIHRoZSBjdXJzb3IgaXNcbiAgIyB3aGl0ZXNwYWNlLlxuICAjXG4gICMgUmV0dXJucyBhIEJvb2xlYW4uXG4gIGlzQmV0d2VlbldvcmRBbmROb25Xb3JkOiAtPlxuICAgIHJldHVybiBmYWxzZSBpZiBAaXNBdEJlZ2lubmluZ09mTGluZSgpIG9yIEBpc0F0RW5kT2ZMaW5lKClcblxuICAgIHtyb3csIGNvbHVtbn0gPSBAZ2V0QnVmZmVyUG9zaXRpb24oKVxuICAgIHJhbmdlID0gW1tyb3csIGNvbHVtbiAtIDFdLCBbcm93LCBjb2x1bW4gKyAxXV1cbiAgICBbYmVmb3JlLCBhZnRlcl0gPSBAZWRpdG9yLmdldFRleHRJbkJ1ZmZlclJhbmdlKHJhbmdlKVxuICAgIHJldHVybiBmYWxzZSBpZiAvXFxzLy50ZXN0KGJlZm9yZSkgb3IgL1xccy8udGVzdChhZnRlcilcblxuICAgIG5vbldvcmRDaGFyYWN0ZXJzID0gQGdldE5vbldvcmRDaGFyYWN0ZXJzKClcbiAgICBub25Xb3JkQ2hhcmFjdGVycy5pbmNsdWRlcyhiZWZvcmUpIGlzbnQgbm9uV29yZENoYXJhY3RlcnMuaW5jbHVkZXMoYWZ0ZXIpXG5cbiAgIyBQdWJsaWM6IFJldHVybnMgd2hldGhlciB0aGlzIGN1cnNvciBpcyBiZXR3ZWVuIGEgd29yZCdzIHN0YXJ0IGFuZCBlbmQuXG4gICNcbiAgIyAqIGBvcHRpb25zYCAob3B0aW9uYWwpIHtPYmplY3R9XG4gICMgICAqIGB3b3JkUmVnZXhgIEEge1JlZ0V4cH0gaW5kaWNhdGluZyB3aGF0IGNvbnN0aXR1dGVzIGEgXCJ3b3JkXCJcbiAgIyAgICAgKGRlZmF1bHQ6IHs6OndvcmRSZWdFeHB9KS5cbiAgI1xuICAjIFJldHVybnMgYSB7Qm9vbGVhbn1cbiAgaXNJbnNpZGVXb3JkOiAob3B0aW9ucykgLT5cbiAgICB7cm93LCBjb2x1bW59ID0gQGdldEJ1ZmZlclBvc2l0aW9uKClcbiAgICByYW5nZSA9IFtbcm93LCBjb2x1bW5dLCBbcm93LCBJbmZpbml0eV1dXG4gICAgQGVkaXRvci5nZXRUZXh0SW5CdWZmZXJSYW5nZShyYW5nZSkuc2VhcmNoKG9wdGlvbnM/LndvcmRSZWdleCA/IEB3b3JkUmVnRXhwKCkpIGlzIDBcblxuICAjIFB1YmxpYzogUmV0dXJucyB0aGUgaW5kZW50YXRpb24gbGV2ZWwgb2YgdGhlIGN1cnJlbnQgbGluZS5cbiAgZ2V0SW5kZW50TGV2ZWw6IC0+XG4gICAgaWYgQGVkaXRvci5nZXRTb2Z0VGFicygpXG4gICAgICBAZ2V0QnVmZmVyQ29sdW1uKCkgLyBAZWRpdG9yLmdldFRhYkxlbmd0aCgpXG4gICAgZWxzZVxuICAgICAgQGdldEJ1ZmZlckNvbHVtbigpXG5cbiAgIyBQdWJsaWM6IFJldHJpZXZlcyB0aGUgc2NvcGUgZGVzY3JpcHRvciBmb3IgdGhlIGN1cnNvcidzIGN1cnJlbnQgcG9zaXRpb24uXG4gICNcbiAgIyBSZXR1cm5zIGEge1Njb3BlRGVzY3JpcHRvcn1cbiAgZ2V0U2NvcGVEZXNjcmlwdG9yOiAtPlxuICAgIEBlZGl0b3Iuc2NvcGVEZXNjcmlwdG9yRm9yQnVmZmVyUG9zaXRpb24oQGdldEJ1ZmZlclBvc2l0aW9uKCkpXG5cbiAgIyBQdWJsaWM6IFJldHVybnMgdHJ1ZSBpZiB0aGlzIGN1cnNvciBoYXMgbm8gbm9uLXdoaXRlc3BhY2UgY2hhcmFjdGVycyBiZWZvcmVcbiAgIyBpdHMgY3VycmVudCBwb3NpdGlvbi5cbiAgaGFzUHJlY2VkaW5nQ2hhcmFjdGVyc09uTGluZTogLT5cbiAgICBidWZmZXJQb3NpdGlvbiA9IEBnZXRCdWZmZXJQb3NpdGlvbigpXG4gICAgbGluZSA9IEBlZGl0b3IubGluZVRleHRGb3JCdWZmZXJSb3coYnVmZmVyUG9zaXRpb24ucm93KVxuICAgIGZpcnN0Q2hhcmFjdGVyQ29sdW1uID0gbGluZS5zZWFyY2goL1xcUy8pXG5cbiAgICBpZiBmaXJzdENoYXJhY3RlckNvbHVtbiBpcyAtMVxuICAgICAgZmFsc2VcbiAgICBlbHNlXG4gICAgICBidWZmZXJQb3NpdGlvbi5jb2x1bW4gPiBmaXJzdENoYXJhY3RlckNvbHVtblxuXG4gICMgUHVibGljOiBJZGVudGlmaWVzIGlmIHRoaXMgY3Vyc29yIGlzIHRoZSBsYXN0IGluIHRoZSB7VGV4dEVkaXRvcn0uXG4gICNcbiAgIyBcIkxhc3RcIiBpcyBkZWZpbmVkIGFzIHRoZSBtb3N0IHJlY2VudGx5IGFkZGVkIGN1cnNvci5cbiAgI1xuICAjIFJldHVybnMgYSB7Qm9vbGVhbn0uXG4gIGlzTGFzdEN1cnNvcjogLT5cbiAgICB0aGlzIGlzIEBlZGl0b3IuZ2V0TGFzdEN1cnNvcigpXG5cbiAgIyMjXG4gIFNlY3Rpb246IE1vdmluZyB0aGUgQ3Vyc29yXG4gICMjI1xuXG4gICMgUHVibGljOiBNb3ZlcyB0aGUgY3Vyc29yIHVwIG9uZSBzY3JlZW4gcm93LlxuICAjXG4gICMgKiBgcm93Q291bnRgIChvcHRpb25hbCkge051bWJlcn0gbnVtYmVyIG9mIHJvd3MgdG8gbW92ZSAoZGVmYXVsdDogMSlcbiAgIyAqIGBvcHRpb25zYCAob3B0aW9uYWwpIHtPYmplY3R9IHdpdGggdGhlIGZvbGxvd2luZyBrZXlzOlxuICAjICAgKiBgbW92ZVRvRW5kT2ZTZWxlY3Rpb25gIGlmIHRydWUsIG1vdmUgdG8gdGhlIGxlZnQgb2YgdGhlIHNlbGVjdGlvbiBpZiBhXG4gICMgICAgIHNlbGVjdGlvbiBleGlzdHMuXG4gIG1vdmVVcDogKHJvd0NvdW50PTEsIHttb3ZlVG9FbmRPZlNlbGVjdGlvbn09e30pIC0+XG4gICAgcmFuZ2UgPSBAbWFya2VyLmdldFNjcmVlblJhbmdlKClcbiAgICBpZiBtb3ZlVG9FbmRPZlNlbGVjdGlvbiBhbmQgbm90IHJhbmdlLmlzRW1wdHkoKVxuICAgICAge3JvdywgY29sdW1ufSA9IHJhbmdlLnN0YXJ0XG4gICAgZWxzZVxuICAgICAge3JvdywgY29sdW1ufSA9IEBnZXRTY3JlZW5Qb3NpdGlvbigpXG5cbiAgICBjb2x1bW4gPSBAZ29hbENvbHVtbiBpZiBAZ29hbENvbHVtbj9cbiAgICBAc2V0U2NyZWVuUG9zaXRpb24oe3Jvdzogcm93IC0gcm93Q291bnQsIGNvbHVtbjogY29sdW1ufSwgc2tpcFNvZnRXcmFwSW5kZW50YXRpb246IHRydWUpXG4gICAgQGdvYWxDb2x1bW4gPSBjb2x1bW5cblxuICAjIFB1YmxpYzogTW92ZXMgdGhlIGN1cnNvciBkb3duIG9uZSBzY3JlZW4gcm93LlxuICAjXG4gICMgKiBgcm93Q291bnRgIChvcHRpb25hbCkge051bWJlcn0gbnVtYmVyIG9mIHJvd3MgdG8gbW92ZSAoZGVmYXVsdDogMSlcbiAgIyAqIGBvcHRpb25zYCAob3B0aW9uYWwpIHtPYmplY3R9IHdpdGggdGhlIGZvbGxvd2luZyBrZXlzOlxuICAjICAgKiBgbW92ZVRvRW5kT2ZTZWxlY3Rpb25gIGlmIHRydWUsIG1vdmUgdG8gdGhlIGxlZnQgb2YgdGhlIHNlbGVjdGlvbiBpZiBhXG4gICMgICAgIHNlbGVjdGlvbiBleGlzdHMuXG4gIG1vdmVEb3duOiAocm93Q291bnQ9MSwge21vdmVUb0VuZE9mU2VsZWN0aW9ufT17fSkgLT5cbiAgICByYW5nZSA9IEBtYXJrZXIuZ2V0U2NyZWVuUmFuZ2UoKVxuICAgIGlmIG1vdmVUb0VuZE9mU2VsZWN0aW9uIGFuZCBub3QgcmFuZ2UuaXNFbXB0eSgpXG4gICAgICB7cm93LCBjb2x1bW59ID0gcmFuZ2UuZW5kXG4gICAgZWxzZVxuICAgICAge3JvdywgY29sdW1ufSA9IEBnZXRTY3JlZW5Qb3NpdGlvbigpXG5cbiAgICBjb2x1bW4gPSBAZ29hbENvbHVtbiBpZiBAZ29hbENvbHVtbj9cbiAgICBAc2V0U2NyZWVuUG9zaXRpb24oe3Jvdzogcm93ICsgcm93Q291bnQsIGNvbHVtbjogY29sdW1ufSwgc2tpcFNvZnRXcmFwSW5kZW50YXRpb246IHRydWUpXG4gICAgQGdvYWxDb2x1bW4gPSBjb2x1bW5cblxuICAjIFB1YmxpYzogTW92ZXMgdGhlIGN1cnNvciBsZWZ0IG9uZSBzY3JlZW4gY29sdW1uLlxuICAjXG4gICMgKiBgY29sdW1uQ291bnRgIChvcHRpb25hbCkge051bWJlcn0gbnVtYmVyIG9mIGNvbHVtbnMgdG8gbW92ZSAoZGVmYXVsdDogMSlcbiAgIyAqIGBvcHRpb25zYCAob3B0aW9uYWwpIHtPYmplY3R9IHdpdGggdGhlIGZvbGxvd2luZyBrZXlzOlxuICAjICAgKiBgbW92ZVRvRW5kT2ZTZWxlY3Rpb25gIGlmIHRydWUsIG1vdmUgdG8gdGhlIGxlZnQgb2YgdGhlIHNlbGVjdGlvbiBpZiBhXG4gICMgICAgIHNlbGVjdGlvbiBleGlzdHMuXG4gIG1vdmVMZWZ0OiAoY29sdW1uQ291bnQ9MSwge21vdmVUb0VuZE9mU2VsZWN0aW9ufT17fSkgLT5cbiAgICByYW5nZSA9IEBtYXJrZXIuZ2V0U2NyZWVuUmFuZ2UoKVxuICAgIGlmIG1vdmVUb0VuZE9mU2VsZWN0aW9uIGFuZCBub3QgcmFuZ2UuaXNFbXB0eSgpXG4gICAgICBAc2V0U2NyZWVuUG9zaXRpb24ocmFuZ2Uuc3RhcnQpXG4gICAgZWxzZVxuICAgICAge3JvdywgY29sdW1ufSA9IEBnZXRTY3JlZW5Qb3NpdGlvbigpXG5cbiAgICAgIHdoaWxlIGNvbHVtbkNvdW50ID4gY29sdW1uIGFuZCByb3cgPiAwXG4gICAgICAgIGNvbHVtbkNvdW50IC09IGNvbHVtblxuICAgICAgICBjb2x1bW4gPSBAZWRpdG9yLmxpbmVMZW5ndGhGb3JTY3JlZW5Sb3coLS1yb3cpXG4gICAgICAgIGNvbHVtbkNvdW50LS0gIyBzdWJ0cmFjdCAxIGZvciB0aGUgcm93IG1vdmVcblxuICAgICAgY29sdW1uID0gY29sdW1uIC0gY29sdW1uQ291bnRcbiAgICAgIEBzZXRTY3JlZW5Qb3NpdGlvbih7cm93LCBjb2x1bW59LCBjbGlwRGlyZWN0aW9uOiAnYmFja3dhcmQnKVxuXG4gICMgUHVibGljOiBNb3ZlcyB0aGUgY3Vyc29yIHJpZ2h0IG9uZSBzY3JlZW4gY29sdW1uLlxuICAjXG4gICMgKiBgY29sdW1uQ291bnRgIChvcHRpb25hbCkge051bWJlcn0gbnVtYmVyIG9mIGNvbHVtbnMgdG8gbW92ZSAoZGVmYXVsdDogMSlcbiAgIyAqIGBvcHRpb25zYCAob3B0aW9uYWwpIHtPYmplY3R9IHdpdGggdGhlIGZvbGxvd2luZyBrZXlzOlxuICAjICAgKiBgbW92ZVRvRW5kT2ZTZWxlY3Rpb25gIGlmIHRydWUsIG1vdmUgdG8gdGhlIHJpZ2h0IG9mIHRoZSBzZWxlY3Rpb24gaWYgYVxuICAjICAgICBzZWxlY3Rpb24gZXhpc3RzLlxuICBtb3ZlUmlnaHQ6IChjb2x1bW5Db3VudD0xLCB7bW92ZVRvRW5kT2ZTZWxlY3Rpb259PXt9KSAtPlxuICAgIHJhbmdlID0gQG1hcmtlci5nZXRTY3JlZW5SYW5nZSgpXG4gICAgaWYgbW92ZVRvRW5kT2ZTZWxlY3Rpb24gYW5kIG5vdCByYW5nZS5pc0VtcHR5KClcbiAgICAgIEBzZXRTY3JlZW5Qb3NpdGlvbihyYW5nZS5lbmQpXG4gICAgZWxzZVxuICAgICAge3JvdywgY29sdW1ufSA9IEBnZXRTY3JlZW5Qb3NpdGlvbigpXG4gICAgICBtYXhMaW5lcyA9IEBlZGl0b3IuZ2V0U2NyZWVuTGluZUNvdW50KClcbiAgICAgIHJvd0xlbmd0aCA9IEBlZGl0b3IubGluZUxlbmd0aEZvclNjcmVlblJvdyhyb3cpXG4gICAgICBjb2x1bW5zUmVtYWluaW5nSW5MaW5lID0gcm93TGVuZ3RoIC0gY29sdW1uXG5cbiAgICAgIHdoaWxlIGNvbHVtbkNvdW50ID4gY29sdW1uc1JlbWFpbmluZ0luTGluZSBhbmQgcm93IDwgbWF4TGluZXMgLSAxXG4gICAgICAgIGNvbHVtbkNvdW50IC09IGNvbHVtbnNSZW1haW5pbmdJbkxpbmVcbiAgICAgICAgY29sdW1uQ291bnQtLSAjIHN1YnRyYWN0IDEgZm9yIHRoZSByb3cgbW92ZVxuXG4gICAgICAgIGNvbHVtbiA9IDBcbiAgICAgICAgcm93TGVuZ3RoID0gQGVkaXRvci5saW5lTGVuZ3RoRm9yU2NyZWVuUm93KCsrcm93KVxuICAgICAgICBjb2x1bW5zUmVtYWluaW5nSW5MaW5lID0gcm93TGVuZ3RoXG5cbiAgICAgIGNvbHVtbiA9IGNvbHVtbiArIGNvbHVtbkNvdW50XG4gICAgICBAc2V0U2NyZWVuUG9zaXRpb24oe3JvdywgY29sdW1ufSwgY2xpcERpcmVjdGlvbjogJ2ZvcndhcmQnKVxuXG4gICMgUHVibGljOiBNb3ZlcyB0aGUgY3Vyc29yIHRvIHRoZSB0b3Agb2YgdGhlIGJ1ZmZlci5cbiAgbW92ZVRvVG9wOiAtPlxuICAgIEBzZXRCdWZmZXJQb3NpdGlvbihbMCwgMF0pXG5cbiAgIyBQdWJsaWM6IE1vdmVzIHRoZSBjdXJzb3IgdG8gdGhlIGJvdHRvbSBvZiB0aGUgYnVmZmVyLlxuICBtb3ZlVG9Cb3R0b206IC0+XG4gICAgQHNldEJ1ZmZlclBvc2l0aW9uKEBlZGl0b3IuZ2V0RW9mQnVmZmVyUG9zaXRpb24oKSlcblxuICAjIFB1YmxpYzogTW92ZXMgdGhlIGN1cnNvciB0byB0aGUgYmVnaW5uaW5nIG9mIHRoZSBsaW5lLlxuICBtb3ZlVG9CZWdpbm5pbmdPZlNjcmVlbkxpbmU6IC0+XG4gICAgQHNldFNjcmVlblBvc2l0aW9uKFtAZ2V0U2NyZWVuUm93KCksIDBdKVxuXG4gICMgUHVibGljOiBNb3ZlcyB0aGUgY3Vyc29yIHRvIHRoZSBiZWdpbm5pbmcgb2YgdGhlIGJ1ZmZlciBsaW5lLlxuICBtb3ZlVG9CZWdpbm5pbmdPZkxpbmU6IC0+XG4gICAgQHNldEJ1ZmZlclBvc2l0aW9uKFtAZ2V0QnVmZmVyUm93KCksIDBdKVxuXG4gICMgUHVibGljOiBNb3ZlcyB0aGUgY3Vyc29yIHRvIHRoZSBiZWdpbm5pbmcgb2YgdGhlIGZpcnN0IGNoYXJhY3RlciBpbiB0aGVcbiAgIyBsaW5lLlxuICBtb3ZlVG9GaXJzdENoYXJhY3Rlck9mTGluZTogLT5cbiAgICBzY3JlZW5Sb3cgPSBAZ2V0U2NyZWVuUm93KClcbiAgICBzY3JlZW5MaW5lU3RhcnQgPSBAZWRpdG9yLmNsaXBTY3JlZW5Qb3NpdGlvbihbc2NyZWVuUm93LCAwXSwgc2tpcFNvZnRXcmFwSW5kZW50YXRpb246IHRydWUpXG4gICAgc2NyZWVuTGluZUVuZCA9IFtzY3JlZW5Sb3csIEluZmluaXR5XVxuICAgIHNjcmVlbkxpbmVCdWZmZXJSYW5nZSA9IEBlZGl0b3IuYnVmZmVyUmFuZ2VGb3JTY3JlZW5SYW5nZShbc2NyZWVuTGluZVN0YXJ0LCBzY3JlZW5MaW5lRW5kXSlcblxuICAgIGZpcnN0Q2hhcmFjdGVyQ29sdW1uID0gbnVsbFxuICAgIEBlZGl0b3Iuc2NhbkluQnVmZmVyUmFuZ2UgL1xcUy8sIHNjcmVlbkxpbmVCdWZmZXJSYW5nZSwgKHtyYW5nZSwgc3RvcH0pIC0+XG4gICAgICBmaXJzdENoYXJhY3RlckNvbHVtbiA9IHJhbmdlLnN0YXJ0LmNvbHVtblxuICAgICAgc3RvcCgpXG5cbiAgICBpZiBmaXJzdENoYXJhY3RlckNvbHVtbj8gYW5kIGZpcnN0Q2hhcmFjdGVyQ29sdW1uIGlzbnQgQGdldEJ1ZmZlckNvbHVtbigpXG4gICAgICB0YXJnZXRCdWZmZXJDb2x1bW4gPSBmaXJzdENoYXJhY3RlckNvbHVtblxuICAgIGVsc2VcbiAgICAgIHRhcmdldEJ1ZmZlckNvbHVtbiA9IHNjcmVlbkxpbmVCdWZmZXJSYW5nZS5zdGFydC5jb2x1bW5cblxuICAgIEBzZXRCdWZmZXJQb3NpdGlvbihbc2NyZWVuTGluZUJ1ZmZlclJhbmdlLnN0YXJ0LnJvdywgdGFyZ2V0QnVmZmVyQ29sdW1uXSlcblxuICAjIFB1YmxpYzogTW92ZXMgdGhlIGN1cnNvciB0byB0aGUgZW5kIG9mIHRoZSBsaW5lLlxuICBtb3ZlVG9FbmRPZlNjcmVlbkxpbmU6IC0+XG4gICAgQHNldFNjcmVlblBvc2l0aW9uKFtAZ2V0U2NyZWVuUm93KCksIEluZmluaXR5XSlcblxuICAjIFB1YmxpYzogTW92ZXMgdGhlIGN1cnNvciB0byB0aGUgZW5kIG9mIHRoZSBidWZmZXIgbGluZS5cbiAgbW92ZVRvRW5kT2ZMaW5lOiAtPlxuICAgIEBzZXRCdWZmZXJQb3NpdGlvbihbQGdldEJ1ZmZlclJvdygpLCBJbmZpbml0eV0pXG5cbiAgIyBQdWJsaWM6IE1vdmVzIHRoZSBjdXJzb3IgdG8gdGhlIGJlZ2lubmluZyBvZiB0aGUgd29yZC5cbiAgbW92ZVRvQmVnaW5uaW5nT2ZXb3JkOiAtPlxuICAgIEBzZXRCdWZmZXJQb3NpdGlvbihAZ2V0QmVnaW5uaW5nT2ZDdXJyZW50V29yZEJ1ZmZlclBvc2l0aW9uKCkpXG5cbiAgIyBQdWJsaWM6IE1vdmVzIHRoZSBjdXJzb3IgdG8gdGhlIGVuZCBvZiB0aGUgd29yZC5cbiAgbW92ZVRvRW5kT2ZXb3JkOiAtPlxuICAgIGlmIHBvc2l0aW9uID0gQGdldEVuZE9mQ3VycmVudFdvcmRCdWZmZXJQb3NpdGlvbigpXG4gICAgICBAc2V0QnVmZmVyUG9zaXRpb24ocG9zaXRpb24pXG5cbiAgIyBQdWJsaWM6IE1vdmVzIHRoZSBjdXJzb3IgdG8gdGhlIGJlZ2lubmluZyBvZiB0aGUgbmV4dCB3b3JkLlxuICBtb3ZlVG9CZWdpbm5pbmdPZk5leHRXb3JkOiAtPlxuICAgIGlmIHBvc2l0aW9uID0gQGdldEJlZ2lubmluZ09mTmV4dFdvcmRCdWZmZXJQb3NpdGlvbigpXG4gICAgICBAc2V0QnVmZmVyUG9zaXRpb24ocG9zaXRpb24pXG5cbiAgIyBQdWJsaWM6IE1vdmVzIHRoZSBjdXJzb3IgdG8gdGhlIHByZXZpb3VzIHdvcmQgYm91bmRhcnkuXG4gIG1vdmVUb1ByZXZpb3VzV29yZEJvdW5kYXJ5OiAtPlxuICAgIGlmIHBvc2l0aW9uID0gQGdldFByZXZpb3VzV29yZEJvdW5kYXJ5QnVmZmVyUG9zaXRpb24oKVxuICAgICAgQHNldEJ1ZmZlclBvc2l0aW9uKHBvc2l0aW9uKVxuXG4gICMgUHVibGljOiBNb3ZlcyB0aGUgY3Vyc29yIHRvIHRoZSBuZXh0IHdvcmQgYm91bmRhcnkuXG4gIG1vdmVUb05leHRXb3JkQm91bmRhcnk6IC0+XG4gICAgaWYgcG9zaXRpb24gPSBAZ2V0TmV4dFdvcmRCb3VuZGFyeUJ1ZmZlclBvc2l0aW9uKClcbiAgICAgIEBzZXRCdWZmZXJQb3NpdGlvbihwb3NpdGlvbilcblxuICAjIFB1YmxpYzogTW92ZXMgdGhlIGN1cnNvciB0byB0aGUgcHJldmlvdXMgc3Vid29yZCBib3VuZGFyeS5cbiAgbW92ZVRvUHJldmlvdXNTdWJ3b3JkQm91bmRhcnk6IC0+XG4gICAgb3B0aW9ucyA9IHt3b3JkUmVnZXg6IEBzdWJ3b3JkUmVnRXhwKGJhY2t3YXJkczogdHJ1ZSl9XG4gICAgaWYgcG9zaXRpb24gPSBAZ2V0UHJldmlvdXNXb3JkQm91bmRhcnlCdWZmZXJQb3NpdGlvbihvcHRpb25zKVxuICAgICAgQHNldEJ1ZmZlclBvc2l0aW9uKHBvc2l0aW9uKVxuXG4gICMgUHVibGljOiBNb3ZlcyB0aGUgY3Vyc29yIHRvIHRoZSBuZXh0IHN1YndvcmQgYm91bmRhcnkuXG4gIG1vdmVUb05leHRTdWJ3b3JkQm91bmRhcnk6IC0+XG4gICAgb3B0aW9ucyA9IHt3b3JkUmVnZXg6IEBzdWJ3b3JkUmVnRXhwKCl9XG4gICAgaWYgcG9zaXRpb24gPSBAZ2V0TmV4dFdvcmRCb3VuZGFyeUJ1ZmZlclBvc2l0aW9uKG9wdGlvbnMpXG4gICAgICBAc2V0QnVmZmVyUG9zaXRpb24ocG9zaXRpb24pXG5cbiAgIyBQdWJsaWM6IE1vdmVzIHRoZSBjdXJzb3IgdG8gdGhlIGJlZ2lubmluZyBvZiB0aGUgYnVmZmVyIGxpbmUsIHNraXBwaW5nIGFsbFxuICAjIHdoaXRlc3BhY2UuXG4gIHNraXBMZWFkaW5nV2hpdGVzcGFjZTogLT5cbiAgICBwb3NpdGlvbiA9IEBnZXRCdWZmZXJQb3NpdGlvbigpXG4gICAgc2NhblJhbmdlID0gQGdldEN1cnJlbnRMaW5lQnVmZmVyUmFuZ2UoKVxuICAgIGVuZE9mTGVhZGluZ1doaXRlc3BhY2UgPSBudWxsXG4gICAgQGVkaXRvci5zY2FuSW5CdWZmZXJSYW5nZSAvXlsgXFx0XSovLCBzY2FuUmFuZ2UsICh7cmFuZ2V9KSAtPlxuICAgICAgZW5kT2ZMZWFkaW5nV2hpdGVzcGFjZSA9IHJhbmdlLmVuZFxuXG4gICAgQHNldEJ1ZmZlclBvc2l0aW9uKGVuZE9mTGVhZGluZ1doaXRlc3BhY2UpIGlmIGVuZE9mTGVhZGluZ1doaXRlc3BhY2UuaXNHcmVhdGVyVGhhbihwb3NpdGlvbilcblxuICAjIFB1YmxpYzogTW92ZXMgdGhlIGN1cnNvciB0byB0aGUgYmVnaW5uaW5nIG9mIHRoZSBuZXh0IHBhcmFncmFwaFxuICBtb3ZlVG9CZWdpbm5pbmdPZk5leHRQYXJhZ3JhcGg6IC0+XG4gICAgaWYgcG9zaXRpb24gPSBAZ2V0QmVnaW5uaW5nT2ZOZXh0UGFyYWdyYXBoQnVmZmVyUG9zaXRpb24oKVxuICAgICAgQHNldEJ1ZmZlclBvc2l0aW9uKHBvc2l0aW9uKVxuXG4gICMgUHVibGljOiBNb3ZlcyB0aGUgY3Vyc29yIHRvIHRoZSBiZWdpbm5pbmcgb2YgdGhlIHByZXZpb3VzIHBhcmFncmFwaFxuICBtb3ZlVG9CZWdpbm5pbmdPZlByZXZpb3VzUGFyYWdyYXBoOiAtPlxuICAgIGlmIHBvc2l0aW9uID0gQGdldEJlZ2lubmluZ09mUHJldmlvdXNQYXJhZ3JhcGhCdWZmZXJQb3NpdGlvbigpXG4gICAgICBAc2V0QnVmZmVyUG9zaXRpb24ocG9zaXRpb24pXG5cbiAgIyMjXG4gIFNlY3Rpb246IExvY2FsIFBvc2l0aW9ucyBhbmQgUmFuZ2VzXG4gICMjI1xuXG4gICMgUHVibGljOiBSZXR1cm5zIGJ1ZmZlciBwb3NpdGlvbiBvZiBwcmV2aW91cyB3b3JkIGJvdW5kYXJ5LiBJdCBtaWdodCBiZSBvblxuICAjIHRoZSBjdXJyZW50IHdvcmQsIG9yIHRoZSBwcmV2aW91cyB3b3JkLlxuICAjXG4gICMgKiBgb3B0aW9uc2AgKG9wdGlvbmFsKSB7T2JqZWN0fSB3aXRoIHRoZSBmb2xsb3dpbmcga2V5czpcbiAgIyAgICogYHdvcmRSZWdleGAgQSB7UmVnRXhwfSBpbmRpY2F0aW5nIHdoYXQgY29uc3RpdHV0ZXMgYSBcIndvcmRcIlxuICAjICAgICAgKGRlZmF1bHQ6IHs6OndvcmRSZWdFeHB9KVxuICBnZXRQcmV2aW91c1dvcmRCb3VuZGFyeUJ1ZmZlclBvc2l0aW9uOiAob3B0aW9ucyA9IHt9KSAtPlxuICAgIGN1cnJlbnRCdWZmZXJQb3NpdGlvbiA9IEBnZXRCdWZmZXJQb3NpdGlvbigpXG4gICAgcHJldmlvdXNOb25CbGFua1JvdyA9IEBlZGl0b3IuYnVmZmVyLnByZXZpb3VzTm9uQmxhbmtSb3coY3VycmVudEJ1ZmZlclBvc2l0aW9uLnJvdylcbiAgICBzY2FuUmFuZ2UgPSBbW3ByZXZpb3VzTm9uQmxhbmtSb3cgPyAwLCAwXSwgY3VycmVudEJ1ZmZlclBvc2l0aW9uXVxuXG4gICAgYmVnaW5uaW5nT2ZXb3JkUG9zaXRpb24gPSBudWxsXG4gICAgQGVkaXRvci5iYWNrd2FyZHNTY2FuSW5CdWZmZXJSYW5nZSAob3B0aW9ucy53b3JkUmVnZXggPyBAd29yZFJlZ0V4cCgpKSwgc2NhblJhbmdlLCAoe3JhbmdlLCBzdG9wfSkgLT5cbiAgICAgIGlmIHJhbmdlLnN0YXJ0LnJvdyA8IGN1cnJlbnRCdWZmZXJQb3NpdGlvbi5yb3cgYW5kIGN1cnJlbnRCdWZmZXJQb3NpdGlvbi5jb2x1bW4gPiAwXG4gICAgICAgICMgZm9yY2UgaXQgdG8gc3RvcCBhdCB0aGUgYmVnaW5uaW5nIG9mIGVhY2ggbGluZVxuICAgICAgICBiZWdpbm5pbmdPZldvcmRQb3NpdGlvbiA9IG5ldyBQb2ludChjdXJyZW50QnVmZmVyUG9zaXRpb24ucm93LCAwKVxuICAgICAgZWxzZSBpZiByYW5nZS5lbmQuaXNMZXNzVGhhbihjdXJyZW50QnVmZmVyUG9zaXRpb24pXG4gICAgICAgIGJlZ2lubmluZ09mV29yZFBvc2l0aW9uID0gcmFuZ2UuZW5kXG4gICAgICBlbHNlXG4gICAgICAgIGJlZ2lubmluZ09mV29yZFBvc2l0aW9uID0gcmFuZ2Uuc3RhcnRcblxuICAgICAgaWYgbm90IGJlZ2lubmluZ09mV29yZFBvc2l0aW9uPy5pc0VxdWFsKGN1cnJlbnRCdWZmZXJQb3NpdGlvbilcbiAgICAgICAgc3RvcCgpXG5cbiAgICBiZWdpbm5pbmdPZldvcmRQb3NpdGlvbiBvciBjdXJyZW50QnVmZmVyUG9zaXRpb25cblxuICAjIFB1YmxpYzogUmV0dXJucyBidWZmZXIgcG9zaXRpb24gb2YgdGhlIG5leHQgd29yZCBib3VuZGFyeS4gSXQgbWlnaHQgYmUgb25cbiAgIyB0aGUgY3VycmVudCB3b3JkLCBvciB0aGUgcHJldmlvdXMgd29yZC5cbiAgI1xuICAjICogYG9wdGlvbnNgIChvcHRpb25hbCkge09iamVjdH0gd2l0aCB0aGUgZm9sbG93aW5nIGtleXM6XG4gICMgICAqIGB3b3JkUmVnZXhgIEEge1JlZ0V4cH0gaW5kaWNhdGluZyB3aGF0IGNvbnN0aXR1dGVzIGEgXCJ3b3JkXCJcbiAgIyAgICAgIChkZWZhdWx0OiB7Ojp3b3JkUmVnRXhwfSlcbiAgZ2V0TmV4dFdvcmRCb3VuZGFyeUJ1ZmZlclBvc2l0aW9uOiAob3B0aW9ucyA9IHt9KSAtPlxuICAgIGN1cnJlbnRCdWZmZXJQb3NpdGlvbiA9IEBnZXRCdWZmZXJQb3NpdGlvbigpXG4gICAgc2NhblJhbmdlID0gW2N1cnJlbnRCdWZmZXJQb3NpdGlvbiwgQGVkaXRvci5nZXRFb2ZCdWZmZXJQb3NpdGlvbigpXVxuXG4gICAgZW5kT2ZXb3JkUG9zaXRpb24gPSBudWxsXG4gICAgQGVkaXRvci5zY2FuSW5CdWZmZXJSYW5nZSAob3B0aW9ucy53b3JkUmVnZXggPyBAd29yZFJlZ0V4cCgpKSwgc2NhblJhbmdlLCAoe3JhbmdlLCBzdG9wfSkgLT5cbiAgICAgIGlmIHJhbmdlLnN0YXJ0LnJvdyA+IGN1cnJlbnRCdWZmZXJQb3NpdGlvbi5yb3dcbiAgICAgICAgIyBmb3JjZSBpdCB0byBzdG9wIGF0IHRoZSBiZWdpbm5pbmcgb2YgZWFjaCBsaW5lXG4gICAgICAgIGVuZE9mV29yZFBvc2l0aW9uID0gbmV3IFBvaW50KHJhbmdlLnN0YXJ0LnJvdywgMClcbiAgICAgIGVsc2UgaWYgcmFuZ2Uuc3RhcnQuaXNHcmVhdGVyVGhhbihjdXJyZW50QnVmZmVyUG9zaXRpb24pXG4gICAgICAgIGVuZE9mV29yZFBvc2l0aW9uID0gcmFuZ2Uuc3RhcnRcbiAgICAgIGVsc2VcbiAgICAgICAgZW5kT2ZXb3JkUG9zaXRpb24gPSByYW5nZS5lbmRcblxuICAgICAgaWYgbm90IGVuZE9mV29yZFBvc2l0aW9uPy5pc0VxdWFsKGN1cnJlbnRCdWZmZXJQb3NpdGlvbilcbiAgICAgICAgc3RvcCgpXG5cbiAgICBlbmRPZldvcmRQb3NpdGlvbiBvciBjdXJyZW50QnVmZmVyUG9zaXRpb25cblxuICAjIFB1YmxpYzogUmV0cmlldmVzIHRoZSBidWZmZXIgcG9zaXRpb24gb2Ygd2hlcmUgdGhlIGN1cnJlbnQgd29yZCBzdGFydHMuXG4gICNcbiAgIyAqIGBvcHRpb25zYCAob3B0aW9uYWwpIEFuIHtPYmplY3R9IHdpdGggdGhlIGZvbGxvd2luZyBrZXlzOlxuICAjICAgKiBgd29yZFJlZ2V4YCBBIHtSZWdFeHB9IGluZGljYXRpbmcgd2hhdCBjb25zdGl0dXRlcyBhIFwid29yZFwiXG4gICMgICAgIChkZWZhdWx0OiB7Ojp3b3JkUmVnRXhwfSkuXG4gICMgICAqIGBpbmNsdWRlTm9uV29yZENoYXJhY3RlcnNgIEEge0Jvb2xlYW59IGluZGljYXRpbmcgd2hldGhlciB0byBpbmNsdWRlXG4gICMgICAgIG5vbi13b3JkIGNoYXJhY3RlcnMgaW4gdGhlIGRlZmF1bHQgd29yZCByZWdleC5cbiAgIyAgICAgSGFzIG5vIGVmZmVjdCBpZiB3b3JkUmVnZXggaXMgc2V0LlxuICAjICAgKiBgYWxsb3dQcmV2aW91c2AgQSB7Qm9vbGVhbn0gaW5kaWNhdGluZyB3aGV0aGVyIHRoZSBiZWdpbm5pbmcgb2YgdGhlXG4gICMgICAgIHByZXZpb3VzIHdvcmQgY2FuIGJlIHJldHVybmVkLlxuICAjXG4gICMgUmV0dXJucyBhIHtSYW5nZX0uXG4gIGdldEJlZ2lubmluZ09mQ3VycmVudFdvcmRCdWZmZXJQb3NpdGlvbjogKG9wdGlvbnMgPSB7fSkgLT5cbiAgICBhbGxvd1ByZXZpb3VzID0gb3B0aW9ucy5hbGxvd1ByZXZpb3VzID8gdHJ1ZVxuICAgIGN1cnJlbnRCdWZmZXJQb3NpdGlvbiA9IEBnZXRCdWZmZXJQb3NpdGlvbigpXG4gICAgcHJldmlvdXNOb25CbGFua1JvdyA9IEBlZGl0b3IuYnVmZmVyLnByZXZpb3VzTm9uQmxhbmtSb3coY3VycmVudEJ1ZmZlclBvc2l0aW9uLnJvdykgPyAwXG4gICAgc2NhblJhbmdlID0gW1twcmV2aW91c05vbkJsYW5rUm93LCAwXSwgY3VycmVudEJ1ZmZlclBvc2l0aW9uXVxuXG4gICAgYmVnaW5uaW5nT2ZXb3JkUG9zaXRpb24gPSBudWxsXG4gICAgQGVkaXRvci5iYWNrd2FyZHNTY2FuSW5CdWZmZXJSYW5nZSAob3B0aW9ucy53b3JkUmVnZXggPyBAd29yZFJlZ0V4cChvcHRpb25zKSksIHNjYW5SYW5nZSwgKHtyYW5nZSwgbWF0Y2hUZXh0LCBzdG9wfSkgLT5cbiAgICAgICMgSWdub3JlICdlbXB0eSBsaW5lJyBtYXRjaGVzIGJldHdlZW4gJ1xccicgYW5kICdcXG4nXG4gICAgICByZXR1cm4gaWYgbWF0Y2hUZXh0IGlzICcnIGFuZCByYW5nZS5zdGFydC5jb2x1bW4gaXNudCAwXG5cbiAgICAgIGlmIHJhbmdlLnN0YXJ0LmlzTGVzc1RoYW4oY3VycmVudEJ1ZmZlclBvc2l0aW9uKVxuICAgICAgICBpZiByYW5nZS5lbmQuaXNHcmVhdGVyVGhhbk9yRXF1YWwoY3VycmVudEJ1ZmZlclBvc2l0aW9uKSBvciBhbGxvd1ByZXZpb3VzXG4gICAgICAgICAgYmVnaW5uaW5nT2ZXb3JkUG9zaXRpb24gPSByYW5nZS5zdGFydFxuICAgICAgICBzdG9wKClcblxuICAgIGlmIGJlZ2lubmluZ09mV29yZFBvc2l0aW9uP1xuICAgICAgYmVnaW5uaW5nT2ZXb3JkUG9zaXRpb25cbiAgICBlbHNlIGlmIGFsbG93UHJldmlvdXNcbiAgICAgIG5ldyBQb2ludCgwLCAwKVxuICAgIGVsc2VcbiAgICAgIGN1cnJlbnRCdWZmZXJQb3NpdGlvblxuXG4gICMgUHVibGljOiBSZXRyaWV2ZXMgdGhlIGJ1ZmZlciBwb3NpdGlvbiBvZiB3aGVyZSB0aGUgY3VycmVudCB3b3JkIGVuZHMuXG4gICNcbiAgIyAqIGBvcHRpb25zYCAob3B0aW9uYWwpIHtPYmplY3R9IHdpdGggdGhlIGZvbGxvd2luZyBrZXlzOlxuICAjICAgKiBgd29yZFJlZ2V4YCBBIHtSZWdFeHB9IGluZGljYXRpbmcgd2hhdCBjb25zdGl0dXRlcyBhIFwid29yZFwiXG4gICMgICAgICAoZGVmYXVsdDogezo6d29yZFJlZ0V4cH0pXG4gICMgICAqIGBpbmNsdWRlTm9uV29yZENoYXJhY3RlcnNgIEEgQm9vbGVhbiBpbmRpY2F0aW5nIHdoZXRoZXIgdG8gaW5jbHVkZVxuICAjICAgICBub24td29yZCBjaGFyYWN0ZXJzIGluIHRoZSBkZWZhdWx0IHdvcmQgcmVnZXguIEhhcyBubyBlZmZlY3QgaWZcbiAgIyAgICAgd29yZFJlZ2V4IGlzIHNldC5cbiAgI1xuICAjIFJldHVybnMgYSB7UmFuZ2V9LlxuICBnZXRFbmRPZkN1cnJlbnRXb3JkQnVmZmVyUG9zaXRpb246IChvcHRpb25zID0ge30pIC0+XG4gICAgYWxsb3dOZXh0ID0gb3B0aW9ucy5hbGxvd05leHQgPyB0cnVlXG4gICAgY3VycmVudEJ1ZmZlclBvc2l0aW9uID0gQGdldEJ1ZmZlclBvc2l0aW9uKClcbiAgICBzY2FuUmFuZ2UgPSBbY3VycmVudEJ1ZmZlclBvc2l0aW9uLCBAZWRpdG9yLmdldEVvZkJ1ZmZlclBvc2l0aW9uKCldXG5cbiAgICBlbmRPZldvcmRQb3NpdGlvbiA9IG51bGxcbiAgICBAZWRpdG9yLnNjYW5JbkJ1ZmZlclJhbmdlIChvcHRpb25zLndvcmRSZWdleCA/IEB3b3JkUmVnRXhwKG9wdGlvbnMpKSwgc2NhblJhbmdlLCAoe3JhbmdlLCBtYXRjaFRleHQsIHN0b3B9KSAtPlxuICAgICAgIyBJZ25vcmUgJ2VtcHR5IGxpbmUnIG1hdGNoZXMgYmV0d2VlbiAnXFxyJyBhbmQgJ1xcbidcbiAgICAgIHJldHVybiBpZiBtYXRjaFRleHQgaXMgJycgYW5kIHJhbmdlLnN0YXJ0LmNvbHVtbiBpc250IDBcblxuICAgICAgaWYgcmFuZ2UuZW5kLmlzR3JlYXRlclRoYW4oY3VycmVudEJ1ZmZlclBvc2l0aW9uKVxuICAgICAgICBpZiBhbGxvd05leHQgb3IgcmFuZ2Uuc3RhcnQuaXNMZXNzVGhhbk9yRXF1YWwoY3VycmVudEJ1ZmZlclBvc2l0aW9uKVxuICAgICAgICAgIGVuZE9mV29yZFBvc2l0aW9uID0gcmFuZ2UuZW5kXG4gICAgICAgIHN0b3AoKVxuXG4gICAgZW5kT2ZXb3JkUG9zaXRpb24gPyBjdXJyZW50QnVmZmVyUG9zaXRpb25cblxuICAjIFB1YmxpYzogUmV0cmlldmVzIHRoZSBidWZmZXIgcG9zaXRpb24gb2Ygd2hlcmUgdGhlIG5leHQgd29yZCBzdGFydHMuXG4gICNcbiAgIyAqIGBvcHRpb25zYCAob3B0aW9uYWwpIHtPYmplY3R9XG4gICMgICAqIGB3b3JkUmVnZXhgIEEge1JlZ0V4cH0gaW5kaWNhdGluZyB3aGF0IGNvbnN0aXR1dGVzIGEgXCJ3b3JkXCJcbiAgIyAgICAgKGRlZmF1bHQ6IHs6OndvcmRSZWdFeHB9KS5cbiAgI1xuICAjIFJldHVybnMgYSB7UmFuZ2V9XG4gIGdldEJlZ2lubmluZ09mTmV4dFdvcmRCdWZmZXJQb3NpdGlvbjogKG9wdGlvbnMgPSB7fSkgLT5cbiAgICBjdXJyZW50QnVmZmVyUG9zaXRpb24gPSBAZ2V0QnVmZmVyUG9zaXRpb24oKVxuICAgIHN0YXJ0ID0gaWYgQGlzSW5zaWRlV29yZChvcHRpb25zKSB0aGVuIEBnZXRFbmRPZkN1cnJlbnRXb3JkQnVmZmVyUG9zaXRpb24ob3B0aW9ucykgZWxzZSBjdXJyZW50QnVmZmVyUG9zaXRpb25cbiAgICBzY2FuUmFuZ2UgPSBbc3RhcnQsIEBlZGl0b3IuZ2V0RW9mQnVmZmVyUG9zaXRpb24oKV1cblxuICAgIGJlZ2lubmluZ09mTmV4dFdvcmRQb3NpdGlvbiA9IG51bGxcbiAgICBAZWRpdG9yLnNjYW5JbkJ1ZmZlclJhbmdlIChvcHRpb25zLndvcmRSZWdleCA/IEB3b3JkUmVnRXhwKCkpLCBzY2FuUmFuZ2UsICh7cmFuZ2UsIHN0b3B9KSAtPlxuICAgICAgYmVnaW5uaW5nT2ZOZXh0V29yZFBvc2l0aW9uID0gcmFuZ2Uuc3RhcnRcbiAgICAgIHN0b3AoKVxuXG4gICAgYmVnaW5uaW5nT2ZOZXh0V29yZFBvc2l0aW9uIG9yIGN1cnJlbnRCdWZmZXJQb3NpdGlvblxuXG4gICMgUHVibGljOiBSZXR1cm5zIHRoZSBidWZmZXIgUmFuZ2Ugb2NjdXBpZWQgYnkgdGhlIHdvcmQgbG9jYXRlZCB1bmRlciB0aGUgY3Vyc29yLlxuICAjXG4gICMgKiBgb3B0aW9uc2AgKG9wdGlvbmFsKSB7T2JqZWN0fVxuICAjICAgKiBgd29yZFJlZ2V4YCBBIHtSZWdFeHB9IGluZGljYXRpbmcgd2hhdCBjb25zdGl0dXRlcyBhIFwid29yZFwiXG4gICMgICAgIChkZWZhdWx0OiB7Ojp3b3JkUmVnRXhwfSkuXG4gIGdldEN1cnJlbnRXb3JkQnVmZmVyUmFuZ2U6IChvcHRpb25zPXt9KSAtPlxuICAgIHN0YXJ0T3B0aW9ucyA9IE9iamVjdC5hc3NpZ24oXy5jbG9uZShvcHRpb25zKSwgYWxsb3dQcmV2aW91czogZmFsc2UpXG4gICAgZW5kT3B0aW9ucyA9IE9iamVjdC5hc3NpZ24oXy5jbG9uZShvcHRpb25zKSwgYWxsb3dOZXh0OiBmYWxzZSlcbiAgICBuZXcgUmFuZ2UoQGdldEJlZ2lubmluZ09mQ3VycmVudFdvcmRCdWZmZXJQb3NpdGlvbihzdGFydE9wdGlvbnMpLCBAZ2V0RW5kT2ZDdXJyZW50V29yZEJ1ZmZlclBvc2l0aW9uKGVuZE9wdGlvbnMpKVxuXG4gICMgUHVibGljOiBSZXR1cm5zIHRoZSBidWZmZXIgUmFuZ2UgZm9yIHRoZSBjdXJyZW50IGxpbmUuXG4gICNcbiAgIyAqIGBvcHRpb25zYCAob3B0aW9uYWwpIHtPYmplY3R9XG4gICMgICAqIGBpbmNsdWRlTmV3bGluZWAgQSB7Qm9vbGVhbn0gd2hpY2ggY29udHJvbHMgd2hldGhlciB0aGUgUmFuZ2Ugc2hvdWxkXG4gICMgICAgIGluY2x1ZGUgdGhlIG5ld2xpbmUuXG4gIGdldEN1cnJlbnRMaW5lQnVmZmVyUmFuZ2U6IChvcHRpb25zKSAtPlxuICAgIEBlZGl0b3IuYnVmZmVyUmFuZ2VGb3JCdWZmZXJSb3coQGdldEJ1ZmZlclJvdygpLCBvcHRpb25zKVxuXG4gICMgUHVibGljOiBSZXRyaWV2ZXMgdGhlIHJhbmdlIGZvciB0aGUgY3VycmVudCBwYXJhZ3JhcGguXG4gICNcbiAgIyBBIHBhcmFncmFwaCBpcyBkZWZpbmVkIGFzIGEgYmxvY2sgb2YgdGV4dCBzdXJyb3VuZGVkIGJ5IGVtcHR5IGxpbmVzIG9yIGNvbW1lbnRzLlxuICAjXG4gICMgUmV0dXJucyBhIHtSYW5nZX0uXG4gIGdldEN1cnJlbnRQYXJhZ3JhcGhCdWZmZXJSYW5nZTogLT5cbiAgICBAZWRpdG9yLmxhbmd1YWdlTW9kZS5yb3dSYW5nZUZvclBhcmFncmFwaEF0QnVmZmVyUm93KEBnZXRCdWZmZXJSb3coKSlcblxuICAjIFB1YmxpYzogUmV0dXJucyB0aGUgY2hhcmFjdGVycyBwcmVjZWRpbmcgdGhlIGN1cnNvciBpbiB0aGUgY3VycmVudCB3b3JkLlxuICBnZXRDdXJyZW50V29yZFByZWZpeDogLT5cbiAgICBAZWRpdG9yLmdldFRleHRJbkJ1ZmZlclJhbmdlKFtAZ2V0QmVnaW5uaW5nT2ZDdXJyZW50V29yZEJ1ZmZlclBvc2l0aW9uKCksIEBnZXRCdWZmZXJQb3NpdGlvbigpXSlcblxuICAjIyNcbiAgU2VjdGlvbjogVmlzaWJpbGl0eVxuICAjIyNcblxuICAjIyNcbiAgU2VjdGlvbjogQ29tcGFyaW5nIHRvIGFub3RoZXIgY3Vyc29yXG4gICMjI1xuXG4gICMgUHVibGljOiBDb21wYXJlIHRoaXMgY3Vyc29yJ3MgYnVmZmVyIHBvc2l0aW9uIHRvIGFub3RoZXIgY3Vyc29yJ3MgYnVmZmVyIHBvc2l0aW9uLlxuICAjXG4gICMgU2VlIHtQb2ludDo6Y29tcGFyZX0gZm9yIG1vcmUgZGV0YWlscy5cbiAgI1xuICAjICogYG90aGVyQ3Vyc29yYHtDdXJzb3J9IHRvIGNvbXBhcmUgYWdhaW5zdFxuICBjb21wYXJlOiAob3RoZXJDdXJzb3IpIC0+XG4gICAgQGdldEJ1ZmZlclBvc2l0aW9uKCkuY29tcGFyZShvdGhlckN1cnNvci5nZXRCdWZmZXJQb3NpdGlvbigpKVxuXG4gICMjI1xuICBTZWN0aW9uOiBVdGlsaXRpZXNcbiAgIyMjXG5cbiAgIyBQdWJsaWM6IERlc2VsZWN0cyB0aGUgY3VycmVudCBzZWxlY3Rpb24uXG4gIGNsZWFyU2VsZWN0aW9uOiAob3B0aW9ucykgLT5cbiAgICBAc2VsZWN0aW9uPy5jbGVhcihvcHRpb25zKVxuXG4gICMgUHVibGljOiBHZXQgdGhlIFJlZ0V4cCB1c2VkIGJ5IHRoZSBjdXJzb3IgdG8gZGV0ZXJtaW5lIHdoYXQgYSBcIndvcmRcIiBpcy5cbiAgI1xuICAjICogYG9wdGlvbnNgIChvcHRpb25hbCkge09iamVjdH0gd2l0aCB0aGUgZm9sbG93aW5nIGtleXM6XG4gICMgICAqIGBpbmNsdWRlTm9uV29yZENoYXJhY3RlcnNgIEEge0Jvb2xlYW59IGluZGljYXRpbmcgd2hldGhlciB0byBpbmNsdWRlXG4gICMgICAgIG5vbi13b3JkIGNoYXJhY3RlcnMgaW4gdGhlIHJlZ2V4LiAoZGVmYXVsdDogdHJ1ZSlcbiAgI1xuICAjIFJldHVybnMgYSB7UmVnRXhwfS5cbiAgd29yZFJlZ0V4cDogKG9wdGlvbnMpIC0+XG4gICAgbm9uV29yZENoYXJhY3RlcnMgPSBfLmVzY2FwZVJlZ0V4cChAZ2V0Tm9uV29yZENoYXJhY3RlcnMoKSlcbiAgICBzb3VyY2UgPSBcIl5bXFx0IF0qJHxbXlxcXFxzI3tub25Xb3JkQ2hhcmFjdGVyc31dK1wiXG4gICAgaWYgb3B0aW9ucz8uaW5jbHVkZU5vbldvcmRDaGFyYWN0ZXJzID8gdHJ1ZVxuICAgICAgc291cmNlICs9IFwifFwiICsgXCJbI3tub25Xb3JkQ2hhcmFjdGVyc31dK1wiXG4gICAgbmV3IFJlZ0V4cChzb3VyY2UsIFwiZ1wiKVxuXG4gICMgUHVibGljOiBHZXQgdGhlIFJlZ0V4cCB1c2VkIGJ5IHRoZSBjdXJzb3IgdG8gZGV0ZXJtaW5lIHdoYXQgYSBcInN1YndvcmRcIiBpcy5cbiAgI1xuICAjICogYG9wdGlvbnNgIChvcHRpb25hbCkge09iamVjdH0gd2l0aCB0aGUgZm9sbG93aW5nIGtleXM6XG4gICMgICAqIGBiYWNrd2FyZHNgIEEge0Jvb2xlYW59IGluZGljYXRpbmcgd2hldGhlciB0byBsb29rIGZvcndhcmRzIG9yIGJhY2t3YXJkc1xuICAjICAgICBmb3IgdGhlIG5leHQgc3Vid29yZC4gKGRlZmF1bHQ6IGZhbHNlKVxuICAjXG4gICMgUmV0dXJucyBhIHtSZWdFeHB9LlxuICBzdWJ3b3JkUmVnRXhwOiAob3B0aW9ucz17fSkgLT5cbiAgICBub25Xb3JkQ2hhcmFjdGVycyA9IEBnZXROb25Xb3JkQ2hhcmFjdGVycygpXG4gICAgbG93ZXJjYXNlTGV0dGVycyA9ICdhLXpcXFxcdTAwREYtXFxcXHUwMEY2XFxcXHUwMEY4LVxcXFx1MDBGRidcbiAgICB1cHBlcmNhc2VMZXR0ZXJzID0gJ0EtWlxcXFx1MDBDMC1cXFxcdTAwRDZcXFxcdTAwRDgtXFxcXHUwMERFJ1xuICAgIHNuYWtlQ2FtZWxTZWdtZW50ID0gXCJbI3t1cHBlcmNhc2VMZXR0ZXJzfV0/WyN7bG93ZXJjYXNlTGV0dGVyc31dK1wiXG4gICAgc2VnbWVudHMgPSBbXG4gICAgICBcIl5bXFx0IF0rXCIsXG4gICAgICBcIltcXHQgXSskXCIsXG4gICAgICBcIlsje3VwcGVyY2FzZUxldHRlcnN9XSsoPyFbI3tsb3dlcmNhc2VMZXR0ZXJzfV0pXCIsXG4gICAgICBcIlxcXFxkK1wiXG4gICAgXVxuICAgIGlmIG9wdGlvbnMuYmFja3dhcmRzXG4gICAgICBzZWdtZW50cy5wdXNoKFwiI3tzbmFrZUNhbWVsU2VnbWVudH1fKlwiKVxuICAgICAgc2VnbWVudHMucHVzaChcIlsje18uZXNjYXBlUmVnRXhwKG5vbldvcmRDaGFyYWN0ZXJzKX1dK1xcXFxzKlwiKVxuICAgIGVsc2VcbiAgICAgIHNlZ21lbnRzLnB1c2goXCJfKiN7c25ha2VDYW1lbFNlZ21lbnR9XCIpXG4gICAgICBzZWdtZW50cy5wdXNoKFwiXFxcXHMqWyN7Xy5lc2NhcGVSZWdFeHAobm9uV29yZENoYXJhY3RlcnMpfV0rXCIpXG4gICAgc2VnbWVudHMucHVzaChcIl8rXCIpXG4gICAgbmV3IFJlZ0V4cChzZWdtZW50cy5qb2luKFwifFwiKSwgXCJnXCIpXG5cbiAgIyMjXG4gIFNlY3Rpb246IFByaXZhdGVcbiAgIyMjXG5cbiAgZ2V0Tm9uV29yZENoYXJhY3RlcnM6IC0+XG4gICAgQGVkaXRvci5nZXROb25Xb3JkQ2hhcmFjdGVycyhAZ2V0U2NvcGVEZXNjcmlwdG9yKCkuZ2V0U2NvcGVzQXJyYXkoKSlcblxuICBjaGFuZ2VQb3NpdGlvbjogKG9wdGlvbnMsIGZuKSAtPlxuICAgIEBjbGVhclNlbGVjdGlvbihhdXRvc2Nyb2xsOiBmYWxzZSlcbiAgICBmbigpXG4gICAgQGF1dG9zY3JvbGwoKSBpZiBvcHRpb25zLmF1dG9zY3JvbGwgPyBAaXNMYXN0Q3Vyc29yKClcblxuICBnZXRTY3JlZW5SYW5nZTogLT5cbiAgICB7cm93LCBjb2x1bW59ID0gQGdldFNjcmVlblBvc2l0aW9uKClcbiAgICBuZXcgUmFuZ2UobmV3IFBvaW50KHJvdywgY29sdW1uKSwgbmV3IFBvaW50KHJvdywgY29sdW1uICsgMSkpXG5cbiAgYXV0b3Njcm9sbDogKG9wdGlvbnMgPSB7fSkgLT5cbiAgICBvcHRpb25zLmNsaXAgPSBmYWxzZVxuICAgIEBlZGl0b3Iuc2Nyb2xsVG9TY3JlZW5SYW5nZShAZ2V0U2NyZWVuUmFuZ2UoKSwgb3B0aW9ucylcblxuICBnZXRCZWdpbm5pbmdPZk5leHRQYXJhZ3JhcGhCdWZmZXJQb3NpdGlvbjogLT5cbiAgICBzdGFydCA9IEBnZXRCdWZmZXJQb3NpdGlvbigpXG4gICAgZW9mID0gQGVkaXRvci5nZXRFb2ZCdWZmZXJQb3NpdGlvbigpXG4gICAgc2NhblJhbmdlID0gW3N0YXJ0LCBlb2ZdXG5cbiAgICB7cm93LCBjb2x1bW59ID0gZW9mXG4gICAgcG9zaXRpb24gPSBuZXcgUG9pbnQocm93LCBjb2x1bW4gLSAxKVxuXG4gICAgQGVkaXRvci5zY2FuSW5CdWZmZXJSYW5nZSBFbXB0eUxpbmVSZWdFeHAsIHNjYW5SYW5nZSwgKHtyYW5nZSwgc3RvcH0pIC0+XG4gICAgICBwb3NpdGlvbiA9IHJhbmdlLnN0YXJ0LnRyYXZlcnNlKFBvaW50KDEsIDApKVxuICAgICAgc3RvcCgpIHVubGVzcyBwb3NpdGlvbi5pc0VxdWFsKHN0YXJ0KVxuICAgIHBvc2l0aW9uXG5cbiAgZ2V0QmVnaW5uaW5nT2ZQcmV2aW91c1BhcmFncmFwaEJ1ZmZlclBvc2l0aW9uOiAtPlxuICAgIHN0YXJ0ID0gQGdldEJ1ZmZlclBvc2l0aW9uKClcblxuICAgIHtyb3csIGNvbHVtbn0gPSBzdGFydFxuICAgIHNjYW5SYW5nZSA9IFtbcm93LTEsIGNvbHVtbl0sIFswLCAwXV1cbiAgICBwb3NpdGlvbiA9IG5ldyBQb2ludCgwLCAwKVxuICAgIEBlZGl0b3IuYmFja3dhcmRzU2NhbkluQnVmZmVyUmFuZ2UgRW1wdHlMaW5lUmVnRXhwLCBzY2FuUmFuZ2UsICh7cmFuZ2UsIHN0b3B9KSAtPlxuICAgICAgcG9zaXRpb24gPSByYW5nZS5zdGFydC50cmF2ZXJzZShQb2ludCgxLCAwKSlcbiAgICAgIHN0b3AoKSB1bmxlc3MgcG9zaXRpb24uaXNFcXVhbChzdGFydClcbiAgICBwb3NpdGlvblxuIl19
