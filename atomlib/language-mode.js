(function() {
  var LanguageMode, NullGrammar, OnigRegExp, Range, ScopeDescriptor, _;

  Range = require('text-buffer').Range;

  _ = require('underscore-plus');

  OnigRegExp = require('oniguruma').OnigRegExp;

  ScopeDescriptor = require('./scope-descriptor');

  NullGrammar = require('./null-grammar');

  module.exports = LanguageMode = (function() {
    function LanguageMode(editor) {
      this.editor = editor;
      this.buffer = this.editor.buffer;
      this.regexesByPattern = {};
    }

    LanguageMode.prototype.destroy = function() {};

    LanguageMode.prototype.toggleLineCommentForBufferRow = function(row) {
      return this.toggleLineCommentsForBufferRows(row, row);
    };

    LanguageMode.prototype.toggleLineCommentsForBufferRows = function(start, end) {
      var allBlank, allBlankOrCommented, blank, buffer, columnEnd, columnStart, commentEndRegex, commentEndRegexString, commentEndString, commentStartRegex, commentStartRegexString, commentStartString, commentStrings, endMatch, i, indent, indentLength, indentRegex, indentString, j, k, line, match, ref, ref1, ref2, ref3, ref4, ref5, ref6, row, scope, shouldUncomment, startMatch, tabLength;
      scope = this.editor.scopeDescriptorForBufferPosition([start, 0]);
      commentStrings = this.editor.getCommentStrings(scope);
      if (!(commentStrings != null ? commentStrings.commentStartString : void 0)) {
        return;
      }
      commentStartString = commentStrings.commentStartString, commentEndString = commentStrings.commentEndString;
      buffer = this.editor.buffer;
      commentStartRegexString = _.escapeRegExp(commentStartString).replace(/(\s+)$/, '(?:$1)?');
      commentStartRegex = new OnigRegExp("^(\\s*)(" + commentStartRegexString + ")");
      if (commentEndString) {
        shouldUncomment = commentStartRegex.testSync(buffer.lineForRow(start));
        if (shouldUncomment) {
          commentEndRegexString = _.escapeRegExp(commentEndString).replace(/^(\s+)/, '(?:$1)?');
          commentEndRegex = new OnigRegExp("(" + commentEndRegexString + ")(\\s*)$");
          startMatch = commentStartRegex.searchSync(buffer.lineForRow(start));
          endMatch = commentEndRegex.searchSync(buffer.lineForRow(end));
          if (startMatch && endMatch) {
            buffer.transact(function() {
              var columnEnd, columnStart, endColumn, endLength;
              columnStart = startMatch[1].length;
              columnEnd = columnStart + startMatch[2].length;
              buffer.setTextInRange([[start, columnStart], [start, columnEnd]], "");
              endLength = buffer.lineLengthForRow(end) - endMatch[2].length;
              endColumn = endLength - endMatch[1].length;
              return buffer.setTextInRange([[end, endColumn], [end, endLength]], "");
            });
          }
        } else {
          buffer.transact(function() {
            var indentLength, ref, ref1;
            indentLength = (ref = (ref1 = buffer.lineForRow(start).match(/^\s*/)) != null ? ref1[0].length : void 0) != null ? ref : 0;
            buffer.insert([start, indentLength], commentStartString);
            return buffer.insert([end, buffer.lineLengthForRow(end)], commentEndString);
          });
        }
      } else {
        allBlank = true;
        allBlankOrCommented = true;
        for (row = i = ref = start, ref1 = end; i <= ref1; row = i += 1) {
          line = buffer.lineForRow(row);
          blank = line != null ? line.match(/^\s*$/) : void 0;
          if (!blank) {
            allBlank = false;
          }
          if (!(blank || commentStartRegex.testSync(line))) {
            allBlankOrCommented = false;
          }
        }
        shouldUncomment = allBlankOrCommented && !allBlank;
        if (shouldUncomment) {
          for (row = j = ref2 = start, ref3 = end; j <= ref3; row = j += 1) {
            if (match = commentStartRegex.searchSync(buffer.lineForRow(row))) {
              columnStart = match[1].length;
              columnEnd = columnStart + match[2].length;
              buffer.setTextInRange([[row, columnStart], [row, columnEnd]], "");
            }
          }
        } else {
          if (start === end) {
            indent = this.editor.indentationForBufferRow(start);
          } else {
            indent = this.minIndentLevelForRowRange(start, end);
          }
          indentString = this.editor.buildIndentString(indent);
          tabLength = this.editor.getTabLength();
          indentRegex = new RegExp("(\t|[ ]{" + tabLength + "}){" + (Math.floor(indent)) + "}");
          for (row = k = ref4 = start, ref5 = end; k <= ref5; row = k += 1) {
            line = buffer.lineForRow(row);
            if (indentLength = (ref6 = line.match(indentRegex)) != null ? ref6[0].length : void 0) {
              buffer.insert([row, indentLength], commentStartString);
            } else {
              buffer.setTextInRange([[row, 0], [row, indentString.length]], indentString + commentStartString);
            }
          }
        }
      }
    };

    LanguageMode.prototype.foldAll = function() {
      var currentRow, endRow, foldedRowRanges, i, ref, ref1, ref2, rowRange, startRow;
      this.unfoldAll();
      foldedRowRanges = {};
      for (currentRow = i = 0, ref = this.buffer.getLastRow(); i <= ref; currentRow = i += 1) {
        rowRange = (ref2 = (ref1 = this.rowRangeForFoldAtBufferRow(currentRow)) != null ? ref1 : [], startRow = ref2[0], endRow = ref2[1], ref2);
        if (startRow == null) {
          continue;
        }
        if (foldedRowRanges[rowRange]) {
          continue;
        }
        this.editor.foldBufferRowRange(startRow, endRow);
        foldedRowRanges[rowRange] = true;
      }
    };

    LanguageMode.prototype.unfoldAll = function() {
      return this.editor.displayLayer.destroyAllFolds();
    };

    LanguageMode.prototype.foldAllAtIndentLevel = function(indentLevel) {
      var currentRow, endRow, foldedRowRanges, i, ref, ref1, ref2, rowRange, startRow;
      this.unfoldAll();
      foldedRowRanges = {};
      for (currentRow = i = 0, ref = this.buffer.getLastRow(); i <= ref; currentRow = i += 1) {
        rowRange = (ref2 = (ref1 = this.rowRangeForFoldAtBufferRow(currentRow)) != null ? ref1 : [], startRow = ref2[0], endRow = ref2[1], ref2);
        if (startRow == null) {
          continue;
        }
        if (foldedRowRanges[rowRange]) {
          continue;
        }
        if (this.editor.indentationForBufferRow(startRow) === indentLevel) {
          this.editor.foldBufferRowRange(startRow, endRow);
          foldedRowRanges[rowRange] = true;
        }
      }
    };

    LanguageMode.prototype.foldBufferRow = function(bufferRow) {
      var currentRow, endRow, i, ref, ref1, ref2, startRow;
      for (currentRow = i = ref = bufferRow; i >= 0; currentRow = i += -1) {
        ref2 = (ref1 = this.rowRangeForFoldAtBufferRow(currentRow)) != null ? ref1 : [], startRow = ref2[0], endRow = ref2[1];
        if (!((startRow != null) && (startRow <= bufferRow && bufferRow <= endRow))) {
          continue;
        }
        if (!this.editor.isFoldedAtBufferRow(startRow)) {
          return this.editor.foldBufferRowRange(startRow, endRow);
        }
      }
    };

    LanguageMode.prototype.rowRangeForFoldAtBufferRow = function(bufferRow) {
      var rowRange;
      rowRange = this.rowRangeForCommentAtBufferRow(bufferRow);
      if (rowRange == null) {
        rowRange = this.rowRangeForCodeFoldAtBufferRow(bufferRow);
      }
      return rowRange;
    };

    LanguageMode.prototype.rowRangeForCommentAtBufferRow = function(bufferRow) {
      var currentRow, endRow, i, j, ref, ref1, ref2, ref3, ref4, ref5, startRow;
      if (!((ref = this.editor.tokenizedBuffer.tokenizedLines[bufferRow]) != null ? ref.isComment() : void 0)) {
        return;
      }
      startRow = bufferRow;
      endRow = bufferRow;
      if (bufferRow > 0) {
        for (currentRow = i = ref1 = bufferRow - 1; i >= 0; currentRow = i += -1) {
          if (!((ref2 = this.editor.tokenizedBuffer.tokenizedLines[currentRow]) != null ? ref2.isComment() : void 0)) {
            break;
          }
          startRow = currentRow;
        }
      }
      if (bufferRow < this.buffer.getLastRow()) {
        for (currentRow = j = ref3 = bufferRow + 1, ref4 = this.buffer.getLastRow(); j <= ref4; currentRow = j += 1) {
          if (!((ref5 = this.editor.tokenizedBuffer.tokenizedLines[currentRow]) != null ? ref5.isComment() : void 0)) {
            break;
          }
          endRow = currentRow;
        }
      }
      if (startRow !== endRow) {
        return [startRow, endRow];
      }
    };

    LanguageMode.prototype.rowRangeForCodeFoldAtBufferRow = function(bufferRow) {
      var foldEndRow, i, includeRowInFold, indentation, ref, ref1, ref2, row, scopeDescriptor, startIndentLevel;
      if (!this.isFoldableAtBufferRow(bufferRow)) {
        return null;
      }
      startIndentLevel = this.editor.indentationForBufferRow(bufferRow);
      scopeDescriptor = this.editor.scopeDescriptorForBufferPosition([bufferRow, 0]);
      for (row = i = ref = bufferRow + 1, ref1 = this.editor.getLastBufferRow(); i <= ref1; row = i += 1) {
        if (this.editor.isBufferRowBlank(row)) {
          continue;
        }
        indentation = this.editor.indentationForBufferRow(row);
        if (indentation <= startIndentLevel) {
          includeRowInFold = indentation === startIndentLevel && ((ref2 = this.foldEndRegexForScopeDescriptor(scopeDescriptor)) != null ? ref2.searchSync(this.editor.lineTextForBufferRow(row)) : void 0);
          if (includeRowInFold) {
            foldEndRow = row;
          }
          break;
        }
        foldEndRow = row;
      }
      return [bufferRow, foldEndRow];
    };

    LanguageMode.prototype.isFoldableAtBufferRow = function(bufferRow) {
      return this.editor.tokenizedBuffer.isFoldableAtRow(bufferRow);
    };

    LanguageMode.prototype.isLineCommentedAtBufferRow = function(bufferRow) {
      var ref, ref1;
      if (!((0 <= bufferRow && bufferRow <= this.editor.getLastBufferRow()))) {
        return false;
      }
      return (ref = (ref1 = this.editor.tokenizedBuffer.tokenizedLines[bufferRow]) != null ? ref1.isComment() : void 0) != null ? ref : false;
    };

    LanguageMode.prototype.rowRangeForParagraphAtBufferRow = function(bufferRow) {
      var commentStartRegex, commentStartRegexString, commentStrings, endRow, filterCommentStart, firstRow, isOriginalRowComment, lastRow, range, ref, ref1, scope, startRow;
      scope = this.editor.scopeDescriptorForBufferPosition([bufferRow, 0]);
      commentStrings = this.editor.getCommentStrings(scope);
      commentStartRegex = null;
      if (((commentStrings != null ? commentStrings.commentStartString : void 0) != null) && (commentStrings.commentEndString == null)) {
        commentStartRegexString = _.escapeRegExp(commentStrings.commentStartString).replace(/(\s+)$/, '(?:$1)?');
        commentStartRegex = new OnigRegExp("^(\\s*)(" + commentStartRegexString + ")");
      }
      filterCommentStart = function(line) {
        var matches;
        if (commentStartRegex != null) {
          matches = commentStartRegex.searchSync(line);
          if (matches != null ? matches.length : void 0) {
            line = line.substring(matches[0].end);
          }
        }
        return line;
      };
      if (!/\S/.test(filterCommentStart(this.editor.lineTextForBufferRow(bufferRow)))) {
        return;
      }
      if (this.isLineCommentedAtBufferRow(bufferRow)) {
        isOriginalRowComment = true;
        range = this.rowRangeForCommentAtBufferRow(bufferRow);
        ref = range || [bufferRow, bufferRow], firstRow = ref[0], lastRow = ref[1];
      } else {
        isOriginalRowComment = false;
        ref1 = [0, this.editor.getLastBufferRow() - 1], firstRow = ref1[0], lastRow = ref1[1];
      }
      startRow = bufferRow;
      while (startRow > firstRow) {
        if (this.isLineCommentedAtBufferRow(startRow - 1) !== isOriginalRowComment) {
          break;
        }
        if (!/\S/.test(filterCommentStart(this.editor.lineTextForBufferRow(startRow - 1)))) {
          break;
        }
        startRow--;
      }
      endRow = bufferRow;
      lastRow = this.editor.getLastBufferRow();
      while (endRow < lastRow) {
        if (this.isLineCommentedAtBufferRow(endRow + 1) !== isOriginalRowComment) {
          break;
        }
        if (!/\S/.test(filterCommentStart(this.editor.lineTextForBufferRow(endRow + 1)))) {
          break;
        }
        endRow++;
      }
      return new Range([startRow, 0], [endRow, this.editor.lineTextForBufferRow(endRow).length]);
    };

    LanguageMode.prototype.suggestedIndentForBufferRow = function(bufferRow, options) {
      var line, tokenizedLine;
      line = this.buffer.lineForRow(bufferRow);
      tokenizedLine = this.editor.tokenizedBuffer.tokenizedLineForRow(bufferRow);
      return this.suggestedIndentForTokenizedLineAtBufferRow(bufferRow, line, tokenizedLine, options);
    };

    LanguageMode.prototype.suggestedIndentForLineAtBufferRow = function(bufferRow, line, options) {
      var tokenizedLine;
      tokenizedLine = this.editor.tokenizedBuffer.buildTokenizedLineForRowWithText(bufferRow, line);
      return this.suggestedIndentForTokenizedLineAtBufferRow(bufferRow, line, tokenizedLine, options);
    };

    LanguageMode.prototype.suggestedIndentForTokenizedLineAtBufferRow = function(bufferRow, line, tokenizedLine, options) {
      var decreaseIndentRegex, decreaseNextIndentRegex, desiredIndentLevel, increaseIndentRegex, iterator, precedingLine, precedingRow, ref, scopeDescriptor;
      iterator = tokenizedLine.getTokenIterator();
      iterator.next();
      scopeDescriptor = new ScopeDescriptor({
        scopes: iterator.getScopes()
      });
      increaseIndentRegex = this.increaseIndentRegexForScopeDescriptor(scopeDescriptor);
      decreaseIndentRegex = this.decreaseIndentRegexForScopeDescriptor(scopeDescriptor);
      decreaseNextIndentRegex = this.decreaseNextIndentRegexForScopeDescriptor(scopeDescriptor);
      if ((ref = options != null ? options.skipBlankLines : void 0) != null ? ref : true) {
        precedingRow = this.buffer.previousNonBlankRow(bufferRow);
        if (precedingRow == null) {
          return 0;
        }
      } else {
        precedingRow = bufferRow - 1;
        if (precedingRow < 0) {
          return 0;
        }
      }
      desiredIndentLevel = this.editor.indentationForBufferRow(precedingRow);
      if (!increaseIndentRegex) {
        return desiredIndentLevel;
      }
      if (!this.editor.isBufferRowCommented(precedingRow)) {
        precedingLine = this.buffer.lineForRow(precedingRow);
        if (increaseIndentRegex != null ? increaseIndentRegex.testSync(precedingLine) : void 0) {
          desiredIndentLevel += 1;
        }
        if (decreaseNextIndentRegex != null ? decreaseNextIndentRegex.testSync(precedingLine) : void 0) {
          desiredIndentLevel -= 1;
        }
      }
      if (!this.buffer.isRowBlank(precedingRow)) {
        if (decreaseIndentRegex != null ? decreaseIndentRegex.testSync(line) : void 0) {
          desiredIndentLevel -= 1;
        }
      }
      return Math.max(desiredIndentLevel, 0);
    };

    LanguageMode.prototype.minIndentLevelForRowRange = function(startRow, endRow) {
      var indents, row;
      indents = (function() {
        var i, ref, ref1, results;
        results = [];
        for (row = i = ref = startRow, ref1 = endRow; i <= ref1; row = i += 1) {
          if (!this.editor.isBufferRowBlank(row)) {
            results.push(this.editor.indentationForBufferRow(row));
          }
        }
        return results;
      }).call(this);
      if (!indents.length) {
        indents = [0];
      }
      return Math.min.apply(Math, indents);
    };

    LanguageMode.prototype.autoIndentBufferRows = function(startRow, endRow) {
      var i, ref, ref1, row;
      for (row = i = ref = startRow, ref1 = endRow; i <= ref1; row = i += 1) {
        this.autoIndentBufferRow(row);
      }
    };

    LanguageMode.prototype.autoIndentBufferRow = function(bufferRow, options) {
      var indentLevel;
      indentLevel = this.suggestedIndentForBufferRow(bufferRow, options);
      return this.editor.setIndentationForBufferRow(bufferRow, indentLevel, options);
    };

    LanguageMode.prototype.autoDecreaseIndentForBufferRow = function(bufferRow) {
      var currentIndentLevel, decreaseIndentRegex, decreaseNextIndentRegex, desiredIndentLevel, increaseIndentRegex, line, precedingLine, precedingRow, scopeDescriptor;
      scopeDescriptor = this.editor.scopeDescriptorForBufferPosition([bufferRow, 0]);
      if (!(decreaseIndentRegex = this.decreaseIndentRegexForScopeDescriptor(scopeDescriptor))) {
        return;
      }
      line = this.buffer.lineForRow(bufferRow);
      if (!decreaseIndentRegex.testSync(line)) {
        return;
      }
      currentIndentLevel = this.editor.indentationForBufferRow(bufferRow);
      if (currentIndentLevel === 0) {
        return;
      }
      precedingRow = this.buffer.previousNonBlankRow(bufferRow);
      if (precedingRow == null) {
        return;
      }
      precedingLine = this.buffer.lineForRow(precedingRow);
      desiredIndentLevel = this.editor.indentationForBufferRow(precedingRow);
      if (increaseIndentRegex = this.increaseIndentRegexForScopeDescriptor(scopeDescriptor)) {
        if (!increaseIndentRegex.testSync(precedingLine)) {
          desiredIndentLevel -= 1;
        }
      }
      if (decreaseNextIndentRegex = this.decreaseNextIndentRegexForScopeDescriptor(scopeDescriptor)) {
        if (decreaseNextIndentRegex.testSync(precedingLine)) {
          desiredIndentLevel -= 1;
        }
      }
      if (desiredIndentLevel >= 0 && desiredIndentLevel < currentIndentLevel) {
        return this.editor.setIndentationForBufferRow(bufferRow, desiredIndentLevel);
      }
    };

    LanguageMode.prototype.cacheRegex = function(pattern) {
      var base;
      if (pattern) {
        return (base = this.regexesByPattern)[pattern] != null ? base[pattern] : base[pattern] = new OnigRegExp(pattern);
      }
    };

    LanguageMode.prototype.increaseIndentRegexForScopeDescriptor = function(scopeDescriptor) {
      return this.cacheRegex(this.editor.getIncreaseIndentPattern(scopeDescriptor));
    };

    LanguageMode.prototype.decreaseIndentRegexForScopeDescriptor = function(scopeDescriptor) {
      return this.cacheRegex(this.editor.getDecreaseIndentPattern(scopeDescriptor));
    };

    LanguageMode.prototype.decreaseNextIndentRegexForScopeDescriptor = function(scopeDescriptor) {
      return this.cacheRegex(this.editor.getDecreaseNextIndentPattern(scopeDescriptor));
    };

    LanguageMode.prototype.foldEndRegexForScopeDescriptor = function(scopeDescriptor) {
      return this.cacheRegex(this.editor.getFoldEndPattern(scopeDescriptor));
    };

    return LanguageMode;

  })();

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiL1VzZXJzL2Rpc3RpbGxlci9hdG9tL291dC9hcHAvc3JjL2xhbmd1YWdlLW1vZGUuY29mZmVlIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQUEsTUFBQTs7RUFBQyxRQUFTLE9BQUEsQ0FBUSxhQUFSOztFQUNWLENBQUEsR0FBSSxPQUFBLENBQVEsaUJBQVI7O0VBQ0gsYUFBYyxPQUFBLENBQVEsV0FBUjs7RUFDZixlQUFBLEdBQWtCLE9BQUEsQ0FBUSxvQkFBUjs7RUFDbEIsV0FBQSxHQUFjLE9BQUEsQ0FBUSxnQkFBUjs7RUFFZCxNQUFNLENBQUMsT0FBUCxHQUNNO0lBSVMsc0JBQUMsTUFBRDtNQUFDLElBQUMsQ0FBQSxTQUFEO01BQ1gsSUFBQyxDQUFBLFNBQVUsSUFBQyxDQUFBLE9BQVg7TUFDRixJQUFDLENBQUEsZ0JBQUQsR0FBb0I7SUFGVDs7MkJBSWIsT0FBQSxHQUFTLFNBQUEsR0FBQTs7MkJBRVQsNkJBQUEsR0FBK0IsU0FBQyxHQUFEO2FBQzdCLElBQUMsQ0FBQSwrQkFBRCxDQUFpQyxHQUFqQyxFQUFzQyxHQUF0QztJQUQ2Qjs7MkJBUy9CLCtCQUFBLEdBQWlDLFNBQUMsS0FBRCxFQUFRLEdBQVI7QUFDL0IsVUFBQTtNQUFBLEtBQUEsR0FBUSxJQUFDLENBQUEsTUFBTSxDQUFDLGdDQUFSLENBQXlDLENBQUMsS0FBRCxFQUFRLENBQVIsQ0FBekM7TUFDUixjQUFBLEdBQWlCLElBQUMsQ0FBQSxNQUFNLENBQUMsaUJBQVIsQ0FBMEIsS0FBMUI7TUFDakIsSUFBQSwyQkFBYyxjQUFjLENBQUUsNEJBQTlCO0FBQUEsZUFBQTs7TUFDQyxzREFBRCxFQUFxQjtNQUVyQixNQUFBLEdBQVMsSUFBQyxDQUFBLE1BQU0sQ0FBQztNQUNqQix1QkFBQSxHQUEwQixDQUFDLENBQUMsWUFBRixDQUFlLGtCQUFmLENBQWtDLENBQUMsT0FBbkMsQ0FBMkMsUUFBM0MsRUFBcUQsU0FBckQ7TUFDMUIsaUJBQUEsR0FBd0IsSUFBQSxVQUFBLENBQVcsVUFBQSxHQUFXLHVCQUFYLEdBQW1DLEdBQTlDO01BRXhCLElBQUcsZ0JBQUg7UUFDRSxlQUFBLEdBQWtCLGlCQUFpQixDQUFDLFFBQWxCLENBQTJCLE1BQU0sQ0FBQyxVQUFQLENBQWtCLEtBQWxCLENBQTNCO1FBQ2xCLElBQUcsZUFBSDtVQUNFLHFCQUFBLEdBQXdCLENBQUMsQ0FBQyxZQUFGLENBQWUsZ0JBQWYsQ0FBZ0MsQ0FBQyxPQUFqQyxDQUF5QyxRQUF6QyxFQUFtRCxTQUFuRDtVQUN4QixlQUFBLEdBQXNCLElBQUEsVUFBQSxDQUFXLEdBQUEsR0FBSSxxQkFBSixHQUEwQixVQUFyQztVQUN0QixVQUFBLEdBQWMsaUJBQWlCLENBQUMsVUFBbEIsQ0FBNkIsTUFBTSxDQUFDLFVBQVAsQ0FBa0IsS0FBbEIsQ0FBN0I7VUFDZCxRQUFBLEdBQVcsZUFBZSxDQUFDLFVBQWhCLENBQTJCLE1BQU0sQ0FBQyxVQUFQLENBQWtCLEdBQWxCLENBQTNCO1VBQ1gsSUFBRyxVQUFBLElBQWUsUUFBbEI7WUFDRSxNQUFNLENBQUMsUUFBUCxDQUFnQixTQUFBO0FBQ2Qsa0JBQUE7Y0FBQSxXQUFBLEdBQWMsVUFBVyxDQUFBLENBQUEsQ0FBRSxDQUFDO2NBQzVCLFNBQUEsR0FBWSxXQUFBLEdBQWMsVUFBVyxDQUFBLENBQUEsQ0FBRSxDQUFDO2NBQ3hDLE1BQU0sQ0FBQyxjQUFQLENBQXNCLENBQUMsQ0FBQyxLQUFELEVBQVEsV0FBUixDQUFELEVBQXVCLENBQUMsS0FBRCxFQUFRLFNBQVIsQ0FBdkIsQ0FBdEIsRUFBa0UsRUFBbEU7Y0FFQSxTQUFBLEdBQVksTUFBTSxDQUFDLGdCQUFQLENBQXdCLEdBQXhCLENBQUEsR0FBK0IsUUFBUyxDQUFBLENBQUEsQ0FBRSxDQUFDO2NBQ3ZELFNBQUEsR0FBWSxTQUFBLEdBQVksUUFBUyxDQUFBLENBQUEsQ0FBRSxDQUFDO3FCQUNwQyxNQUFNLENBQUMsY0FBUCxDQUFzQixDQUFDLENBQUMsR0FBRCxFQUFNLFNBQU4sQ0FBRCxFQUFtQixDQUFDLEdBQUQsRUFBTSxTQUFOLENBQW5CLENBQXRCLEVBQTRELEVBQTVEO1lBUGMsQ0FBaEIsRUFERjtXQUxGO1NBQUEsTUFBQTtVQWVFLE1BQU0sQ0FBQyxRQUFQLENBQWdCLFNBQUE7QUFDZCxnQkFBQTtZQUFBLFlBQUEsNkdBQW1FO1lBQ25FLE1BQU0sQ0FBQyxNQUFQLENBQWMsQ0FBQyxLQUFELEVBQVEsWUFBUixDQUFkLEVBQXFDLGtCQUFyQzttQkFDQSxNQUFNLENBQUMsTUFBUCxDQUFjLENBQUMsR0FBRCxFQUFNLE1BQU0sQ0FBQyxnQkFBUCxDQUF3QixHQUF4QixDQUFOLENBQWQsRUFBbUQsZ0JBQW5EO1VBSGMsQ0FBaEIsRUFmRjtTQUZGO09BQUEsTUFBQTtRQXNCRSxRQUFBLEdBQVc7UUFDWCxtQkFBQSxHQUFzQjtBQUV0QixhQUFXLDBEQUFYO1VBQ0UsSUFBQSxHQUFPLE1BQU0sQ0FBQyxVQUFQLENBQWtCLEdBQWxCO1VBQ1AsS0FBQSxrQkFBUSxJQUFJLENBQUUsS0FBTixDQUFZLE9BQVo7VUFFUixJQUFBLENBQXdCLEtBQXhCO1lBQUEsUUFBQSxHQUFXLE1BQVg7O1VBQ0EsSUFBQSxDQUFBLENBQW1DLEtBQUEsSUFBUyxpQkFBaUIsQ0FBQyxRQUFsQixDQUEyQixJQUEzQixDQUE1QyxDQUFBO1lBQUEsbUJBQUEsR0FBc0IsTUFBdEI7O0FBTEY7UUFPQSxlQUFBLEdBQWtCLG1CQUFBLElBQXdCLENBQUk7UUFFOUMsSUFBRyxlQUFIO0FBQ0UsZUFBVywyREFBWDtZQUNFLElBQUcsS0FBQSxHQUFRLGlCQUFpQixDQUFDLFVBQWxCLENBQTZCLE1BQU0sQ0FBQyxVQUFQLENBQWtCLEdBQWxCLENBQTdCLENBQVg7Y0FDRSxXQUFBLEdBQWMsS0FBTSxDQUFBLENBQUEsQ0FBRSxDQUFDO2NBQ3ZCLFNBQUEsR0FBWSxXQUFBLEdBQWMsS0FBTSxDQUFBLENBQUEsQ0FBRSxDQUFDO2NBQ25DLE1BQU0sQ0FBQyxjQUFQLENBQXNCLENBQUMsQ0FBQyxHQUFELEVBQU0sV0FBTixDQUFELEVBQXFCLENBQUMsR0FBRCxFQUFNLFNBQU4sQ0FBckIsQ0FBdEIsRUFBOEQsRUFBOUQsRUFIRjs7QUFERixXQURGO1NBQUEsTUFBQTtVQU9FLElBQUcsS0FBQSxLQUFTLEdBQVo7WUFDRSxNQUFBLEdBQVMsSUFBQyxDQUFBLE1BQU0sQ0FBQyx1QkFBUixDQUFnQyxLQUFoQyxFQURYO1dBQUEsTUFBQTtZQUdFLE1BQUEsR0FBUyxJQUFDLENBQUEseUJBQUQsQ0FBMkIsS0FBM0IsRUFBa0MsR0FBbEMsRUFIWDs7VUFJQSxZQUFBLEdBQWUsSUFBQyxDQUFBLE1BQU0sQ0FBQyxpQkFBUixDQUEwQixNQUExQjtVQUNmLFNBQUEsR0FBWSxJQUFDLENBQUEsTUFBTSxDQUFDLFlBQVIsQ0FBQTtVQUNaLFdBQUEsR0FBa0IsSUFBQSxNQUFBLENBQU8sVUFBQSxHQUFXLFNBQVgsR0FBcUIsS0FBckIsR0FBeUIsQ0FBQyxJQUFJLENBQUMsS0FBTCxDQUFXLE1BQVgsQ0FBRCxDQUF6QixHQUE2QyxHQUFwRDtBQUNsQixlQUFXLDJEQUFYO1lBQ0UsSUFBQSxHQUFPLE1BQU0sQ0FBQyxVQUFQLENBQWtCLEdBQWxCO1lBQ1AsSUFBRyxZQUFBLGtEQUF3QyxDQUFBLENBQUEsQ0FBRSxDQUFDLGVBQTlDO2NBQ0UsTUFBTSxDQUFDLE1BQVAsQ0FBYyxDQUFDLEdBQUQsRUFBTSxZQUFOLENBQWQsRUFBbUMsa0JBQW5DLEVBREY7YUFBQSxNQUFBO2NBR0UsTUFBTSxDQUFDLGNBQVAsQ0FBc0IsQ0FBQyxDQUFDLEdBQUQsRUFBTSxDQUFOLENBQUQsRUFBVyxDQUFDLEdBQUQsRUFBTSxZQUFZLENBQUMsTUFBbkIsQ0FBWCxDQUF0QixFQUE4RCxZQUFBLEdBQWUsa0JBQTdFLEVBSEY7O0FBRkYsV0FkRjtTQWxDRjs7SUFWK0I7OzJCQW1FakMsT0FBQSxHQUFTLFNBQUE7QUFDUCxVQUFBO01BQUEsSUFBQyxDQUFBLFNBQUQsQ0FBQTtNQUNBLGVBQUEsR0FBa0I7QUFDbEIsV0FBa0IsaUZBQWxCO1FBQ0UsUUFBQSxHQUFXLENBQUEsNkVBQStELEVBQS9ELEVBQUMsa0JBQUQsRUFBVyxnQkFBWCxFQUFBLElBQUE7UUFDWCxJQUFnQixnQkFBaEI7QUFBQSxtQkFBQTs7UUFDQSxJQUFZLGVBQWdCLENBQUEsUUFBQSxDQUE1QjtBQUFBLG1CQUFBOztRQUVBLElBQUMsQ0FBQSxNQUFNLENBQUMsa0JBQVIsQ0FBMkIsUUFBM0IsRUFBcUMsTUFBckM7UUFDQSxlQUFnQixDQUFBLFFBQUEsQ0FBaEIsR0FBNEI7QUFOOUI7SUFITzs7MkJBYVQsU0FBQSxHQUFXLFNBQUE7YUFDVCxJQUFDLENBQUEsTUFBTSxDQUFDLFlBQVksQ0FBQyxlQUFyQixDQUFBO0lBRFM7OzJCQU1YLG9CQUFBLEdBQXNCLFNBQUMsV0FBRDtBQUNwQixVQUFBO01BQUEsSUFBQyxDQUFBLFNBQUQsQ0FBQTtNQUNBLGVBQUEsR0FBa0I7QUFDbEIsV0FBa0IsaUZBQWxCO1FBQ0UsUUFBQSxHQUFXLENBQUEsNkVBQStELEVBQS9ELEVBQUMsa0JBQUQsRUFBVyxnQkFBWCxFQUFBLElBQUE7UUFDWCxJQUFnQixnQkFBaEI7QUFBQSxtQkFBQTs7UUFDQSxJQUFZLGVBQWdCLENBQUEsUUFBQSxDQUE1QjtBQUFBLG1CQUFBOztRQUdBLElBQUcsSUFBQyxDQUFBLE1BQU0sQ0FBQyx1QkFBUixDQUFnQyxRQUFoQyxDQUFBLEtBQTZDLFdBQWhEO1VBQ0UsSUFBQyxDQUFBLE1BQU0sQ0FBQyxrQkFBUixDQUEyQixRQUEzQixFQUFxQyxNQUFyQztVQUNBLGVBQWdCLENBQUEsUUFBQSxDQUFoQixHQUE0QixLQUY5Qjs7QUFORjtJQUhvQjs7MkJBbUJ0QixhQUFBLEdBQWUsU0FBQyxTQUFEO0FBQ2IsVUFBQTtBQUFBLFdBQWtCLDhEQUFsQjtRQUNFLDZFQUErRCxFQUEvRCxFQUFDLGtCQUFELEVBQVc7UUFDWCxJQUFBLENBQUEsQ0FBZ0Isa0JBQUEsSUFBYyxDQUFBLFFBQUEsSUFBWSxTQUFaLElBQVksU0FBWixJQUF5QixNQUF6QixDQUE5QixDQUFBO0FBQUEsbUJBQUE7O1FBQ0EsSUFBQSxDQUFPLElBQUMsQ0FBQSxNQUFNLENBQUMsbUJBQVIsQ0FBNEIsUUFBNUIsQ0FBUDtBQUNFLGlCQUFPLElBQUMsQ0FBQSxNQUFNLENBQUMsa0JBQVIsQ0FBMkIsUUFBM0IsRUFBcUMsTUFBckMsRUFEVDs7QUFIRjtJQURhOzsyQkFhZiwwQkFBQSxHQUE0QixTQUFDLFNBQUQ7QUFDMUIsVUFBQTtNQUFBLFFBQUEsR0FBVyxJQUFDLENBQUEsNkJBQUQsQ0FBK0IsU0FBL0I7O1FBQ1gsV0FBWSxJQUFDLENBQUEsOEJBQUQsQ0FBZ0MsU0FBaEM7O2FBQ1o7SUFIMEI7OzJCQUs1Qiw2QkFBQSxHQUErQixTQUFDLFNBQUQ7QUFDN0IsVUFBQTtNQUFBLElBQUEsNkVBQStELENBQUUsU0FBbkQsQ0FBQSxXQUFkO0FBQUEsZUFBQTs7TUFFQSxRQUFBLEdBQVc7TUFDWCxNQUFBLEdBQVM7TUFFVCxJQUFHLFNBQUEsR0FBWSxDQUFmO0FBQ0UsYUFBa0IsbUVBQWxCO1VBQ0UsSUFBQSxnRkFBK0QsQ0FBRSxTQUFwRCxDQUFBLFdBQWI7QUFBQSxrQkFBQTs7VUFDQSxRQUFBLEdBQVc7QUFGYixTQURGOztNQUtBLElBQUcsU0FBQSxHQUFZLElBQUMsQ0FBQSxNQUFNLENBQUMsVUFBUixDQUFBLENBQWY7QUFDRSxhQUFrQixzR0FBbEI7VUFDRSxJQUFBLGdGQUErRCxDQUFFLFNBQXBELENBQUEsV0FBYjtBQUFBLGtCQUFBOztVQUNBLE1BQUEsR0FBUztBQUZYLFNBREY7O01BS0EsSUFBNkIsUUFBQSxLQUFjLE1BQTNDO0FBQUEsZUFBTyxDQUFDLFFBQUQsRUFBVyxNQUFYLEVBQVA7O0lBaEI2Qjs7MkJBa0IvQiw4QkFBQSxHQUFnQyxTQUFDLFNBQUQ7QUFDOUIsVUFBQTtNQUFBLElBQUEsQ0FBbUIsSUFBQyxDQUFBLHFCQUFELENBQXVCLFNBQXZCLENBQW5CO0FBQUEsZUFBTyxLQUFQOztNQUVBLGdCQUFBLEdBQW1CLElBQUMsQ0FBQSxNQUFNLENBQUMsdUJBQVIsQ0FBZ0MsU0FBaEM7TUFDbkIsZUFBQSxHQUFrQixJQUFDLENBQUEsTUFBTSxDQUFDLGdDQUFSLENBQXlDLENBQUMsU0FBRCxFQUFZLENBQVosQ0FBekM7QUFDbEIsV0FBVyw2RkFBWDtRQUNFLElBQVksSUFBQyxDQUFBLE1BQU0sQ0FBQyxnQkFBUixDQUF5QixHQUF6QixDQUFaO0FBQUEsbUJBQUE7O1FBQ0EsV0FBQSxHQUFjLElBQUMsQ0FBQSxNQUFNLENBQUMsdUJBQVIsQ0FBZ0MsR0FBaEM7UUFDZCxJQUFHLFdBQUEsSUFBZSxnQkFBbEI7VUFDRSxnQkFBQSxHQUFtQixXQUFBLEtBQWUsZ0JBQWYsaUZBQW9GLENBQUUsVUFBbEQsQ0FBNkQsSUFBQyxDQUFBLE1BQU0sQ0FBQyxvQkFBUixDQUE2QixHQUE3QixDQUE3RDtVQUN2RCxJQUFvQixnQkFBcEI7WUFBQSxVQUFBLEdBQWEsSUFBYjs7QUFDQSxnQkFIRjs7UUFLQSxVQUFBLEdBQWE7QUFSZjthQVVBLENBQUMsU0FBRCxFQUFZLFVBQVo7SUFmOEI7OzJCQWlCaEMscUJBQUEsR0FBdUIsU0FBQyxTQUFEO2FBQ3JCLElBQUMsQ0FBQSxNQUFNLENBQUMsZUFBZSxDQUFDLGVBQXhCLENBQXdDLFNBQXhDO0lBRHFCOzsyQkFLdkIsMEJBQUEsR0FBNEIsU0FBQyxTQUFEO0FBQzFCLFVBQUE7TUFBQSxJQUFBLENBQUEsQ0FBb0IsQ0FBQSxDQUFBLElBQUssU0FBTCxJQUFLLFNBQUwsSUFBa0IsSUFBQyxDQUFBLE1BQU0sQ0FBQyxnQkFBUixDQUFBLENBQWxCLENBQXBCLENBQUE7QUFBQSxlQUFPLE1BQVA7O3dJQUNpRTtJQUZ2Qzs7MkJBTzVCLCtCQUFBLEdBQWlDLFNBQUMsU0FBRDtBQUMvQixVQUFBO01BQUEsS0FBQSxHQUFRLElBQUMsQ0FBQSxNQUFNLENBQUMsZ0NBQVIsQ0FBeUMsQ0FBQyxTQUFELEVBQVksQ0FBWixDQUF6QztNQUNSLGNBQUEsR0FBaUIsSUFBQyxDQUFBLE1BQU0sQ0FBQyxpQkFBUixDQUEwQixLQUExQjtNQUNqQixpQkFBQSxHQUFvQjtNQUNwQixJQUFHLCtFQUFBLElBQTRDLHlDQUEvQztRQUNFLHVCQUFBLEdBQTBCLENBQUMsQ0FBQyxZQUFGLENBQWUsY0FBYyxDQUFDLGtCQUE5QixDQUFpRCxDQUFDLE9BQWxELENBQTBELFFBQTFELEVBQW9FLFNBQXBFO1FBQzFCLGlCQUFBLEdBQXdCLElBQUEsVUFBQSxDQUFXLFVBQUEsR0FBVyx1QkFBWCxHQUFtQyxHQUE5QyxFQUYxQjs7TUFJQSxrQkFBQSxHQUFxQixTQUFDLElBQUQ7QUFDbkIsWUFBQTtRQUFBLElBQUcseUJBQUg7VUFDRSxPQUFBLEdBQVUsaUJBQWlCLENBQUMsVUFBbEIsQ0FBNkIsSUFBN0I7VUFDVixzQkFBeUMsT0FBTyxDQUFFLGVBQWxEO1lBQUEsSUFBQSxHQUFPLElBQUksQ0FBQyxTQUFMLENBQWUsT0FBUSxDQUFBLENBQUEsQ0FBRSxDQUFDLEdBQTFCLEVBQVA7V0FGRjs7ZUFHQTtNQUptQjtNQU1yQixJQUFBLENBQWMsSUFBSSxDQUFDLElBQUwsQ0FBVSxrQkFBQSxDQUFtQixJQUFDLENBQUEsTUFBTSxDQUFDLG9CQUFSLENBQTZCLFNBQTdCLENBQW5CLENBQVYsQ0FBZDtBQUFBLGVBQUE7O01BRUEsSUFBRyxJQUFDLENBQUEsMEJBQUQsQ0FBNEIsU0FBNUIsQ0FBSDtRQUNFLG9CQUFBLEdBQXVCO1FBQ3ZCLEtBQUEsR0FBUSxJQUFDLENBQUEsNkJBQUQsQ0FBK0IsU0FBL0I7UUFDUixNQUFzQixLQUFBLElBQVMsQ0FBQyxTQUFELEVBQVksU0FBWixDQUEvQixFQUFDLGlCQUFELEVBQVcsaUJBSGI7T0FBQSxNQUFBO1FBS0Usb0JBQUEsR0FBdUI7UUFDdkIsT0FBc0IsQ0FBQyxDQUFELEVBQUksSUFBQyxDQUFBLE1BQU0sQ0FBQyxnQkFBUixDQUFBLENBQUEsR0FBMkIsQ0FBL0IsQ0FBdEIsRUFBQyxrQkFBRCxFQUFXLGtCQU5iOztNQVFBLFFBQUEsR0FBVztBQUNYLGFBQU0sUUFBQSxHQUFXLFFBQWpCO1FBQ0UsSUFBUyxJQUFDLENBQUEsMEJBQUQsQ0FBNEIsUUFBQSxHQUFXLENBQXZDLENBQUEsS0FBK0Msb0JBQXhEO0FBQUEsZ0JBQUE7O1FBQ0EsSUFBQSxDQUFhLElBQUksQ0FBQyxJQUFMLENBQVUsa0JBQUEsQ0FBbUIsSUFBQyxDQUFBLE1BQU0sQ0FBQyxvQkFBUixDQUE2QixRQUFBLEdBQVcsQ0FBeEMsQ0FBbkIsQ0FBVixDQUFiO0FBQUEsZ0JBQUE7O1FBQ0EsUUFBQTtNQUhGO01BS0EsTUFBQSxHQUFTO01BQ1QsT0FBQSxHQUFVLElBQUMsQ0FBQSxNQUFNLENBQUMsZ0JBQVIsQ0FBQTtBQUNWLGFBQU0sTUFBQSxHQUFTLE9BQWY7UUFDRSxJQUFTLElBQUMsQ0FBQSwwQkFBRCxDQUE0QixNQUFBLEdBQVMsQ0FBckMsQ0FBQSxLQUE2QyxvQkFBdEQ7QUFBQSxnQkFBQTs7UUFDQSxJQUFBLENBQWEsSUFBSSxDQUFDLElBQUwsQ0FBVSxrQkFBQSxDQUFtQixJQUFDLENBQUEsTUFBTSxDQUFDLG9CQUFSLENBQTZCLE1BQUEsR0FBUyxDQUF0QyxDQUFuQixDQUFWLENBQWI7QUFBQSxnQkFBQTs7UUFDQSxNQUFBO01BSEY7YUFLSSxJQUFBLEtBQUEsQ0FBTSxDQUFDLFFBQUQsRUFBVyxDQUFYLENBQU4sRUFBcUIsQ0FBQyxNQUFELEVBQVMsSUFBQyxDQUFBLE1BQU0sQ0FBQyxvQkFBUixDQUE2QixNQUE3QixDQUFvQyxDQUFDLE1BQTlDLENBQXJCO0lBckMyQjs7MkJBOENqQywyQkFBQSxHQUE2QixTQUFDLFNBQUQsRUFBWSxPQUFaO0FBQzNCLFVBQUE7TUFBQSxJQUFBLEdBQU8sSUFBQyxDQUFBLE1BQU0sQ0FBQyxVQUFSLENBQW1CLFNBQW5CO01BQ1AsYUFBQSxHQUFnQixJQUFDLENBQUEsTUFBTSxDQUFDLGVBQWUsQ0FBQyxtQkFBeEIsQ0FBNEMsU0FBNUM7YUFDaEIsSUFBQyxDQUFBLDBDQUFELENBQTRDLFNBQTVDLEVBQXVELElBQXZELEVBQTZELGFBQTdELEVBQTRFLE9BQTVFO0lBSDJCOzsyQkFLN0IsaUNBQUEsR0FBbUMsU0FBQyxTQUFELEVBQVksSUFBWixFQUFrQixPQUFsQjtBQUNqQyxVQUFBO01BQUEsYUFBQSxHQUFnQixJQUFDLENBQUEsTUFBTSxDQUFDLGVBQWUsQ0FBQyxnQ0FBeEIsQ0FBeUQsU0FBekQsRUFBb0UsSUFBcEU7YUFDaEIsSUFBQyxDQUFBLDBDQUFELENBQTRDLFNBQTVDLEVBQXVELElBQXZELEVBQTZELGFBQTdELEVBQTRFLE9BQTVFO0lBRmlDOzsyQkFJbkMsMENBQUEsR0FBNEMsU0FBQyxTQUFELEVBQVksSUFBWixFQUFrQixhQUFsQixFQUFpQyxPQUFqQztBQUMxQyxVQUFBO01BQUEsUUFBQSxHQUFXLGFBQWEsQ0FBQyxnQkFBZCxDQUFBO01BQ1gsUUFBUSxDQUFDLElBQVQsQ0FBQTtNQUNBLGVBQUEsR0FBc0IsSUFBQSxlQUFBLENBQWdCO1FBQUEsTUFBQSxFQUFRLFFBQVEsQ0FBQyxTQUFULENBQUEsQ0FBUjtPQUFoQjtNQUV0QixtQkFBQSxHQUFzQixJQUFDLENBQUEscUNBQUQsQ0FBdUMsZUFBdkM7TUFDdEIsbUJBQUEsR0FBc0IsSUFBQyxDQUFBLHFDQUFELENBQXVDLGVBQXZDO01BQ3RCLHVCQUFBLEdBQTBCLElBQUMsQ0FBQSx5Q0FBRCxDQUEyQyxlQUEzQztNQUUxQiw4RUFBNkIsSUFBN0I7UUFDRSxZQUFBLEdBQWUsSUFBQyxDQUFBLE1BQU0sQ0FBQyxtQkFBUixDQUE0QixTQUE1QjtRQUNmLElBQWdCLG9CQUFoQjtBQUFBLGlCQUFPLEVBQVA7U0FGRjtPQUFBLE1BQUE7UUFJRSxZQUFBLEdBQWUsU0FBQSxHQUFZO1FBQzNCLElBQVksWUFBQSxHQUFlLENBQTNCO0FBQUEsaUJBQU8sRUFBUDtTQUxGOztNQU9BLGtCQUFBLEdBQXFCLElBQUMsQ0FBQSxNQUFNLENBQUMsdUJBQVIsQ0FBZ0MsWUFBaEM7TUFDckIsSUFBQSxDQUFpQyxtQkFBakM7QUFBQSxlQUFPLG1CQUFQOztNQUVBLElBQUEsQ0FBTyxJQUFDLENBQUEsTUFBTSxDQUFDLG9CQUFSLENBQTZCLFlBQTdCLENBQVA7UUFDRSxhQUFBLEdBQWdCLElBQUMsQ0FBQSxNQUFNLENBQUMsVUFBUixDQUFtQixZQUFuQjtRQUNoQixrQ0FBMkIsbUJBQW1CLENBQUUsUUFBckIsQ0FBOEIsYUFBOUIsVUFBM0I7VUFBQSxrQkFBQSxJQUFzQixFQUF0Qjs7UUFDQSxzQ0FBMkIsdUJBQXVCLENBQUUsUUFBekIsQ0FBa0MsYUFBbEMsVUFBM0I7VUFBQSxrQkFBQSxJQUFzQixFQUF0QjtTQUhGOztNQUtBLElBQUEsQ0FBTyxJQUFDLENBQUEsTUFBTSxDQUFDLFVBQVIsQ0FBbUIsWUFBbkIsQ0FBUDtRQUNFLGtDQUEyQixtQkFBbUIsQ0FBRSxRQUFyQixDQUE4QixJQUE5QixVQUEzQjtVQUFBLGtCQUFBLElBQXNCLEVBQXRCO1NBREY7O2FBR0EsSUFBSSxDQUFDLEdBQUwsQ0FBUyxrQkFBVCxFQUE2QixDQUE3QjtJQTNCMEM7OzJCQW1DNUMseUJBQUEsR0FBMkIsU0FBQyxRQUFELEVBQVcsTUFBWDtBQUN6QixVQUFBO01BQUEsT0FBQTs7QUFBVzthQUFnRCxnRUFBaEQ7Y0FBNkUsQ0FBSSxJQUFDLENBQUEsTUFBTSxDQUFDLGdCQUFSLENBQXlCLEdBQXpCO3lCQUFqRixJQUFDLENBQUEsTUFBTSxDQUFDLHVCQUFSLENBQWdDLEdBQWhDOztBQUFBOzs7TUFDWCxJQUFBLENBQXFCLE9BQU8sQ0FBQyxNQUE3QjtRQUFBLE9BQUEsR0FBVSxDQUFDLENBQUQsRUFBVjs7YUFDQSxJQUFJLENBQUMsR0FBTCxhQUFTLE9BQVQ7SUFIeUI7OzJCQVMzQixvQkFBQSxHQUFzQixTQUFDLFFBQUQsRUFBVyxNQUFYO0FBQ3BCLFVBQUE7QUFBQSxXQUFxQyxnRUFBckM7UUFBQSxJQUFDLENBQUEsbUJBQUQsQ0FBcUIsR0FBckI7QUFBQTtJQURvQjs7MkJBUXRCLG1CQUFBLEdBQXFCLFNBQUMsU0FBRCxFQUFZLE9BQVo7QUFDbkIsVUFBQTtNQUFBLFdBQUEsR0FBYyxJQUFDLENBQUEsMkJBQUQsQ0FBNkIsU0FBN0IsRUFBd0MsT0FBeEM7YUFDZCxJQUFDLENBQUEsTUFBTSxDQUFDLDBCQUFSLENBQW1DLFNBQW5DLEVBQThDLFdBQTlDLEVBQTJELE9BQTNEO0lBRm1COzsyQkFPckIsOEJBQUEsR0FBZ0MsU0FBQyxTQUFEO0FBQzlCLFVBQUE7TUFBQSxlQUFBLEdBQWtCLElBQUMsQ0FBQSxNQUFNLENBQUMsZ0NBQVIsQ0FBeUMsQ0FBQyxTQUFELEVBQVksQ0FBWixDQUF6QztNQUNsQixJQUFBLENBQWMsQ0FBQSxtQkFBQSxHQUFzQixJQUFDLENBQUEscUNBQUQsQ0FBdUMsZUFBdkMsQ0FBdEIsQ0FBZDtBQUFBLGVBQUE7O01BRUEsSUFBQSxHQUFPLElBQUMsQ0FBQSxNQUFNLENBQUMsVUFBUixDQUFtQixTQUFuQjtNQUNQLElBQUEsQ0FBYyxtQkFBbUIsQ0FBQyxRQUFwQixDQUE2QixJQUE3QixDQUFkO0FBQUEsZUFBQTs7TUFFQSxrQkFBQSxHQUFxQixJQUFDLENBQUEsTUFBTSxDQUFDLHVCQUFSLENBQWdDLFNBQWhDO01BQ3JCLElBQVUsa0JBQUEsS0FBc0IsQ0FBaEM7QUFBQSxlQUFBOztNQUVBLFlBQUEsR0FBZSxJQUFDLENBQUEsTUFBTSxDQUFDLG1CQUFSLENBQTRCLFNBQTVCO01BQ2YsSUFBYyxvQkFBZDtBQUFBLGVBQUE7O01BRUEsYUFBQSxHQUFnQixJQUFDLENBQUEsTUFBTSxDQUFDLFVBQVIsQ0FBbUIsWUFBbkI7TUFDaEIsa0JBQUEsR0FBcUIsSUFBQyxDQUFBLE1BQU0sQ0FBQyx1QkFBUixDQUFnQyxZQUFoQztNQUVyQixJQUFHLG1CQUFBLEdBQXNCLElBQUMsQ0FBQSxxQ0FBRCxDQUF1QyxlQUF2QyxDQUF6QjtRQUNFLElBQUEsQ0FBK0IsbUJBQW1CLENBQUMsUUFBcEIsQ0FBNkIsYUFBN0IsQ0FBL0I7VUFBQSxrQkFBQSxJQUFzQixFQUF0QjtTQURGOztNQUdBLElBQUcsdUJBQUEsR0FBMEIsSUFBQyxDQUFBLHlDQUFELENBQTJDLGVBQTNDLENBQTdCO1FBQ0UsSUFBMkIsdUJBQXVCLENBQUMsUUFBeEIsQ0FBaUMsYUFBakMsQ0FBM0I7VUFBQSxrQkFBQSxJQUFzQixFQUF0QjtTQURGOztNQUdBLElBQUcsa0JBQUEsSUFBc0IsQ0FBdEIsSUFBNEIsa0JBQUEsR0FBcUIsa0JBQXBEO2VBQ0UsSUFBQyxDQUFBLE1BQU0sQ0FBQywwQkFBUixDQUFtQyxTQUFuQyxFQUE4QyxrQkFBOUMsRUFERjs7SUF0QjhCOzsyQkF5QmhDLFVBQUEsR0FBWSxTQUFDLE9BQUQ7QUFDVixVQUFBO01BQUEsSUFBRyxPQUFIO3FFQUNvQixDQUFBLE9BQUEsUUFBQSxDQUFBLE9BQUEsSUFBZ0IsSUFBQSxVQUFBLENBQVcsT0FBWCxFQURwQzs7SUFEVTs7MkJBSVoscUNBQUEsR0FBdUMsU0FBQyxlQUFEO2FBQ3JDLElBQUMsQ0FBQSxVQUFELENBQVksSUFBQyxDQUFBLE1BQU0sQ0FBQyx3QkFBUixDQUFpQyxlQUFqQyxDQUFaO0lBRHFDOzsyQkFHdkMscUNBQUEsR0FBdUMsU0FBQyxlQUFEO2FBQ3JDLElBQUMsQ0FBQSxVQUFELENBQVksSUFBQyxDQUFBLE1BQU0sQ0FBQyx3QkFBUixDQUFpQyxlQUFqQyxDQUFaO0lBRHFDOzsyQkFHdkMseUNBQUEsR0FBMkMsU0FBQyxlQUFEO2FBQ3pDLElBQUMsQ0FBQSxVQUFELENBQVksSUFBQyxDQUFBLE1BQU0sQ0FBQyw0QkFBUixDQUFxQyxlQUFyQyxDQUFaO0lBRHlDOzsyQkFHM0MsOEJBQUEsR0FBZ0MsU0FBQyxlQUFEO2FBQzlCLElBQUMsQ0FBQSxVQUFELENBQVksSUFBQyxDQUFBLE1BQU0sQ0FBQyxpQkFBUixDQUEwQixlQUExQixDQUFaO0lBRDhCOzs7OztBQTVWbEMiLCJzb3VyY2VzQ29udGVudCI6WyJ7UmFuZ2V9ID0gcmVxdWlyZSAndGV4dC1idWZmZXInXG5fID0gcmVxdWlyZSAndW5kZXJzY29yZS1wbHVzJ1xue09uaWdSZWdFeHB9ID0gcmVxdWlyZSAnb25pZ3VydW1hJ1xuU2NvcGVEZXNjcmlwdG9yID0gcmVxdWlyZSAnLi9zY29wZS1kZXNjcmlwdG9yJ1xuTnVsbEdyYW1tYXIgPSByZXF1aXJlICcuL251bGwtZ3JhbW1hcidcblxubW9kdWxlLmV4cG9ydHMgPVxuY2xhc3MgTGFuZ3VhZ2VNb2RlXG4gICMgU2V0cyB1cCBhIGBMYW5ndWFnZU1vZGVgIGZvciB0aGUgZ2l2ZW4ge1RleHRFZGl0b3J9LlxuICAjXG4gICMgZWRpdG9yIC0gVGhlIHtUZXh0RWRpdG9yfSB0byBhc3NvY2lhdGUgd2l0aFxuICBjb25zdHJ1Y3RvcjogKEBlZGl0b3IpIC0+XG4gICAge0BidWZmZXJ9ID0gQGVkaXRvclxuICAgIEByZWdleGVzQnlQYXR0ZXJuID0ge31cblxuICBkZXN0cm95OiAtPlxuXG4gIHRvZ2dsZUxpbmVDb21tZW50Rm9yQnVmZmVyUm93OiAocm93KSAtPlxuICAgIEB0b2dnbGVMaW5lQ29tbWVudHNGb3JCdWZmZXJSb3dzKHJvdywgcm93KVxuXG4gICMgV3JhcHMgdGhlIGxpbmVzIGJldHdlZW4gdHdvIHJvd3MgaW4gY29tbWVudHMuXG4gICNcbiAgIyBJZiB0aGUgbGFuZ3VhZ2UgZG9lc24ndCBoYXZlIGNvbW1lbnQsIG5vdGhpbmcgaGFwcGVucy5cbiAgI1xuICAjIHN0YXJ0Um93IC0gVGhlIHJvdyB7TnVtYmVyfSB0byBzdGFydCBhdFxuICAjIGVuZFJvdyAtIFRoZSByb3cge051bWJlcn0gdG8gZW5kIGF0XG4gIHRvZ2dsZUxpbmVDb21tZW50c0ZvckJ1ZmZlclJvd3M6IChzdGFydCwgZW5kKSAtPlxuICAgIHNjb3BlID0gQGVkaXRvci5zY29wZURlc2NyaXB0b3JGb3JCdWZmZXJQb3NpdGlvbihbc3RhcnQsIDBdKVxuICAgIGNvbW1lbnRTdHJpbmdzID0gQGVkaXRvci5nZXRDb21tZW50U3RyaW5ncyhzY29wZSlcbiAgICByZXR1cm4gdW5sZXNzIGNvbW1lbnRTdHJpbmdzPy5jb21tZW50U3RhcnRTdHJpbmdcbiAgICB7Y29tbWVudFN0YXJ0U3RyaW5nLCBjb21tZW50RW5kU3RyaW5nfSA9IGNvbW1lbnRTdHJpbmdzXG5cbiAgICBidWZmZXIgPSBAZWRpdG9yLmJ1ZmZlclxuICAgIGNvbW1lbnRTdGFydFJlZ2V4U3RyaW5nID0gXy5lc2NhcGVSZWdFeHAoY29tbWVudFN0YXJ0U3RyaW5nKS5yZXBsYWNlKC8oXFxzKykkLywgJyg/OiQxKT8nKVxuICAgIGNvbW1lbnRTdGFydFJlZ2V4ID0gbmV3IE9uaWdSZWdFeHAoXCJeKFxcXFxzKikoI3tjb21tZW50U3RhcnRSZWdleFN0cmluZ30pXCIpXG5cbiAgICBpZiBjb21tZW50RW5kU3RyaW5nXG4gICAgICBzaG91bGRVbmNvbW1lbnQgPSBjb21tZW50U3RhcnRSZWdleC50ZXN0U3luYyhidWZmZXIubGluZUZvclJvdyhzdGFydCkpXG4gICAgICBpZiBzaG91bGRVbmNvbW1lbnRcbiAgICAgICAgY29tbWVudEVuZFJlZ2V4U3RyaW5nID0gXy5lc2NhcGVSZWdFeHAoY29tbWVudEVuZFN0cmluZykucmVwbGFjZSgvXihcXHMrKS8sICcoPzokMSk/JylcbiAgICAgICAgY29tbWVudEVuZFJlZ2V4ID0gbmV3IE9uaWdSZWdFeHAoXCIoI3tjb21tZW50RW5kUmVnZXhTdHJpbmd9KShcXFxccyopJFwiKVxuICAgICAgICBzdGFydE1hdGNoID0gIGNvbW1lbnRTdGFydFJlZ2V4LnNlYXJjaFN5bmMoYnVmZmVyLmxpbmVGb3JSb3coc3RhcnQpKVxuICAgICAgICBlbmRNYXRjaCA9IGNvbW1lbnRFbmRSZWdleC5zZWFyY2hTeW5jKGJ1ZmZlci5saW5lRm9yUm93KGVuZCkpXG4gICAgICAgIGlmIHN0YXJ0TWF0Y2ggYW5kIGVuZE1hdGNoXG4gICAgICAgICAgYnVmZmVyLnRyYW5zYWN0IC0+XG4gICAgICAgICAgICBjb2x1bW5TdGFydCA9IHN0YXJ0TWF0Y2hbMV0ubGVuZ3RoXG4gICAgICAgICAgICBjb2x1bW5FbmQgPSBjb2x1bW5TdGFydCArIHN0YXJ0TWF0Y2hbMl0ubGVuZ3RoXG4gICAgICAgICAgICBidWZmZXIuc2V0VGV4dEluUmFuZ2UoW1tzdGFydCwgY29sdW1uU3RhcnRdLCBbc3RhcnQsIGNvbHVtbkVuZF1dLCBcIlwiKVxuXG4gICAgICAgICAgICBlbmRMZW5ndGggPSBidWZmZXIubGluZUxlbmd0aEZvclJvdyhlbmQpIC0gZW5kTWF0Y2hbMl0ubGVuZ3RoXG4gICAgICAgICAgICBlbmRDb2x1bW4gPSBlbmRMZW5ndGggLSBlbmRNYXRjaFsxXS5sZW5ndGhcbiAgICAgICAgICAgIGJ1ZmZlci5zZXRUZXh0SW5SYW5nZShbW2VuZCwgZW5kQ29sdW1uXSwgW2VuZCwgZW5kTGVuZ3RoXV0sIFwiXCIpXG4gICAgICBlbHNlXG4gICAgICAgIGJ1ZmZlci50cmFuc2FjdCAtPlxuICAgICAgICAgIGluZGVudExlbmd0aCA9IGJ1ZmZlci5saW5lRm9yUm93KHN0YXJ0KS5tYXRjaCgvXlxccyovKT9bMF0ubGVuZ3RoID8gMFxuICAgICAgICAgIGJ1ZmZlci5pbnNlcnQoW3N0YXJ0LCBpbmRlbnRMZW5ndGhdLCBjb21tZW50U3RhcnRTdHJpbmcpXG4gICAgICAgICAgYnVmZmVyLmluc2VydChbZW5kLCBidWZmZXIubGluZUxlbmd0aEZvclJvdyhlbmQpXSwgY29tbWVudEVuZFN0cmluZylcbiAgICBlbHNlXG4gICAgICBhbGxCbGFuayA9IHRydWVcbiAgICAgIGFsbEJsYW5rT3JDb21tZW50ZWQgPSB0cnVlXG5cbiAgICAgIGZvciByb3cgaW4gW3N0YXJ0Li5lbmRdIGJ5IDFcbiAgICAgICAgbGluZSA9IGJ1ZmZlci5saW5lRm9yUm93KHJvdylcbiAgICAgICAgYmxhbmsgPSBsaW5lPy5tYXRjaCgvXlxccyokLylcblxuICAgICAgICBhbGxCbGFuayA9IGZhbHNlIHVubGVzcyBibGFua1xuICAgICAgICBhbGxCbGFua09yQ29tbWVudGVkID0gZmFsc2UgdW5sZXNzIGJsYW5rIG9yIGNvbW1lbnRTdGFydFJlZ2V4LnRlc3RTeW5jKGxpbmUpXG5cbiAgICAgIHNob3VsZFVuY29tbWVudCA9IGFsbEJsYW5rT3JDb21tZW50ZWQgYW5kIG5vdCBhbGxCbGFua1xuXG4gICAgICBpZiBzaG91bGRVbmNvbW1lbnRcbiAgICAgICAgZm9yIHJvdyBpbiBbc3RhcnQuLmVuZF0gYnkgMVxuICAgICAgICAgIGlmIG1hdGNoID0gY29tbWVudFN0YXJ0UmVnZXguc2VhcmNoU3luYyhidWZmZXIubGluZUZvclJvdyhyb3cpKVxuICAgICAgICAgICAgY29sdW1uU3RhcnQgPSBtYXRjaFsxXS5sZW5ndGhcbiAgICAgICAgICAgIGNvbHVtbkVuZCA9IGNvbHVtblN0YXJ0ICsgbWF0Y2hbMl0ubGVuZ3RoXG4gICAgICAgICAgICBidWZmZXIuc2V0VGV4dEluUmFuZ2UoW1tyb3csIGNvbHVtblN0YXJ0XSwgW3JvdywgY29sdW1uRW5kXV0sIFwiXCIpXG4gICAgICBlbHNlXG4gICAgICAgIGlmIHN0YXJ0IGlzIGVuZFxuICAgICAgICAgIGluZGVudCA9IEBlZGl0b3IuaW5kZW50YXRpb25Gb3JCdWZmZXJSb3coc3RhcnQpXG4gICAgICAgIGVsc2VcbiAgICAgICAgICBpbmRlbnQgPSBAbWluSW5kZW50TGV2ZWxGb3JSb3dSYW5nZShzdGFydCwgZW5kKVxuICAgICAgICBpbmRlbnRTdHJpbmcgPSBAZWRpdG9yLmJ1aWxkSW5kZW50U3RyaW5nKGluZGVudClcbiAgICAgICAgdGFiTGVuZ3RoID0gQGVkaXRvci5nZXRUYWJMZW5ndGgoKVxuICAgICAgICBpbmRlbnRSZWdleCA9IG5ldyBSZWdFeHAoXCIoXFx0fFsgXXsje3RhYkxlbmd0aH19KXsje01hdGguZmxvb3IoaW5kZW50KX19XCIpXG4gICAgICAgIGZvciByb3cgaW4gW3N0YXJ0Li5lbmRdIGJ5IDFcbiAgICAgICAgICBsaW5lID0gYnVmZmVyLmxpbmVGb3JSb3cocm93KVxuICAgICAgICAgIGlmIGluZGVudExlbmd0aCA9IGxpbmUubWF0Y2goaW5kZW50UmVnZXgpP1swXS5sZW5ndGhcbiAgICAgICAgICAgIGJ1ZmZlci5pbnNlcnQoW3JvdywgaW5kZW50TGVuZ3RoXSwgY29tbWVudFN0YXJ0U3RyaW5nKVxuICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgIGJ1ZmZlci5zZXRUZXh0SW5SYW5nZShbW3JvdywgMF0sIFtyb3csIGluZGVudFN0cmluZy5sZW5ndGhdXSwgaW5kZW50U3RyaW5nICsgY29tbWVudFN0YXJ0U3RyaW5nKVxuICAgIHJldHVyblxuXG4gICMgRm9sZHMgYWxsIHRoZSBmb2xkYWJsZSBsaW5lcyBpbiB0aGUgYnVmZmVyLlxuICBmb2xkQWxsOiAtPlxuICAgIEB1bmZvbGRBbGwoKVxuICAgIGZvbGRlZFJvd1JhbmdlcyA9IHt9XG4gICAgZm9yIGN1cnJlbnRSb3cgaW4gWzAuLkBidWZmZXIuZ2V0TGFzdFJvdygpXSBieSAxXG4gICAgICByb3dSYW5nZSA9IFtzdGFydFJvdywgZW5kUm93XSA9IEByb3dSYW5nZUZvckZvbGRBdEJ1ZmZlclJvdyhjdXJyZW50Um93KSA/IFtdXG4gICAgICBjb250aW51ZSB1bmxlc3Mgc3RhcnRSb3c/XG4gICAgICBjb250aW51ZSBpZiBmb2xkZWRSb3dSYW5nZXNbcm93UmFuZ2VdXG5cbiAgICAgIEBlZGl0b3IuZm9sZEJ1ZmZlclJvd1JhbmdlKHN0YXJ0Um93LCBlbmRSb3cpXG4gICAgICBmb2xkZWRSb3dSYW5nZXNbcm93UmFuZ2VdID0gdHJ1ZVxuICAgIHJldHVyblxuXG4gICMgVW5mb2xkcyBhbGwgdGhlIGZvbGRhYmxlIGxpbmVzIGluIHRoZSBidWZmZXIuXG4gIHVuZm9sZEFsbDogLT5cbiAgICBAZWRpdG9yLmRpc3BsYXlMYXllci5kZXN0cm95QWxsRm9sZHMoKVxuXG4gICMgRm9sZCBhbGwgY29tbWVudCBhbmQgY29kZSBibG9ja3MgYXQgYSBnaXZlbiBpbmRlbnRMZXZlbFxuICAjXG4gICMgaW5kZW50TGV2ZWwgLSBBIHtOdW1iZXJ9IGluZGljYXRpbmcgaW5kZW50TGV2ZWw7IDAgYmFzZWQuXG4gIGZvbGRBbGxBdEluZGVudExldmVsOiAoaW5kZW50TGV2ZWwpIC0+XG4gICAgQHVuZm9sZEFsbCgpXG4gICAgZm9sZGVkUm93UmFuZ2VzID0ge31cbiAgICBmb3IgY3VycmVudFJvdyBpbiBbMC4uQGJ1ZmZlci5nZXRMYXN0Um93KCldIGJ5IDFcbiAgICAgIHJvd1JhbmdlID0gW3N0YXJ0Um93LCBlbmRSb3ddID0gQHJvd1JhbmdlRm9yRm9sZEF0QnVmZmVyUm93KGN1cnJlbnRSb3cpID8gW11cbiAgICAgIGNvbnRpbnVlIHVubGVzcyBzdGFydFJvdz9cbiAgICAgIGNvbnRpbnVlIGlmIGZvbGRlZFJvd1Jhbmdlc1tyb3dSYW5nZV1cblxuICAgICAgIyBhc3N1bXB0aW9uOiBzdGFydFJvdyB3aWxsIGFsd2F5cyBiZSB0aGUgbWluIGluZGVudCBsZXZlbCBmb3IgdGhlIGVudGlyZSByYW5nZVxuICAgICAgaWYgQGVkaXRvci5pbmRlbnRhdGlvbkZvckJ1ZmZlclJvdyhzdGFydFJvdykgaXMgaW5kZW50TGV2ZWxcbiAgICAgICAgQGVkaXRvci5mb2xkQnVmZmVyUm93UmFuZ2Uoc3RhcnRSb3csIGVuZFJvdylcbiAgICAgICAgZm9sZGVkUm93UmFuZ2VzW3Jvd1JhbmdlXSA9IHRydWVcbiAgICByZXR1cm5cblxuICAjIEdpdmVuIGEgYnVmZmVyIHJvdywgY3JlYXRlcyBhIGZvbGQgYXQgaXQuXG4gICNcbiAgIyBidWZmZXJSb3cgLSBBIHtOdW1iZXJ9IGluZGljYXRpbmcgdGhlIGJ1ZmZlciByb3dcbiAgI1xuICAjIFJldHVybnMgdGhlIG5ldyB7Rm9sZH0uXG4gIGZvbGRCdWZmZXJSb3c6IChidWZmZXJSb3cpIC0+XG4gICAgZm9yIGN1cnJlbnRSb3cgaW4gW2J1ZmZlclJvdy4uMF0gYnkgLTFcbiAgICAgIFtzdGFydFJvdywgZW5kUm93XSA9IEByb3dSYW5nZUZvckZvbGRBdEJ1ZmZlclJvdyhjdXJyZW50Um93KSA/IFtdXG4gICAgICBjb250aW51ZSB1bmxlc3Mgc3RhcnRSb3c/IGFuZCBzdGFydFJvdyA8PSBidWZmZXJSb3cgPD0gZW5kUm93XG4gICAgICB1bmxlc3MgQGVkaXRvci5pc0ZvbGRlZEF0QnVmZmVyUm93KHN0YXJ0Um93KVxuICAgICAgICByZXR1cm4gQGVkaXRvci5mb2xkQnVmZmVyUm93UmFuZ2Uoc3RhcnRSb3csIGVuZFJvdylcblxuICAjIEZpbmQgdGhlIHJvdyByYW5nZSBmb3IgYSBmb2xkIGF0IGEgZ2l2ZW4gYnVmZmVyUm93LiBXaWxsIGhhbmRsZSBjb21tZW50c1xuICAjIGFuZCBjb2RlLlxuICAjXG4gICMgYnVmZmVyUm93IC0gQSB7TnVtYmVyfSBpbmRpY2F0aW5nIHRoZSBidWZmZXIgcm93XG4gICNcbiAgIyBSZXR1cm5zIGFuIHtBcnJheX0gb2YgdGhlIFtzdGFydFJvdywgZW5kUm93XS4gUmV0dXJucyBudWxsIGlmIG5vIHJhbmdlLlxuICByb3dSYW5nZUZvckZvbGRBdEJ1ZmZlclJvdzogKGJ1ZmZlclJvdykgLT5cbiAgICByb3dSYW5nZSA9IEByb3dSYW5nZUZvckNvbW1lbnRBdEJ1ZmZlclJvdyhidWZmZXJSb3cpXG4gICAgcm93UmFuZ2UgPz0gQHJvd1JhbmdlRm9yQ29kZUZvbGRBdEJ1ZmZlclJvdyhidWZmZXJSb3cpXG4gICAgcm93UmFuZ2VcblxuICByb3dSYW5nZUZvckNvbW1lbnRBdEJ1ZmZlclJvdzogKGJ1ZmZlclJvdykgLT5cbiAgICByZXR1cm4gdW5sZXNzIEBlZGl0b3IudG9rZW5pemVkQnVmZmVyLnRva2VuaXplZExpbmVzW2J1ZmZlclJvd10/LmlzQ29tbWVudCgpXG5cbiAgICBzdGFydFJvdyA9IGJ1ZmZlclJvd1xuICAgIGVuZFJvdyA9IGJ1ZmZlclJvd1xuXG4gICAgaWYgYnVmZmVyUm93ID4gMFxuICAgICAgZm9yIGN1cnJlbnRSb3cgaW4gW2J1ZmZlclJvdy0xLi4wXSBieSAtMVxuICAgICAgICBicmVhayB1bmxlc3MgQGVkaXRvci50b2tlbml6ZWRCdWZmZXIudG9rZW5pemVkTGluZXNbY3VycmVudFJvd10/LmlzQ29tbWVudCgpXG4gICAgICAgIHN0YXJ0Um93ID0gY3VycmVudFJvd1xuXG4gICAgaWYgYnVmZmVyUm93IDwgQGJ1ZmZlci5nZXRMYXN0Um93KClcbiAgICAgIGZvciBjdXJyZW50Um93IGluIFtidWZmZXJSb3crMS4uQGJ1ZmZlci5nZXRMYXN0Um93KCldIGJ5IDFcbiAgICAgICAgYnJlYWsgdW5sZXNzIEBlZGl0b3IudG9rZW5pemVkQnVmZmVyLnRva2VuaXplZExpbmVzW2N1cnJlbnRSb3ddPy5pc0NvbW1lbnQoKVxuICAgICAgICBlbmRSb3cgPSBjdXJyZW50Um93XG5cbiAgICByZXR1cm4gW3N0YXJ0Um93LCBlbmRSb3ddIGlmIHN0YXJ0Um93IGlzbnQgZW5kUm93XG5cbiAgcm93UmFuZ2VGb3JDb2RlRm9sZEF0QnVmZmVyUm93OiAoYnVmZmVyUm93KSAtPlxuICAgIHJldHVybiBudWxsIHVubGVzcyBAaXNGb2xkYWJsZUF0QnVmZmVyUm93KGJ1ZmZlclJvdylcblxuICAgIHN0YXJ0SW5kZW50TGV2ZWwgPSBAZWRpdG9yLmluZGVudGF0aW9uRm9yQnVmZmVyUm93KGJ1ZmZlclJvdylcbiAgICBzY29wZURlc2NyaXB0b3IgPSBAZWRpdG9yLnNjb3BlRGVzY3JpcHRvckZvckJ1ZmZlclBvc2l0aW9uKFtidWZmZXJSb3csIDBdKVxuICAgIGZvciByb3cgaW4gWyhidWZmZXJSb3cgKyAxKS4uQGVkaXRvci5nZXRMYXN0QnVmZmVyUm93KCldIGJ5IDFcbiAgICAgIGNvbnRpbnVlIGlmIEBlZGl0b3IuaXNCdWZmZXJSb3dCbGFuayhyb3cpXG4gICAgICBpbmRlbnRhdGlvbiA9IEBlZGl0b3IuaW5kZW50YXRpb25Gb3JCdWZmZXJSb3cocm93KVxuICAgICAgaWYgaW5kZW50YXRpb24gPD0gc3RhcnRJbmRlbnRMZXZlbFxuICAgICAgICBpbmNsdWRlUm93SW5Gb2xkID0gaW5kZW50YXRpb24gaXMgc3RhcnRJbmRlbnRMZXZlbCBhbmQgQGZvbGRFbmRSZWdleEZvclNjb3BlRGVzY3JpcHRvcihzY29wZURlc2NyaXB0b3IpPy5zZWFyY2hTeW5jKEBlZGl0b3IubGluZVRleHRGb3JCdWZmZXJSb3cocm93KSlcbiAgICAgICAgZm9sZEVuZFJvdyA9IHJvdyBpZiBpbmNsdWRlUm93SW5Gb2xkXG4gICAgICAgIGJyZWFrXG5cbiAgICAgIGZvbGRFbmRSb3cgPSByb3dcblxuICAgIFtidWZmZXJSb3csIGZvbGRFbmRSb3ddXG5cbiAgaXNGb2xkYWJsZUF0QnVmZmVyUm93OiAoYnVmZmVyUm93KSAtPlxuICAgIEBlZGl0b3IudG9rZW5pemVkQnVmZmVyLmlzRm9sZGFibGVBdFJvdyhidWZmZXJSb3cpXG5cbiAgIyBSZXR1cm5zIGEge0Jvb2xlYW59IGluZGljYXRpbmcgd2hldGhlciB0aGUgbGluZSBhdCB0aGUgZ2l2ZW4gYnVmZmVyXG4gICMgcm93IGlzIGEgY29tbWVudC5cbiAgaXNMaW5lQ29tbWVudGVkQXRCdWZmZXJSb3c6IChidWZmZXJSb3cpIC0+XG4gICAgcmV0dXJuIGZhbHNlIHVubGVzcyAwIDw9IGJ1ZmZlclJvdyA8PSBAZWRpdG9yLmdldExhc3RCdWZmZXJSb3coKVxuICAgIEBlZGl0b3IudG9rZW5pemVkQnVmZmVyLnRva2VuaXplZExpbmVzW2J1ZmZlclJvd10/LmlzQ29tbWVudCgpID8gZmFsc2VcblxuICAjIEZpbmQgYSByb3cgcmFuZ2UgZm9yIGEgJ3BhcmFncmFwaCcgYXJvdW5kIHNwZWNpZmllZCBidWZmZXJSb3cuIEEgcGFyYWdyYXBoXG4gICMgaXMgYSBibG9jayBvZiB0ZXh0IGJvdW5kZWQgYnkgYW5kIGVtcHR5IGxpbmUgb3IgYSBibG9jayBvZiB0ZXh0IHRoYXQgaXMgbm90XG4gICMgdGhlIHNhbWUgdHlwZSAoY29tbWVudHMgbmV4dCB0byBzb3VyY2UgY29kZSkuXG4gIHJvd1JhbmdlRm9yUGFyYWdyYXBoQXRCdWZmZXJSb3c6IChidWZmZXJSb3cpIC0+XG4gICAgc2NvcGUgPSBAZWRpdG9yLnNjb3BlRGVzY3JpcHRvckZvckJ1ZmZlclBvc2l0aW9uKFtidWZmZXJSb3csIDBdKVxuICAgIGNvbW1lbnRTdHJpbmdzID0gQGVkaXRvci5nZXRDb21tZW50U3RyaW5ncyhzY29wZSlcbiAgICBjb21tZW50U3RhcnRSZWdleCA9IG51bGxcbiAgICBpZiBjb21tZW50U3RyaW5ncz8uY29tbWVudFN0YXJ0U3RyaW5nPyBhbmQgbm90IGNvbW1lbnRTdHJpbmdzLmNvbW1lbnRFbmRTdHJpbmc/XG4gICAgICBjb21tZW50U3RhcnRSZWdleFN0cmluZyA9IF8uZXNjYXBlUmVnRXhwKGNvbW1lbnRTdHJpbmdzLmNvbW1lbnRTdGFydFN0cmluZykucmVwbGFjZSgvKFxccyspJC8sICcoPzokMSk/JylcbiAgICAgIGNvbW1lbnRTdGFydFJlZ2V4ID0gbmV3IE9uaWdSZWdFeHAoXCJeKFxcXFxzKikoI3tjb21tZW50U3RhcnRSZWdleFN0cmluZ30pXCIpXG5cbiAgICBmaWx0ZXJDb21tZW50U3RhcnQgPSAobGluZSkgLT5cbiAgICAgIGlmIGNvbW1lbnRTdGFydFJlZ2V4P1xuICAgICAgICBtYXRjaGVzID0gY29tbWVudFN0YXJ0UmVnZXguc2VhcmNoU3luYyhsaW5lKVxuICAgICAgICBsaW5lID0gbGluZS5zdWJzdHJpbmcobWF0Y2hlc1swXS5lbmQpIGlmIG1hdGNoZXM/Lmxlbmd0aFxuICAgICAgbGluZVxuXG4gICAgcmV0dXJuIHVubGVzcyAvXFxTLy50ZXN0KGZpbHRlckNvbW1lbnRTdGFydChAZWRpdG9yLmxpbmVUZXh0Rm9yQnVmZmVyUm93KGJ1ZmZlclJvdykpKVxuXG4gICAgaWYgQGlzTGluZUNvbW1lbnRlZEF0QnVmZmVyUm93KGJ1ZmZlclJvdylcbiAgICAgIGlzT3JpZ2luYWxSb3dDb21tZW50ID0gdHJ1ZVxuICAgICAgcmFuZ2UgPSBAcm93UmFuZ2VGb3JDb21tZW50QXRCdWZmZXJSb3coYnVmZmVyUm93KVxuICAgICAgW2ZpcnN0Um93LCBsYXN0Um93XSA9IHJhbmdlIG9yIFtidWZmZXJSb3csIGJ1ZmZlclJvd11cbiAgICBlbHNlXG4gICAgICBpc09yaWdpbmFsUm93Q29tbWVudCA9IGZhbHNlXG4gICAgICBbZmlyc3RSb3csIGxhc3RSb3ddID0gWzAsIEBlZGl0b3IuZ2V0TGFzdEJ1ZmZlclJvdygpLTFdXG5cbiAgICBzdGFydFJvdyA9IGJ1ZmZlclJvd1xuICAgIHdoaWxlIHN0YXJ0Um93ID4gZmlyc3RSb3dcbiAgICAgIGJyZWFrIGlmIEBpc0xpbmVDb21tZW50ZWRBdEJ1ZmZlclJvdyhzdGFydFJvdyAtIDEpIGlzbnQgaXNPcmlnaW5hbFJvd0NvbW1lbnRcbiAgICAgIGJyZWFrIHVubGVzcyAvXFxTLy50ZXN0KGZpbHRlckNvbW1lbnRTdGFydChAZWRpdG9yLmxpbmVUZXh0Rm9yQnVmZmVyUm93KHN0YXJ0Um93IC0gMSkpKVxuICAgICAgc3RhcnRSb3ctLVxuXG4gICAgZW5kUm93ID0gYnVmZmVyUm93XG4gICAgbGFzdFJvdyA9IEBlZGl0b3IuZ2V0TGFzdEJ1ZmZlclJvdygpXG4gICAgd2hpbGUgZW5kUm93IDwgbGFzdFJvd1xuICAgICAgYnJlYWsgaWYgQGlzTGluZUNvbW1lbnRlZEF0QnVmZmVyUm93KGVuZFJvdyArIDEpIGlzbnQgaXNPcmlnaW5hbFJvd0NvbW1lbnRcbiAgICAgIGJyZWFrIHVubGVzcyAvXFxTLy50ZXN0KGZpbHRlckNvbW1lbnRTdGFydChAZWRpdG9yLmxpbmVUZXh0Rm9yQnVmZmVyUm93KGVuZFJvdyArIDEpKSlcbiAgICAgIGVuZFJvdysrXG5cbiAgICBuZXcgUmFuZ2UoW3N0YXJ0Um93LCAwXSwgW2VuZFJvdywgQGVkaXRvci5saW5lVGV4dEZvckJ1ZmZlclJvdyhlbmRSb3cpLmxlbmd0aF0pXG5cbiAgIyBHaXZlbiBhIGJ1ZmZlciByb3csIHRoaXMgcmV0dXJucyBhIHN1Z2dlc3RlZCBpbmRlbnRhdGlvbiBsZXZlbC5cbiAgI1xuICAjIFRoZSBpbmRlbnRhdGlvbiBsZXZlbCBwcm92aWRlZCBpcyBiYXNlZCBvbiB0aGUgY3VycmVudCB7TGFuZ3VhZ2VNb2RlfS5cbiAgI1xuICAjIGJ1ZmZlclJvdyAtIEEge051bWJlcn0gaW5kaWNhdGluZyB0aGUgYnVmZmVyIHJvd1xuICAjXG4gICMgUmV0dXJucyBhIHtOdW1iZXJ9LlxuICBzdWdnZXN0ZWRJbmRlbnRGb3JCdWZmZXJSb3c6IChidWZmZXJSb3csIG9wdGlvbnMpIC0+XG4gICAgbGluZSA9IEBidWZmZXIubGluZUZvclJvdyhidWZmZXJSb3cpXG4gICAgdG9rZW5pemVkTGluZSA9IEBlZGl0b3IudG9rZW5pemVkQnVmZmVyLnRva2VuaXplZExpbmVGb3JSb3coYnVmZmVyUm93KVxuICAgIEBzdWdnZXN0ZWRJbmRlbnRGb3JUb2tlbml6ZWRMaW5lQXRCdWZmZXJSb3coYnVmZmVyUm93LCBsaW5lLCB0b2tlbml6ZWRMaW5lLCBvcHRpb25zKVxuXG4gIHN1Z2dlc3RlZEluZGVudEZvckxpbmVBdEJ1ZmZlclJvdzogKGJ1ZmZlclJvdywgbGluZSwgb3B0aW9ucykgLT5cbiAgICB0b2tlbml6ZWRMaW5lID0gQGVkaXRvci50b2tlbml6ZWRCdWZmZXIuYnVpbGRUb2tlbml6ZWRMaW5lRm9yUm93V2l0aFRleHQoYnVmZmVyUm93LCBsaW5lKVxuICAgIEBzdWdnZXN0ZWRJbmRlbnRGb3JUb2tlbml6ZWRMaW5lQXRCdWZmZXJSb3coYnVmZmVyUm93LCBsaW5lLCB0b2tlbml6ZWRMaW5lLCBvcHRpb25zKVxuXG4gIHN1Z2dlc3RlZEluZGVudEZvclRva2VuaXplZExpbmVBdEJ1ZmZlclJvdzogKGJ1ZmZlclJvdywgbGluZSwgdG9rZW5pemVkTGluZSwgb3B0aW9ucykgLT5cbiAgICBpdGVyYXRvciA9IHRva2VuaXplZExpbmUuZ2V0VG9rZW5JdGVyYXRvcigpXG4gICAgaXRlcmF0b3IubmV4dCgpXG4gICAgc2NvcGVEZXNjcmlwdG9yID0gbmV3IFNjb3BlRGVzY3JpcHRvcihzY29wZXM6IGl0ZXJhdG9yLmdldFNjb3BlcygpKVxuXG4gICAgaW5jcmVhc2VJbmRlbnRSZWdleCA9IEBpbmNyZWFzZUluZGVudFJlZ2V4Rm9yU2NvcGVEZXNjcmlwdG9yKHNjb3BlRGVzY3JpcHRvcilcbiAgICBkZWNyZWFzZUluZGVudFJlZ2V4ID0gQGRlY3JlYXNlSW5kZW50UmVnZXhGb3JTY29wZURlc2NyaXB0b3Ioc2NvcGVEZXNjcmlwdG9yKVxuICAgIGRlY3JlYXNlTmV4dEluZGVudFJlZ2V4ID0gQGRlY3JlYXNlTmV4dEluZGVudFJlZ2V4Rm9yU2NvcGVEZXNjcmlwdG9yKHNjb3BlRGVzY3JpcHRvcilcblxuICAgIGlmIG9wdGlvbnM/LnNraXBCbGFua0xpbmVzID8gdHJ1ZVxuICAgICAgcHJlY2VkaW5nUm93ID0gQGJ1ZmZlci5wcmV2aW91c05vbkJsYW5rUm93KGJ1ZmZlclJvdylcbiAgICAgIHJldHVybiAwIHVubGVzcyBwcmVjZWRpbmdSb3c/XG4gICAgZWxzZVxuICAgICAgcHJlY2VkaW5nUm93ID0gYnVmZmVyUm93IC0gMVxuICAgICAgcmV0dXJuIDAgaWYgcHJlY2VkaW5nUm93IDwgMFxuXG4gICAgZGVzaXJlZEluZGVudExldmVsID0gQGVkaXRvci5pbmRlbnRhdGlvbkZvckJ1ZmZlclJvdyhwcmVjZWRpbmdSb3cpXG4gICAgcmV0dXJuIGRlc2lyZWRJbmRlbnRMZXZlbCB1bmxlc3MgaW5jcmVhc2VJbmRlbnRSZWdleFxuXG4gICAgdW5sZXNzIEBlZGl0b3IuaXNCdWZmZXJSb3dDb21tZW50ZWQocHJlY2VkaW5nUm93KVxuICAgICAgcHJlY2VkaW5nTGluZSA9IEBidWZmZXIubGluZUZvclJvdyhwcmVjZWRpbmdSb3cpXG4gICAgICBkZXNpcmVkSW5kZW50TGV2ZWwgKz0gMSBpZiBpbmNyZWFzZUluZGVudFJlZ2V4Py50ZXN0U3luYyhwcmVjZWRpbmdMaW5lKVxuICAgICAgZGVzaXJlZEluZGVudExldmVsIC09IDEgaWYgZGVjcmVhc2VOZXh0SW5kZW50UmVnZXg/LnRlc3RTeW5jKHByZWNlZGluZ0xpbmUpXG5cbiAgICB1bmxlc3MgQGJ1ZmZlci5pc1Jvd0JsYW5rKHByZWNlZGluZ1JvdylcbiAgICAgIGRlc2lyZWRJbmRlbnRMZXZlbCAtPSAxIGlmIGRlY3JlYXNlSW5kZW50UmVnZXg/LnRlc3RTeW5jKGxpbmUpXG5cbiAgICBNYXRoLm1heChkZXNpcmVkSW5kZW50TGV2ZWwsIDApXG5cbiAgIyBDYWxjdWxhdGUgYSBtaW5pbXVtIGluZGVudCBsZXZlbCBmb3IgYSByYW5nZSBvZiBsaW5lcyBleGNsdWRpbmcgZW1wdHkgbGluZXMuXG4gICNcbiAgIyBzdGFydFJvdyAtIFRoZSByb3cge051bWJlcn0gdG8gc3RhcnQgYXRcbiAgIyBlbmRSb3cgLSBUaGUgcm93IHtOdW1iZXJ9IHRvIGVuZCBhdFxuICAjXG4gICMgUmV0dXJucyBhIHtOdW1iZXJ9IG9mIHRoZSBpbmRlbnQgbGV2ZWwgb2YgdGhlIGJsb2NrIG9mIGxpbmVzLlxuICBtaW5JbmRlbnRMZXZlbEZvclJvd1JhbmdlOiAoc3RhcnRSb3csIGVuZFJvdykgLT5cbiAgICBpbmRlbnRzID0gKEBlZGl0b3IuaW5kZW50YXRpb25Gb3JCdWZmZXJSb3cocm93KSBmb3Igcm93IGluIFtzdGFydFJvdy4uZW5kUm93XSBieSAxIHdoZW4gbm90IEBlZGl0b3IuaXNCdWZmZXJSb3dCbGFuayhyb3cpKVxuICAgIGluZGVudHMgPSBbMF0gdW5sZXNzIGluZGVudHMubGVuZ3RoXG4gICAgTWF0aC5taW4oaW5kZW50cy4uLilcblxuICAjIEluZGVudHMgYWxsIHRoZSByb3dzIGJldHdlZW4gdHdvIGJ1ZmZlciByb3cgbnVtYmVycy5cbiAgI1xuICAjIHN0YXJ0Um93IC0gVGhlIHJvdyB7TnVtYmVyfSB0byBzdGFydCBhdFxuICAjIGVuZFJvdyAtIFRoZSByb3cge051bWJlcn0gdG8gZW5kIGF0XG4gIGF1dG9JbmRlbnRCdWZmZXJSb3dzOiAoc3RhcnRSb3csIGVuZFJvdykgLT5cbiAgICBAYXV0b0luZGVudEJ1ZmZlclJvdyhyb3cpIGZvciByb3cgaW4gW3N0YXJ0Um93Li5lbmRSb3ddIGJ5IDFcbiAgICByZXR1cm5cblxuICAjIEdpdmVuIGEgYnVmZmVyIHJvdywgdGhpcyBpbmRlbnRzIGl0LlxuICAjXG4gICMgYnVmZmVyUm93IC0gVGhlIHJvdyB7TnVtYmVyfS5cbiAgIyBvcHRpb25zIC0gQW4gb3B0aW9ucyB7T2JqZWN0fSB0byBwYXNzIHRocm91Z2ggdG8ge1RleHRFZGl0b3I6OnNldEluZGVudGF0aW9uRm9yQnVmZmVyUm93fS5cbiAgYXV0b0luZGVudEJ1ZmZlclJvdzogKGJ1ZmZlclJvdywgb3B0aW9ucykgLT5cbiAgICBpbmRlbnRMZXZlbCA9IEBzdWdnZXN0ZWRJbmRlbnRGb3JCdWZmZXJSb3coYnVmZmVyUm93LCBvcHRpb25zKVxuICAgIEBlZGl0b3Iuc2V0SW5kZW50YXRpb25Gb3JCdWZmZXJSb3coYnVmZmVyUm93LCBpbmRlbnRMZXZlbCwgb3B0aW9ucylcblxuICAjIEdpdmVuIGEgYnVmZmVyIHJvdywgdGhpcyBkZWNyZWFzZXMgdGhlIGluZGVudGF0aW9uLlxuICAjXG4gICMgYnVmZmVyUm93IC0gVGhlIHJvdyB7TnVtYmVyfVxuICBhdXRvRGVjcmVhc2VJbmRlbnRGb3JCdWZmZXJSb3c6IChidWZmZXJSb3cpIC0+XG4gICAgc2NvcGVEZXNjcmlwdG9yID0gQGVkaXRvci5zY29wZURlc2NyaXB0b3JGb3JCdWZmZXJQb3NpdGlvbihbYnVmZmVyUm93LCAwXSlcbiAgICByZXR1cm4gdW5sZXNzIGRlY3JlYXNlSW5kZW50UmVnZXggPSBAZGVjcmVhc2VJbmRlbnRSZWdleEZvclNjb3BlRGVzY3JpcHRvcihzY29wZURlc2NyaXB0b3IpXG5cbiAgICBsaW5lID0gQGJ1ZmZlci5saW5lRm9yUm93KGJ1ZmZlclJvdylcbiAgICByZXR1cm4gdW5sZXNzIGRlY3JlYXNlSW5kZW50UmVnZXgudGVzdFN5bmMobGluZSlcblxuICAgIGN1cnJlbnRJbmRlbnRMZXZlbCA9IEBlZGl0b3IuaW5kZW50YXRpb25Gb3JCdWZmZXJSb3coYnVmZmVyUm93KVxuICAgIHJldHVybiBpZiBjdXJyZW50SW5kZW50TGV2ZWwgaXMgMFxuXG4gICAgcHJlY2VkaW5nUm93ID0gQGJ1ZmZlci5wcmV2aW91c05vbkJsYW5rUm93KGJ1ZmZlclJvdylcbiAgICByZXR1cm4gdW5sZXNzIHByZWNlZGluZ1Jvdz9cblxuICAgIHByZWNlZGluZ0xpbmUgPSBAYnVmZmVyLmxpbmVGb3JSb3cocHJlY2VkaW5nUm93KVxuICAgIGRlc2lyZWRJbmRlbnRMZXZlbCA9IEBlZGl0b3IuaW5kZW50YXRpb25Gb3JCdWZmZXJSb3cocHJlY2VkaW5nUm93KVxuXG4gICAgaWYgaW5jcmVhc2VJbmRlbnRSZWdleCA9IEBpbmNyZWFzZUluZGVudFJlZ2V4Rm9yU2NvcGVEZXNjcmlwdG9yKHNjb3BlRGVzY3JpcHRvcilcbiAgICAgIGRlc2lyZWRJbmRlbnRMZXZlbCAtPSAxIHVubGVzcyBpbmNyZWFzZUluZGVudFJlZ2V4LnRlc3RTeW5jKHByZWNlZGluZ0xpbmUpXG5cbiAgICBpZiBkZWNyZWFzZU5leHRJbmRlbnRSZWdleCA9IEBkZWNyZWFzZU5leHRJbmRlbnRSZWdleEZvclNjb3BlRGVzY3JpcHRvcihzY29wZURlc2NyaXB0b3IpXG4gICAgICBkZXNpcmVkSW5kZW50TGV2ZWwgLT0gMSBpZiBkZWNyZWFzZU5leHRJbmRlbnRSZWdleC50ZXN0U3luYyhwcmVjZWRpbmdMaW5lKVxuXG4gICAgaWYgZGVzaXJlZEluZGVudExldmVsID49IDAgYW5kIGRlc2lyZWRJbmRlbnRMZXZlbCA8IGN1cnJlbnRJbmRlbnRMZXZlbFxuICAgICAgQGVkaXRvci5zZXRJbmRlbnRhdGlvbkZvckJ1ZmZlclJvdyhidWZmZXJSb3csIGRlc2lyZWRJbmRlbnRMZXZlbClcblxuICBjYWNoZVJlZ2V4OiAocGF0dGVybikgLT5cbiAgICBpZiBwYXR0ZXJuXG4gICAgICBAcmVnZXhlc0J5UGF0dGVybltwYXR0ZXJuXSA/PSBuZXcgT25pZ1JlZ0V4cChwYXR0ZXJuKVxuXG4gIGluY3JlYXNlSW5kZW50UmVnZXhGb3JTY29wZURlc2NyaXB0b3I6IChzY29wZURlc2NyaXB0b3IpIC0+XG4gICAgQGNhY2hlUmVnZXgoQGVkaXRvci5nZXRJbmNyZWFzZUluZGVudFBhdHRlcm4oc2NvcGVEZXNjcmlwdG9yKSlcblxuICBkZWNyZWFzZUluZGVudFJlZ2V4Rm9yU2NvcGVEZXNjcmlwdG9yOiAoc2NvcGVEZXNjcmlwdG9yKSAtPlxuICAgIEBjYWNoZVJlZ2V4KEBlZGl0b3IuZ2V0RGVjcmVhc2VJbmRlbnRQYXR0ZXJuKHNjb3BlRGVzY3JpcHRvcikpXG5cbiAgZGVjcmVhc2VOZXh0SW5kZW50UmVnZXhGb3JTY29wZURlc2NyaXB0b3I6IChzY29wZURlc2NyaXB0b3IpIC0+XG4gICAgQGNhY2hlUmVnZXgoQGVkaXRvci5nZXREZWNyZWFzZU5leHRJbmRlbnRQYXR0ZXJuKHNjb3BlRGVzY3JpcHRvcikpXG5cbiAgZm9sZEVuZFJlZ2V4Rm9yU2NvcGVEZXNjcmlwdG9yOiAoc2NvcGVEZXNjcmlwdG9yKSAtPlxuICAgIEBjYWNoZVJlZ2V4KEBlZGl0b3IuZ2V0Rm9sZEVuZFBhdHRlcm4oc2NvcGVEZXNjcmlwdG9yKSlcbiJdfQ==
