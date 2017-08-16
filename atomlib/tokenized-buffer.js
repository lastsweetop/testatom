(function() {
  var CompositeDisposable, Emitter, Model, NullGrammar, Point, Range, ScopeDescriptor, TokenIterator, TokenizedBuffer, TokenizedBufferIterator, TokenizedLine, _, prefixedScopes, ref, ref1, selectorMatchesAnyScope, toFirstMateScopeId,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  _ = require('underscore-plus');

  ref = require('event-kit'), CompositeDisposable = ref.CompositeDisposable, Emitter = ref.Emitter;

  ref1 = require('text-buffer'), Point = ref1.Point, Range = ref1.Range;

  Model = require('./model');

  TokenizedLine = require('./tokenized-line');

  TokenIterator = require('./token-iterator');

  ScopeDescriptor = require('./scope-descriptor');

  TokenizedBufferIterator = require('./tokenized-buffer-iterator');

  NullGrammar = require('./null-grammar');

  toFirstMateScopeId = require('./first-mate-helpers').toFirstMateScopeId;

  prefixedScopes = new Map();

  module.exports = TokenizedBuffer = (function(superClass) {
    extend(TokenizedBuffer, superClass);

    TokenizedBuffer.prototype.grammar = null;

    TokenizedBuffer.prototype.buffer = null;

    TokenizedBuffer.prototype.tabLength = null;

    TokenizedBuffer.prototype.tokenizedLines = null;

    TokenizedBuffer.prototype.chunkSize = 50;

    TokenizedBuffer.prototype.invalidRows = null;

    TokenizedBuffer.prototype.visible = false;

    TokenizedBuffer.prototype.changeCount = 0;

    TokenizedBuffer.deserialize = function(state, atomEnvironment) {
      if (state.bufferId) {
        state.buffer = atomEnvironment.project.bufferForIdSync(state.bufferId);
      } else {
        state.buffer = atomEnvironment.project.bufferForPathSync(state.bufferPath);
      }
      state.assert = atomEnvironment.assert;
      return new this(state);
    };

    function TokenizedBuffer(params) {
      var grammar;
      grammar = params.grammar, this.buffer = params.buffer, this.tabLength = params.tabLength, this.largeFileMode = params.largeFileMode, this.assert = params.assert;
      this.emitter = new Emitter;
      this.disposables = new CompositeDisposable;
      this.tokenIterator = new TokenIterator(this);
      this.disposables.add(this.buffer.registerTextDecorationLayer(this));
      this.setGrammar(grammar != null ? grammar : NullGrammar);
    }

    TokenizedBuffer.prototype.destroyed = function() {
      this.disposables.dispose();
      return this.tokenizedLines.length = 0;
    };

    TokenizedBuffer.prototype.buildIterator = function() {
      return new TokenizedBufferIterator(this);
    };

    TokenizedBuffer.prototype.classNameForScopeId = function(id) {
      var prefixedScope, scope;
      scope = this.grammar.scopeForId(toFirstMateScopeId(id));
      if (scope) {
        prefixedScope = prefixedScopes.get(scope);
        if (prefixedScope) {
          return prefixedScope;
        } else {
          prefixedScope = "syntax--" + (scope.replace(/\./g, ' syntax--'));
          prefixedScopes.set(scope, prefixedScope);
          return prefixedScope;
        }
      } else {
        return null;
      }
    };

    TokenizedBuffer.prototype.getInvalidatedRanges = function() {
      return [];
    };

    TokenizedBuffer.prototype.onDidInvalidateRange = function(fn) {
      return this.emitter.on('did-invalidate-range', fn);
    };

    TokenizedBuffer.prototype.serialize = function() {
      return {
        deserializer: 'TokenizedBuffer',
        bufferPath: this.buffer.getPath(),
        bufferId: this.buffer.getId(),
        tabLength: this.tabLength,
        largeFileMode: this.largeFileMode
      };
    };

    TokenizedBuffer.prototype.observeGrammar = function(callback) {
      callback(this.grammar);
      return this.onDidChangeGrammar(callback);
    };

    TokenizedBuffer.prototype.onDidChangeGrammar = function(callback) {
      return this.emitter.on('did-change-grammar', callback);
    };

    TokenizedBuffer.prototype.onDidTokenize = function(callback) {
      return this.emitter.on('did-tokenize', callback);
    };

    TokenizedBuffer.prototype.setGrammar = function(grammar) {
      var ref2;
      if (!((grammar != null) && grammar !== this.grammar)) {
        return;
      }
      this.grammar = grammar;
      this.rootScopeDescriptor = new ScopeDescriptor({
        scopes: [this.grammar.scopeName]
      });
      if ((ref2 = this.grammarUpdateDisposable) != null) {
        ref2.dispose();
      }
      this.grammarUpdateDisposable = this.grammar.onDidUpdate((function(_this) {
        return function() {
          return _this.retokenizeLines();
        };
      })(this));
      this.disposables.add(this.grammarUpdateDisposable);
      this.retokenizeLines();
      return this.emitter.emit('did-change-grammar', grammar);
    };

    TokenizedBuffer.prototype.getGrammarSelectionContent = function() {
      return this.buffer.getTextInRange([[0, 0], [10, 0]]);
    };

    TokenizedBuffer.prototype.hasTokenForSelector = function(selector) {
      var i, j, len, len1, ref2, ref3, token, tokenizedLine;
      ref2 = this.tokenizedLines;
      for (i = 0, len = ref2.length; i < len; i++) {
        tokenizedLine = ref2[i];
        if (tokenizedLine != null) {
          ref3 = tokenizedLine.tokens;
          for (j = 0, len1 = ref3.length; j < len1; j++) {
            token = ref3[j];
            if (selector.matches(token.scopes)) {
              return true;
            }
          }
        }
      }
      return false;
    };

    TokenizedBuffer.prototype.retokenizeLines = function() {
      if (!this.alive) {
        return;
      }
      this.fullyTokenized = false;
      this.tokenizedLines = new Array(this.buffer.getLineCount());
      this.invalidRows = [];
      if (this.largeFileMode || this.grammar.name === 'Null Grammar') {
        return this.markTokenizationComplete();
      } else {
        return this.invalidateRow(0);
      }
    };

    TokenizedBuffer.prototype.setVisible = function(visible) {
      this.visible = visible;
      if (this.visible && this.grammar.name !== 'Null Grammar' && !this.largeFileMode) {
        return this.tokenizeInBackground();
      }
    };

    TokenizedBuffer.prototype.getTabLength = function() {
      return this.tabLength;
    };

    TokenizedBuffer.prototype.setTabLength = function(tabLength) {
      this.tabLength = tabLength;
    };

    TokenizedBuffer.prototype.tokenizeInBackground = function() {
      if (!this.visible || this.pendingChunk || !this.isAlive()) {
        return;
      }
      this.pendingChunk = true;
      return _.defer((function(_this) {
        return function() {
          _this.pendingChunk = false;
          if (_this.isAlive() && _this.buffer.isAlive()) {
            return _this.tokenizeNextChunk();
          }
        };
      })(this));
    };

    TokenizedBuffer.prototype.tokenizeNextChunk = function() {
      var endRow, filledRegion, lastRow, previousStack, row, rowsRemaining, startRow;
      rowsRemaining = this.chunkSize;
      while ((this.firstInvalidRow() != null) && rowsRemaining > 0) {
        startRow = this.invalidRows.shift();
        lastRow = this.getLastRow();
        if (startRow > lastRow) {
          continue;
        }
        row = startRow;
        while (true) {
          previousStack = this.stackForRow(row);
          this.tokenizedLines[row] = this.buildTokenizedLineForRow(row, this.stackForRow(row - 1), this.openScopesForRow(row));
          if (--rowsRemaining === 0) {
            filledRegion = false;
            endRow = row;
            break;
          }
          if (row === lastRow || _.isEqual(this.stackForRow(row), previousStack)) {
            filledRegion = true;
            endRow = row;
            break;
          }
          row++;
        }
        this.validateRow(endRow);
        if (!filledRegion) {
          this.invalidateRow(endRow + 1);
        }
        this.emitter.emit('did-invalidate-range', Range(Point(startRow, 0), Point(endRow + 1, 0)));
      }
      if (this.firstInvalidRow() != null) {
        return this.tokenizeInBackground();
      } else {
        return this.markTokenizationComplete();
      }
    };

    TokenizedBuffer.prototype.markTokenizationComplete = function() {
      if (!this.fullyTokenized) {
        this.emitter.emit('did-tokenize');
      }
      return this.fullyTokenized = true;
    };

    TokenizedBuffer.prototype.firstInvalidRow = function() {
      return this.invalidRows[0];
    };

    TokenizedBuffer.prototype.validateRow = function(row) {
      while (this.invalidRows[0] <= row) {
        this.invalidRows.shift();
      }
    };

    TokenizedBuffer.prototype.invalidateRow = function(row) {
      this.invalidRows.push(row);
      this.invalidRows.sort(function(a, b) {
        return a - b;
      });
      return this.tokenizeInBackground();
    };

    TokenizedBuffer.prototype.updateInvalidRows = function(start, end, delta) {
      return this.invalidRows = this.invalidRows.map(function(row) {
        if (row < start) {
          return row;
        } else if ((start <= row && row <= end)) {
          return end + delta + 1;
        } else if (row > end) {
          return row + delta;
        }
      });
    };

    TokenizedBuffer.prototype.bufferDidChange = function(e) {
      var delta, end, newEndStack, newLineCount, newRange, newTokenizedLines, oldLineCount, oldRange, previousEndStack, start;
      this.changeCount = this.buffer.changeCount;
      oldRange = e.oldRange, newRange = e.newRange;
      start = oldRange.start.row;
      end = oldRange.end.row;
      delta = newRange.end.row - oldRange.end.row;
      oldLineCount = oldRange.end.row - oldRange.start.row + 1;
      newLineCount = newRange.end.row - newRange.start.row + 1;
      this.updateInvalidRows(start, end, delta);
      previousEndStack = this.stackForRow(end);
      if (this.largeFileMode || this.grammar.name === 'Null Grammar') {
        return _.spliceWithArray(this.tokenizedLines, start, oldLineCount, new Array(newLineCount));
      } else {
        newTokenizedLines = this.buildTokenizedLinesForRows(start, end + delta, this.stackForRow(start - 1), this.openScopesForRow(start));
        _.spliceWithArray(this.tokenizedLines, start, oldLineCount, newTokenizedLines);
        newEndStack = this.stackForRow(end + delta);
        if (newEndStack && !_.isEqual(newEndStack, previousEndStack)) {
          return this.invalidateRow(end + delta + 1);
        }
      }
    };

    TokenizedBuffer.prototype.isFoldableAtRow = function(row) {
      return this.isFoldableCodeAtRow(row) || this.isFoldableCommentAtRow(row);
    };

    TokenizedBuffer.prototype.isFoldableCodeAtRow = function(row) {
      var nextRow, tokenizedLine;
      if ((0 <= row && row <= this.buffer.getLastRow())) {
        nextRow = this.buffer.nextNonBlankRow(row);
        tokenizedLine = this.tokenizedLines[row];
        if (this.buffer.isRowBlank(row) || (tokenizedLine != null ? tokenizedLine.isComment() : void 0) || (nextRow == null)) {
          return false;
        } else {
          return this.indentLevelForRow(nextRow) > this.indentLevelForRow(row);
        }
      } else {
        return false;
      }
    };

    TokenizedBuffer.prototype.isFoldableCommentAtRow = function(row) {
      var nextRow, previousRow, ref2, ref3, ref4;
      previousRow = row - 1;
      nextRow = row + 1;
      if (nextRow > this.buffer.getLastRow()) {
        return false;
      } else {
        return Boolean(!((ref2 = this.tokenizedLines[previousRow]) != null ? ref2.isComment() : void 0) && ((ref3 = this.tokenizedLines[row]) != null ? ref3.isComment() : void 0) && ((ref4 = this.tokenizedLines[nextRow]) != null ? ref4.isComment() : void 0));
      }
    };

    TokenizedBuffer.prototype.buildTokenizedLinesForRows = function(startRow, endRow, startingStack, startingopenScopes) {
      var openScopes, row, ruleStack, stopTokenizingAt, tokenizedLine, tokenizedLines;
      ruleStack = startingStack;
      openScopes = startingopenScopes;
      stopTokenizingAt = startRow + this.chunkSize;
      tokenizedLines = (function() {
        var i, ref2, ref3, results;
        results = [];
        for (row = i = ref2 = startRow, ref3 = endRow; i <= ref3; row = i += 1) {
          if ((ruleStack || row === 0) && row < stopTokenizingAt) {
            tokenizedLine = this.buildTokenizedLineForRow(row, ruleStack, openScopes);
            ruleStack = tokenizedLine.ruleStack;
            openScopes = this.scopesFromTags(openScopes, tokenizedLine.tags);
          } else {
            tokenizedLine = void 0;
          }
          results.push(tokenizedLine);
        }
        return results;
      }).call(this);
      if (endRow >= stopTokenizingAt) {
        this.invalidateRow(stopTokenizingAt);
        this.tokenizeInBackground();
      }
      return tokenizedLines;
    };

    TokenizedBuffer.prototype.buildTokenizedLineForRow = function(row, ruleStack, openScopes) {
      return this.buildTokenizedLineForRowWithText(row, this.buffer.lineForRow(row), ruleStack, openScopes);
    };

    TokenizedBuffer.prototype.buildTokenizedLineForRowWithText = function(row, text, ruleStack, openScopes) {
      var lineEnding, ref2, tags;
      if (ruleStack == null) {
        ruleStack = this.stackForRow(row - 1);
      }
      if (openScopes == null) {
        openScopes = this.openScopesForRow(row);
      }
      lineEnding = this.buffer.lineEndingForRow(row);
      ref2 = this.grammar.tokenizeLine(text, ruleStack, row === 0, false), tags = ref2.tags, ruleStack = ref2.ruleStack;
      return new TokenizedLine({
        openScopes: openScopes,
        text: text,
        tags: tags,
        ruleStack: ruleStack,
        lineEnding: lineEnding,
        tokenIterator: this.tokenIterator,
        grammar: this.grammar
      });
    };

    TokenizedBuffer.prototype.tokenizedLineForRow = function(bufferRow) {
      var lineEnding, tags, text, tokenizedLine;
      if ((0 <= bufferRow && bufferRow <= this.buffer.getLastRow())) {
        if (tokenizedLine = this.tokenizedLines[bufferRow]) {
          return tokenizedLine;
        } else {
          text = this.buffer.lineForRow(bufferRow);
          lineEnding = this.buffer.lineEndingForRow(bufferRow);
          tags = [this.grammar.startIdForScope(this.grammar.scopeName), text.length, this.grammar.endIdForScope(this.grammar.scopeName)];
          return this.tokenizedLines[bufferRow] = new TokenizedLine({
            openScopes: [],
            text: text,
            tags: tags,
            lineEnding: lineEnding,
            tokenIterator: this.tokenIterator,
            grammar: this.grammar
          });
        }
      }
    };

    TokenizedBuffer.prototype.tokenizedLinesForRows = function(startRow, endRow) {
      var i, ref2, ref3, results, row;
      results = [];
      for (row = i = ref2 = startRow, ref3 = endRow; i <= ref3; row = i += 1) {
        results.push(this.tokenizedLineForRow(row));
      }
      return results;
    };

    TokenizedBuffer.prototype.stackForRow = function(bufferRow) {
      var ref2;
      return (ref2 = this.tokenizedLines[bufferRow]) != null ? ref2.ruleStack : void 0;
    };

    TokenizedBuffer.prototype.openScopesForRow = function(bufferRow) {
      var precedingLine;
      if (precedingLine = this.tokenizedLines[bufferRow - 1]) {
        return this.scopesFromTags(precedingLine.openScopes, precedingLine.tags);
      } else {
        return [];
      }
    };

    TokenizedBuffer.prototype.scopesFromTags = function(startingScopes, tags) {
      var i, len, matchingStartTag, scopes, tag;
      scopes = startingScopes.slice();
      for (i = 0, len = tags.length; i < len; i++) {
        tag = tags[i];
        if (tag < 0) {
          if ((tag % 2) === -1) {
            scopes.push(tag);
          } else {
            matchingStartTag = tag + 1;
            while (true) {
              if (scopes.pop() === matchingStartTag) {
                break;
              }
              if (scopes.length === 0) {
                this.assert(false, "Encountered an unmatched scope end tag.", (function(_this) {
                  return function(error) {
                    var path;
                    error.metadata = {
                      grammarScopeName: _this.grammar.scopeName,
                      unmatchedEndTag: _this.grammar.scopeForId(tag)
                    };
                    path = require('path');
                    error.privateMetadataDescription = "The contents of `" + (path.basename(_this.buffer.getPath())) + "`";
                    return error.privateMetadata = {
                      filePath: _this.buffer.getPath(),
                      fileContents: _this.buffer.getText()
                    };
                  };
                })(this));
                break;
              }
            }
          }
        }
      }
      return scopes;
    };

    TokenizedBuffer.prototype.indentLevelForRow = function(bufferRow) {
      var indentLevel, line, lineCount, nextLine, nextRow, previousLine, previousRow;
      line = this.buffer.lineForRow(bufferRow);
      indentLevel = 0;
      if (line === '') {
        nextRow = bufferRow + 1;
        lineCount = this.getLineCount();
        while (nextRow < lineCount) {
          nextLine = this.buffer.lineForRow(nextRow);
          if (nextLine !== '') {
            indentLevel = Math.ceil(this.indentLevelForLine(nextLine));
            break;
          }
          nextRow++;
        }
        previousRow = bufferRow - 1;
        while (previousRow >= 0) {
          previousLine = this.buffer.lineForRow(previousRow);
          if (previousLine !== '') {
            indentLevel = Math.max(Math.ceil(this.indentLevelForLine(previousLine)), indentLevel);
            break;
          }
          previousRow--;
        }
        return indentLevel;
      } else {
        return this.indentLevelForLine(line);
      }
    };

    TokenizedBuffer.prototype.indentLevelForLine = function(line) {
      var char, i, indentLength, len;
      indentLength = 0;
      for (i = 0, len = line.length; i < len; i++) {
        char = line[i];
        if (char === '\t') {
          indentLength += this.getTabLength() - (indentLength % this.getTabLength());
        } else if (char === ' ') {
          indentLength++;
        } else {
          break;
        }
      }
      return indentLength / this.getTabLength();
    };

    TokenizedBuffer.prototype.scopeDescriptorForPosition = function(position) {
      var column, iterator, ref2, row, scopes;
      ref2 = this.buffer.clipPosition(Point.fromObject(position)), row = ref2.row, column = ref2.column;
      iterator = this.tokenizedLineForRow(row).getTokenIterator();
      while (iterator.next()) {
        if (iterator.getBufferEnd() > column) {
          scopes = iterator.getScopes();
          break;
        }
      }
      if (scopes == null) {
        scopes = iterator.getScopes();
        scopes.push.apply(scopes, iterator.getScopeEnds().reverse());
      }
      return new ScopeDescriptor({
        scopes: scopes
      });
    };

    TokenizedBuffer.prototype.tokenForPosition = function(position) {
      var column, ref2, row;
      ref2 = Point.fromObject(position), row = ref2.row, column = ref2.column;
      return this.tokenizedLineForRow(row).tokenAtBufferColumn(column);
    };

    TokenizedBuffer.prototype.tokenStartPositionForPosition = function(position) {
      var column, ref2, row;
      ref2 = Point.fromObject(position), row = ref2.row, column = ref2.column;
      column = this.tokenizedLineForRow(row).tokenStartColumnForBufferColumn(column);
      return new Point(row, column);
    };

    TokenizedBuffer.prototype.bufferRangeForScopeAtPosition = function(selector, position) {
      var endColumn, endScopes, endTokenIndex, i, j, k, len, openScopes, ref2, ref3, ref4, ref5, scopes, startColumn, startScopes, startTokenIndex, tag, tags, tokenIndex;
      position = Point.fromObject(position);
      ref2 = this.tokenizedLineForRow(position.row), openScopes = ref2.openScopes, tags = ref2.tags;
      scopes = openScopes.map((function(_this) {
        return function(tag) {
          return _this.grammar.scopeForId(tag);
        };
      })(this));
      startColumn = 0;
      for (tokenIndex = i = 0, len = tags.length; i < len; tokenIndex = ++i) {
        tag = tags[tokenIndex];
        if (tag < 0) {
          if (tag % 2 === -1) {
            scopes.push(this.grammar.scopeForId(tag));
          } else {
            scopes.pop();
          }
        } else {
          endColumn = startColumn + tag;
          if (endColumn >= position.column) {
            break;
          } else {
            startColumn = endColumn;
          }
        }
      }
      if (!selectorMatchesAnyScope(selector, scopes)) {
        return;
      }
      startScopes = scopes.slice();
      for (startTokenIndex = j = ref3 = tokenIndex - 1; j >= 0; startTokenIndex = j += -1) {
        tag = tags[startTokenIndex];
        if (tag < 0) {
          if (tag % 2 === -1) {
            startScopes.pop();
          } else {
            startScopes.push(this.grammar.scopeForId(tag));
          }
        } else {
          if (!selectorMatchesAnyScope(selector, startScopes)) {
            break;
          }
          startColumn -= tag;
        }
      }
      endScopes = scopes.slice();
      for (endTokenIndex = k = ref4 = tokenIndex + 1, ref5 = tags.length; k < ref5; endTokenIndex = k += 1) {
        tag = tags[endTokenIndex];
        if (tag < 0) {
          if (tag % 2 === -1) {
            endScopes.push(this.grammar.scopeForId(tag));
          } else {
            endScopes.pop();
          }
        } else {
          if (!selectorMatchesAnyScope(selector, endScopes)) {
            break;
          }
          endColumn += tag;
        }
      }
      return new Range(new Point(position.row, startColumn), new Point(position.row, endColumn));
    };

    TokenizedBuffer.prototype.getLastRow = function() {
      return this.buffer.getLastRow();
    };

    TokenizedBuffer.prototype.getLineCount = function() {
      return this.buffer.getLineCount();
    };

    TokenizedBuffer.prototype.logLines = function(start, end) {
      var i, line, ref2, ref3, row;
      if (start == null) {
        start = 0;
      }
      if (end == null) {
        end = this.buffer.getLastRow();
      }
      for (row = i = ref2 = start, ref3 = end; ref2 <= ref3 ? i <= ref3 : i >= ref3; row = ref2 <= ref3 ? ++i : --i) {
        line = this.tokenizedLines[row].text;
        console.log(row, line, line.length);
      }
    };

    return TokenizedBuffer;

  })(Model);

  selectorMatchesAnyScope = function(selector, scopes) {
    var targetClasses;
    targetClasses = selector.replace(/^\./, '').split('.');
    return _.any(scopes, function(scope) {
      var scopeClasses;
      scopeClasses = scope.split('.');
      return _.isSubset(targetClasses, scopeClasses);
    });
  };

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiL1VzZXJzL2Rpc3RpbGxlci9hdG9tL291dC9hcHAvc3JjL3Rva2VuaXplZC1idWZmZXIuY29mZmVlIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQUEsTUFBQSxrT0FBQTtJQUFBOzs7RUFBQSxDQUFBLEdBQUksT0FBQSxDQUFRLGlCQUFSOztFQUNKLE1BQWlDLE9BQUEsQ0FBUSxXQUFSLENBQWpDLEVBQUMsNkNBQUQsRUFBc0I7O0VBQ3RCLE9BQWlCLE9BQUEsQ0FBUSxhQUFSLENBQWpCLEVBQUMsa0JBQUQsRUFBUTs7RUFDUixLQUFBLEdBQVEsT0FBQSxDQUFRLFNBQVI7O0VBQ1IsYUFBQSxHQUFnQixPQUFBLENBQVEsa0JBQVI7O0VBQ2hCLGFBQUEsR0FBZ0IsT0FBQSxDQUFRLGtCQUFSOztFQUNoQixlQUFBLEdBQWtCLE9BQUEsQ0FBUSxvQkFBUjs7RUFDbEIsdUJBQUEsR0FBMEIsT0FBQSxDQUFRLDZCQUFSOztFQUMxQixXQUFBLEdBQWMsT0FBQSxDQUFRLGdCQUFSOztFQUNiLHFCQUFzQixPQUFBLENBQVEsc0JBQVI7O0VBRXZCLGNBQUEsR0FBcUIsSUFBQSxHQUFBLENBQUE7O0VBRXJCLE1BQU0sQ0FBQyxPQUFQLEdBQ007Ozs4QkFDSixPQUFBLEdBQVM7OzhCQUNULE1BQUEsR0FBUTs7OEJBQ1IsU0FBQSxHQUFXOzs4QkFDWCxjQUFBLEdBQWdCOzs4QkFDaEIsU0FBQSxHQUFXOzs4QkFDWCxXQUFBLEdBQWE7OzhCQUNiLE9BQUEsR0FBUzs7OEJBQ1QsV0FBQSxHQUFhOztJQUViLGVBQUMsQ0FBQSxXQUFELEdBQWMsU0FBQyxLQUFELEVBQVEsZUFBUjtNQUNaLElBQUcsS0FBSyxDQUFDLFFBQVQ7UUFDRSxLQUFLLENBQUMsTUFBTixHQUFlLGVBQWUsQ0FBQyxPQUFPLENBQUMsZUFBeEIsQ0FBd0MsS0FBSyxDQUFDLFFBQTlDLEVBRGpCO09BQUEsTUFBQTtRQUlFLEtBQUssQ0FBQyxNQUFO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WDtBQUN4QixRQUFBO0lBQUEsYUFBQSxHQUFnQixRQUFRLENBQUMsT0FBVCxDQUFpQixLQUFqQixFQUF3QixFQUF4QixDQUEyQixDQUFDLEtBQTVCLENBQWtDLEdBQWxDO1dBQ2hCLENBQUMsQ0FBQyxHQUFGLENBQU0sTUFBTixFQUFjLFNBQUMsS0FBRDtBQUNaLFVBQUE7TUFBQSxZQUFBLEdBQWUsS0FBSyxDQUFDLEtBQU4sQ0FBWSxHQUFaO2FBQ2YsQ0FBQyxDQUFDLFFBQUYsQ0FBVyxhQUFYLEVBQTBCLFlBQTFCO0lBRlksQ0FBZDtFQUZ3QjtBQTliMUIiLCJzb3VyY2VzQ29udGVudCI6WyJfID0gcmVxdWlyZSAndW5kZXJzY29yZS1wbHVzJ1xue0NvbXBvc2l0ZURpc3Bvc2FibGUsIEVtaXR0ZXJ9ID0gcmVxdWlyZSAnZXZlbnQta2l0J1xue1BvaW50LCBSYW5nZX0gPSByZXF1aXJlICd0ZXh0LWJ1ZmZlcidcbk1vZGVsID0gcmVxdWlyZSAnLi9tb2RlbCdcblRva2VuaXplZExpbmUgPSByZXF1aXJlICcuL3Rva2VuaXplZC1saW5lJ1xuVG9rZW5JdGVyYXRvciA9IHJlcXVpcmUgJy4vdG9rZW4taXRlcmF0b3InXG5TY29wZURlc2NyaXB0b3IgPSByZXF1aXJlICcuL3Njb3BlLWRlc2NyaXB0b3InXG5Ub2tlbml6ZWRCdWZmZXJJdGVyYXRvciA9IHJlcXVpcmUgJy4vdG9rZW5pemVkLWJ1ZmZlci1pdGVyYXRvcidcbk51bGxHcmFtbWFyID0gcmVxdWlyZSAnLi9udWxsLWdyYW1tYXInXG57dG9GaXJzdE1hdGVTY29wZUlkfSA9IHJlcXVpcmUgJy4vZmlyc3QtbWF0ZS1oZWxwZXJzJ1xuXG5wcmVmaXhlZFNjb3BlcyA9IG5ldyBNYXAoKVxuXG5tb2R1bGUuZXhwb3J0cyA9XG5jbGFzcyBUb2tlbml6ZWRCdWZmZXIgZXh0ZW5kcyBNb2RlbFxuICBncmFtbWFyOiBudWxsXG4gIGJ1ZmZlcjogbnVsbFxuICB0YWJMZW5ndGg6IG51bGxcbiAgdG9rZW5pemVkTGluZXM6IG51bGxcbiAgY2h1bmtTaXplOiA1MFxuICBpbnZhbGlkUm93czogbnVsbFxuICB2aXNpYmxlOiBmYWxzZVxuICBjaGFuZ2VDb3VudDogMFxuXG4gIEBkZXNlcmlhbGl6ZTogKHN0YXRlLCBhdG9tRW52aXJvbm1lbnQpIC0+XG4gICAgaWYgc3RhdGUuYnVmZmVySWRcbiAgICAgIHN0YXRlLmJ1ZmZlciA9IGF0b21FbnZpcm9ubWVudC5wcm9qZWN0LmJ1ZmZlckZvcklkU3luYyhzdGF0ZS5idWZmZXJJZClcbiAgICBlbHNlXG4gICAgICAjIFRPRE86IHJlbW92ZSB0aGlzIGZhbGxiYWNrIGFmdGVyIGV2ZXJ5b25lIHRyYW5zaXRpb25zIHRvIHRoZSBsYXRlc3QgdmVyc2lvbi5cbiAgICAgIHN0YXRlLmJ1ZmZlciA9IGF0b21FbnZpcm9ubWVudC5wcm9qZWN0LmJ1ZmZlckZvclBhdGhTeW5jKHN0YXRlLmJ1ZmZlclBhdGgpXG4gICAgc3RhdGUuYXNzZXJ0ID0gYXRvbUVudmlyb25tZW50LmFzc2VydFxuICAgIG5ldyB0aGlzKHN0YXRlKVxuXG4gIGNvbnN0cnVjdG9yOiAocGFyYW1zKSAtPlxuICAgIHtncmFtbWFyLCBAYnVmZmVyLCBAdGFiTGVuZ3RoLCBAbGFyZ2VGaWxlTW9kZSwgQGFzc2VydH0gPSBwYXJhbXNcblxuICAgIEBlbWl0dGVyID0gbmV3IEVtaXR0ZXJcbiAgICBAZGlzcG9zYWJsZXMgPSBuZXcgQ29tcG9zaXRlRGlzcG9zYWJsZVxuICAgIEB0b2tlbkl0ZXJhdG9yID0gbmV3IFRva2VuSXRlcmF0b3IodGhpcylcblxuICAgIEBkaXNwb3NhYmxlcy5hZGQgQGJ1ZmZlci5yZWdpc3RlclRleHREZWNvcmF0aW9uTGF5ZXIodGhpcylcblxuICAgIEBzZXRHcmFtbWFyKGdyYW1tYXIgPyBOdWxsR3JhbW1hcilcblxuICBkZXN0cm95ZWQ6IC0+XG4gICAgQGRpc3Bvc2FibGVzLmRpc3Bvc2UoKVxuICAgIEB0b2tlbml6ZWRMaW5lcy5sZW5ndGggPSAwXG5cbiAgYnVpbGRJdGVyYXRvcjogLT5cbiAgICBuZXcgVG9rZW5pemVkQnVmZmVySXRlcmF0b3IodGhpcylcblxuICBjbGFzc05hbWVGb3JTY29wZUlkOiAoaWQpIC0+XG4gICAgc2NvcGUgPSBAZ3JhbW1hci5zY29wZUZvcklkKHRvRmlyc3RNYXRlU2NvcGVJZChpZCkpXG4gICAgaWYgc2NvcGVcbiAgICAgIHByZWZpeGVkU2NvcGUgPSBwcmVmaXhlZFNjb3Blcy5nZXQoc2NvcGUpXG4gICAgICBpZiBwcmVmaXhlZFNjb3BlXG4gICAgICAgIHByZWZpeGVkU2NvcGVcbiAgICAgIGVsc2VcbiAgICAgICAgcHJlZml4ZWRTY29wZSA9IFwic3ludGF4LS0je3Njb3BlLnJlcGxhY2UoL1xcLi9nLCAnIHN5bnRheC0tJyl9XCJcbiAgICAgICAgcHJlZml4ZWRTY29wZXMuc2V0KHNjb3BlLCBwcmVmaXhlZFNjb3BlKVxuICAgICAgICBwcmVmaXhlZFNjb3BlXG4gICAgZWxzZVxuICAgICAgbnVsbFxuXG4gIGdldEludmFsaWRhdGVkUmFuZ2VzOiAtPlxuICAgIFtdXG5cbiAgb25EaWRJbnZhbGlkYXRlUmFuZ2U6IChmbikgLT5cbiAgICBAZW1pdHRlci5vbiAnZGlkLWludmFsaWRhdGUtcmFuZ2UnLCBmblxuXG4gIHNlcmlhbGl6ZTogLT5cbiAgICB7XG4gICAgICBkZXNlcmlhbGl6ZXI6ICdUb2tlbml6ZWRCdWZmZXInXG4gICAgICBidWZmZXJQYXRoOiBAYnVmZmVyLmdldFBhdGgoKVxuICAgICAgYnVmZmVySWQ6IEBidWZmZXIuZ2V0SWQoKVxuICAgICAgdGFiTGVuZ3RoOiBAdGFiTGVuZ3RoXG4gICAgICBsYXJnZUZpbGVNb2RlOiBAbGFyZ2VGaWxlTW9kZVxuICAgIH1cblxuICBvYnNlcnZlR3JhbW1hcjogKGNhbGxiYWNrKSAtPlxuICAgIGNhbGxiYWNrKEBncmFtbWFyKVxuICAgIEBvbkRpZENoYW5nZUdyYW1tYXIoY2FsbGJhY2spXG5cbiAgb25EaWRDaGFuZ2VHcmFtbWFyOiAoY2FsbGJhY2spIC0+XG4gICAgQGVtaXR0ZXIub24gJ2RpZC1jaGFuZ2UtZ3JhbW1hcicsIGNhbGxiYWNrXG5cbiAgb25EaWRUb2tlbml6ZTogKGNhbGxiYWNrKSAtPlxuICAgIEBlbWl0dGVyLm9uICdkaWQtdG9rZW5pemUnLCBjYWxsYmFja1xuXG4gIHNldEdyYW1tYXI6IChncmFtbWFyKSAtPlxuICAgIHJldHVybiB1bmxlc3MgZ3JhbW1hcj8gYW5kIGdyYW1tYXIgaXNudCBAZ3JhbW1hclxuXG4gICAgQGdyYW1tYXIgPSBncmFtbWFyXG4gICAgQHJvb3RTY29wZURlc2NyaXB0b3IgPSBuZXcgU2NvcGVEZXNjcmlwdG9yKHNjb3BlczogW0BncmFtbWFyLnNjb3BlTmFtZV0pXG5cbiAgICBAZ3JhbW1hclVwZGF0ZURpc3Bvc2FibGU/LmRpc3Bvc2UoKVxuICAgIEBncmFtbWFyVXBkYXRlRGlzcG9zYWJsZSA9IEBncmFtbWFyLm9uRGlkVXBkYXRlID0+IEByZXRva2VuaXplTGluZXMoKVxuICAgIEBkaXNwb3NhYmxlcy5hZGQoQGdyYW1tYXJVcGRhdGVEaXNwb3NhYmxlKVxuXG4gICAgQHJldG9rZW5pemVMaW5lcygpXG5cbiAgICBAZW1pdHRlci5lbWl0ICdkaWQtY2hhbmdlLWdyYW1tYXInLCBncmFtbWFyXG5cbiAgZ2V0R3JhbW1hclNlbGVjdGlvbkNvbnRlbnQ6IC0+XG4gICAgQGJ1ZmZlci5nZXRUZXh0SW5SYW5nZShbWzAsIDBdLCBbMTAsIDBdXSlcblxuICBoYXNUb2tlbkZvclNlbGVjdG9yOiAoc2VsZWN0b3IpIC0+XG4gICAgZm9yIHRva2VuaXplZExpbmUgaW4gQHRva2VuaXplZExpbmVzIHdoZW4gdG9rZW5pemVkTGluZT9cbiAgICAgIGZvciB0b2tlbiBpbiB0b2tlbml6ZWRMaW5lLnRva2Vuc1xuICAgICAgICByZXR1cm4gdHJ1ZSBpZiBzZWxlY3Rvci5tYXRjaGVzKHRva2VuLnNjb3BlcylcbiAgICBmYWxzZVxuXG4gIHJldG9rZW5pemVMaW5lczogLT5cbiAgICByZXR1cm4gdW5sZXNzIEBhbGl2ZVxuICAgIEBmdWxseVRva2VuaXplZCA9IGZhbHNlXG4gICAgQHRva2VuaXplZExpbmVzID0gbmV3IEFycmF5KEBidWZmZXIuZ2V0TGluZUNvdW50KCkpXG4gICAgQGludmFsaWRSb3dzID0gW11cbiAgICBpZiBAbGFyZ2VGaWxlTW9kZSBvciBAZ3JhbW1hci5uYW1lIGlzICdOdWxsIEdyYW1tYXInXG4gICAgICBAbWFya1Rva2VuaXphdGlvbkNvbXBsZXRlKClcbiAgICBlbHNlXG4gICAgICBAaW52YWxpZGF0ZVJvdygwKVxuXG4gIHNldFZpc2libGU6IChAdmlzaWJsZSkgLT5cbiAgICBpZiBAdmlzaWJsZSBhbmQgQGdyYW1tYXIubmFtZSBpc250ICdOdWxsIEdyYW1tYXInIGFuZCBub3QgQGxhcmdlRmlsZU1vZGVcbiAgICAgIEB0b2tlbml6ZUluQmFja2dyb3VuZCgpXG5cbiAgZ2V0VGFiTGVuZ3RoOiAtPiBAdGFiTGVuZ3RoXG5cbiAgc2V0VGFiTGVuZ3RoOiAoQHRhYkxlbmd0aCkgLT5cblxuICB0b2tlbml6ZUluQmFja2dyb3VuZDogLT5cbiAgICByZXR1cm4gaWYgbm90IEB2aXNpYmxlIG9yIEBwZW5kaW5nQ2h1bmsgb3Igbm90IEBpc0FsaXZlKClcblxuICAgIEBwZW5kaW5nQ2h1bmsgPSB0cnVlXG4gICAgXy5kZWZlciA9PlxuICAgICAgQHBlbmRpbmdDaHVuayA9IGZhbHNlXG4gICAgICBAdG9rZW5pemVOZXh0Q2h1bmsoKSBpZiBAaXNBbGl2ZSgpIGFuZCBAYnVmZmVyLmlzQWxpdmUoKVxuXG4gIHRva2VuaXplTmV4dENodW5rOiAtPlxuICAgIHJvd3NSZW1haW5pbmcgPSBAY2h1bmtTaXplXG5cbiAgICB3aGlsZSBAZmlyc3RJbnZhbGlkUm93KCk/IGFuZCByb3dzUmVtYWluaW5nID4gMFxuICAgICAgc3RhcnRSb3cgPSBAaW52YWxpZFJvd3Muc2hpZnQoKVxuICAgICAgbGFzdFJvdyA9IEBnZXRMYXN0Um93KClcbiAgICAgIGNvbnRpbnVlIGlmIHN0YXJ0Um93ID4gbGFzdFJvd1xuXG4gICAgICByb3cgPSBzdGFydFJvd1xuICAgICAgbG9vcFxuICAgICAgICBwcmV2aW91c1N0YWNrID0gQHN0YWNrRm9yUm93KHJvdylcbiAgICAgICAgQHRva2VuaXplZExpbmVzW3Jvd10gPSBAYnVpbGRUb2tlbml6ZWRMaW5lRm9yUm93KHJvdywgQHN0YWNrRm9yUm93KHJvdyAtIDEpLCBAb3BlblNjb3Blc0ZvclJvdyhyb3cpKVxuICAgICAgICBpZiAtLXJvd3NSZW1haW5pbmcgaXMgMFxuICAgICAgICAgIGZpbGxlZFJlZ2lvbiA9IGZhbHNlXG4gICAgICAgICAgZW5kUm93ID0gcm93XG4gICAgICAgICAgYnJlYWtcbiAgICAgICAgaWYgcm93IGlzIGxhc3RSb3cgb3IgXy5pc0VxdWFsKEBzdGFja0ZvclJvdyhyb3cpLCBwcmV2aW91c1N0YWNrKVxuICAgICAgICAgIGZpbGxlZFJlZ2lvbiA9IHRydWVcbiAgICAgICAgICBlbmRSb3cgPSByb3dcbiAgICAgICAgICBicmVha1xuICAgICAgICByb3crK1xuXG4gICAgICBAdmFsaWRhdGVSb3coZW5kUm93KVxuICAgICAgQGludmFsaWRhdGVSb3coZW5kUm93ICsgMSkgdW5sZXNzIGZpbGxlZFJlZ2lvblxuXG4gICAgICBAZW1pdHRlci5lbWl0ICdkaWQtaW52YWxpZGF0ZS1yYW5nZScsIFJhbmdlKFBvaW50KHN0YXJ0Um93LCAwKSwgUG9pbnQoZW5kUm93ICsgMSwgMCkpXG5cbiAgICBpZiBAZmlyc3RJbnZhbGlkUm93KCk/XG4gICAgICBAdG9rZW5pemVJbkJhY2tncm91bmQoKVxuICAgIGVsc2VcbiAgICAgIEBtYXJrVG9rZW5pemF0aW9uQ29tcGxldGUoKVxuXG4gIG1hcmtUb2tlbml6YXRpb25Db21wbGV0ZTogLT5cbiAgICB1bmxlc3MgQGZ1bGx5VG9rZW5pemVkXG4gICAgICBAZW1pdHRlci5lbWl0ICdkaWQtdG9rZW5pemUnXG4gICAgQGZ1bGx5VG9rZW5pemVkID0gdHJ1ZVxuXG4gIGZpcnN0SW52YWxpZFJvdzogLT5cbiAgICBAaW52YWxpZFJvd3NbMF1cblxuICB2YWxpZGF0ZVJvdzogKHJvdykgLT5cbiAgICBAaW52YWxpZFJvd3Muc2hpZnQoKSB3aGlsZSBAaW52YWxpZFJvd3NbMF0gPD0gcm93XG4gICAgcmV0dXJuXG5cbiAgaW52YWxpZGF0ZVJvdzogKHJvdykgLT5cbiAgICBAaW52YWxpZFJvd3MucHVzaChyb3cpXG4gICAgQGludmFsaWRSb3dzLnNvcnQgKGEsIGIpIC0+IGEgLSBiXG4gICAgQHRva2VuaXplSW5CYWNrZ3JvdW5kKClcblxuICB1cGRhdGVJbnZhbGlkUm93czogKHN0YXJ0LCBlbmQsIGRlbHRhKSAtPlxuICAgIEBpbnZhbGlkUm93cyA9IEBpbnZhbGlkUm93cy5tYXAgKHJvdykgLT5cbiAgICAgIGlmIHJvdyA8IHN0YXJ0XG4gICAgICAgIHJvd1xuICAgICAgZWxzZSBpZiBzdGFydCA8PSByb3cgPD0gZW5kXG4gICAgICAgIGVuZCArIGRlbHRhICsgMVxuICAgICAgZWxzZSBpZiByb3cgPiBlbmRcbiAgICAgICAgcm93ICsgZGVsdGFcblxuICBidWZmZXJEaWRDaGFuZ2U6IChlKSAtPlxuICAgIEBjaGFuZ2VDb3VudCA9IEBidWZmZXIuY2hhbmdlQ291bnRcblxuICAgIHtvbGRSYW5nZSwgbmV3UmFuZ2V9ID0gZVxuICAgIHN0YXJ0ID0gb2xkUmFuZ2Uuc3RhcnQucm93XG4gICAgZW5kID0gb2xkUmFuZ2UuZW5kLnJvd1xuICAgIGRlbHRhID0gbmV3UmFuZ2UuZW5kLnJvdyAtIG9sZFJhbmdlLmVuZC5yb3dcbiAgICBvbGRMaW5lQ291bnQgPSBvbGRSYW5nZS5lbmQucm93IC0gb2xkUmFuZ2Uuc3RhcnQucm93ICsgMVxuICAgIG5ld0xpbmVDb3VudCA9IG5ld1JhbmdlLmVuZC5yb3cgLSBuZXdSYW5nZS5zdGFydC5yb3cgKyAxXG5cbiAgICBAdXBkYXRlSW52YWxpZFJvd3Moc3RhcnQsIGVuZCwgZGVsdGEpXG4gICAgcHJldmlvdXNFbmRTdGFjayA9IEBzdGFja0ZvclJvdyhlbmQpICMgdXNlZCBpbiBzcGlsbCBkZXRlY3Rpb24gYmVsb3dcbiAgICBpZiBAbGFyZ2VGaWxlTW9kZSBvciBAZ3JhbW1hci5uYW1lIGlzICdOdWxsIEdyYW1tYXInXG4gICAgICBfLnNwbGljZVdpdGhBcnJheShAdG9rZW5pemVkTGluZXMsIHN0YXJ0LCBvbGRMaW5lQ291bnQsIG5ldyBBcnJheShuZXdMaW5lQ291bnQpKVxuICAgIGVsc2VcbiAgICAgIG5ld1Rva2VuaXplZExpbmVzID0gQGJ1aWxkVG9rZW5pemVkTGluZXNGb3JSb3dzKHN0YXJ0LCBlbmQgKyBkZWx0YSwgQHN0YWNrRm9yUm93KHN0YXJ0IC0gMSksIEBvcGVuU2NvcGVzRm9yUm93KHN0YXJ0KSlcbiAgICAgIF8uc3BsaWNlV2l0aEFycmF5KEB0b2tlbml6ZWRMaW5lcywgc3RhcnQsIG9sZExpbmVDb3VudCwgbmV3VG9rZW5pemVkTGluZXMpXG4gICAgICBuZXdFbmRTdGFjayA9IEBzdGFja0ZvclJvdyhlbmQgKyBkZWx0YSlcbiAgICAgIGlmIG5ld0VuZFN0YWNrIGFuZCBub3QgXy5pc0VxdWFsKG5ld0VuZFN0YWNrLCBwcmV2aW91c0VuZFN0YWNrKVxuICAgICAgICBAaW52YWxpZGF0ZVJvdyhlbmQgKyBkZWx0YSArIDEpXG5cbiAgaXNGb2xkYWJsZUF0Um93OiAocm93KSAtPlxuICAgIEBpc0ZvbGRhYmxlQ29kZUF0Um93KHJvdykgb3IgQGlzRm9sZGFibGVDb21tZW50QXRSb3cocm93KVxuXG4gICMgUmV0dXJucyBhIHtCb29sZWFufSBpbmRpY2F0aW5nIHdoZXRoZXIgdGhlIGdpdmVuIGJ1ZmZlciByb3cgc3RhcnRzXG4gICMgYSBhIGZvbGRhYmxlIHJvdyByYW5nZSBkdWUgdG8gdGhlIGNvZGUncyBpbmRlbnRhdGlvbiBwYXR0ZXJucy5cbiAgaXNGb2xkYWJsZUNvZGVBdFJvdzogKHJvdykgLT5cbiAgICBpZiAwIDw9IHJvdyA8PSBAYnVmZmVyLmdldExhc3RSb3coKVxuICAgICAgbmV4dFJvdyA9IEBidWZmZXIubmV4dE5vbkJsYW5rUm93KHJvdylcbiAgICAgIHRva2VuaXplZExpbmUgPSBAdG9rZW5pemVkTGluZXNbcm93XVxuICAgICAgaWYgQGJ1ZmZlci5pc1Jvd0JsYW5rKHJvdykgb3IgdG9rZW5pemVkTGluZT8uaXNDb21tZW50KCkgb3Igbm90IG5leHRSb3c/XG4gICAgICAgIGZhbHNlXG4gICAgICBlbHNlXG4gICAgICAgIEBpbmRlbnRMZXZlbEZvclJvdyhuZXh0Um93KSA+IEBpbmRlbnRMZXZlbEZvclJvdyhyb3cpXG4gICAgZWxzZVxuICAgICAgZmFsc2VcblxuICBpc0ZvbGRhYmxlQ29tbWVudEF0Um93OiAocm93KSAtPlxuICAgIHByZXZpb3VzUm93ID0gcm93IC0gMVxuICAgIG5leHRSb3cgPSByb3cgKyAxXG4gICAgaWYgbmV4dFJvdyA+IEBidWZmZXIuZ2V0TGFzdFJvdygpXG4gICAgICBmYWxzZVxuICAgIGVsc2VcbiAgICAgIEJvb2xlYW4oXG4gICAgICAgIG5vdCAoQHRva2VuaXplZExpbmVzW3ByZXZpb3VzUm93XT8uaXNDb21tZW50KCkpIGFuZFxuICAgICAgICBAdG9rZW5pemVkTGluZXNbcm93XT8uaXNDb21tZW50KCkgYW5kXG4gICAgICAgIEB0b2tlbml6ZWRMaW5lc1tuZXh0Um93XT8uaXNDb21tZW50KClcbiAgICAgIClcblxuICBidWlsZFRva2VuaXplZExpbmVzRm9yUm93czogKHN0YXJ0Um93LCBlbmRSb3csIHN0YXJ0aW5nU3RhY2ssIHN0YXJ0aW5nb3BlblNjb3BlcykgLT5cbiAgICBydWxlU3RhY2sgPSBzdGFydGluZ1N0YWNrXG4gICAgb3BlblNjb3BlcyA9IHN0YXJ0aW5nb3BlblNjb3Blc1xuICAgIHN0b3BUb2tlbml6aW5nQXQgPSBzdGFydFJvdyArIEBjaHVua1NpemVcbiAgICB0b2tlbml6ZWRMaW5lcyA9IGZvciByb3cgaW4gW3N0YXJ0Um93Li5lbmRSb3ddIGJ5IDFcbiAgICAgIGlmIChydWxlU3RhY2sgb3Igcm93IGlzIDApIGFuZCByb3cgPCBzdG9wVG9rZW5pemluZ0F0XG4gICAgICAgIHRva2VuaXplZExpbmUgPSBAYnVpbGRUb2tlbml6ZWRMaW5lRm9yUm93KHJvdywgcnVsZVN0YWNrLCBvcGVuU2NvcGVzKVxuICAgICAgICBydWxlU3RhY2sgPSB0b2tlbml6ZWRMaW5lLnJ1bGVTdGFja1xuICAgICAgICBvcGVuU2NvcGVzID0gQHNjb3Blc0Zyb21UYWdzKG9wZW5TY29wZXMsIHRva2VuaXplZExpbmUudGFncylcbiAgICAgIGVsc2VcbiAgICAgICAgdG9rZW5pemVkTGluZSA9IHVuZGVmaW5lZFxuICAgICAgdG9rZW5pemVkTGluZVxuXG4gICAgaWYgZW5kUm93ID49IHN0b3BUb2tlbml6aW5nQXRcbiAgICAgIEBpbnZhbGlkYXRlUm93KHN0b3BUb2tlbml6aW5nQXQpXG4gICAgICBAdG9rZW5pemVJbkJhY2tncm91bmQoKVxuXG4gICAgdG9rZW5pemVkTGluZXNcblxuICBidWlsZFRva2VuaXplZExpbmVGb3JSb3c6IChyb3csIHJ1bGVTdGFjaywgb3BlblNjb3BlcykgLT5cbiAgICBAYnVpbGRUb2tlbml6ZWRMaW5lRm9yUm93V2l0aFRleHQocm93LCBAYnVmZmVyLmxpbmVGb3JSb3cocm93KSwgcnVsZVN0YWNrLCBvcGVuU2NvcGVzKVxuXG4gIGJ1aWxkVG9rZW5pemVkTGluZUZvclJvd1dpdGhUZXh0OiAocm93LCB0ZXh0LCBydWxlU3RhY2sgPSBAc3RhY2tGb3JSb3cocm93IC0gMSksIG9wZW5TY29wZXMgPSBAb3BlblNjb3Blc0ZvclJvdyhyb3cpKSAtPlxuICAgIGxpbmVFbmRpbmcgPSBAYnVmZmVyLmxpbmVFbmRpbmdGb3JSb3cocm93KVxuICAgIHt0YWdzLCBydWxlU3RhY2t9ID0gQGdyYW1tYXIudG9rZW5pemVMaW5lKHRleHQsIHJ1bGVTdGFjaywgcm93IGlzIDAsIGZhbHNlKVxuICAgIG5ldyBUb2tlbml6ZWRMaW5lKHtvcGVuU2NvcGVzLCB0ZXh0LCB0YWdzLCBydWxlU3RhY2ssIGxpbmVFbmRpbmcsIEB0b2tlbkl0ZXJhdG9yLCBAZ3JhbW1hcn0pXG5cbiAgdG9rZW5pemVkTGluZUZvclJvdzogKGJ1ZmZlclJvdykgLT5cbiAgICBpZiAwIDw9IGJ1ZmZlclJvdyA8PSBAYnVmZmVyLmdldExhc3RSb3coKVxuICAgICAgaWYgdG9rZW5pemVkTGluZSA9IEB0b2tlbml6ZWRMaW5lc1tidWZmZXJSb3ddXG4gICAgICAgIHRva2VuaXplZExpbmVcbiAgICAgIGVsc2VcbiAgICAgICAgdGV4dCA9IEBidWZmZXIubGluZUZvclJvdyhidWZmZXJSb3cpXG4gICAgICAgIGxpbmVFbmRpbmcgPSBAYnVmZmVyLmxpbmVFbmRpbmdGb3JSb3coYnVmZmVyUm93KVxuICAgICAgICB0YWdzID0gW0BncmFtbWFyLnN0YXJ0SWRGb3JTY29wZShAZ3JhbW1hci5zY29wZU5hbWUpLCB0ZXh0Lmxlbmd0aCwgQGdyYW1tYXIuZW5kSWRGb3JTY29wZShAZ3JhbW1hci5zY29wZU5hbWUpXVxuICAgICAgICBAdG9rZW5pemVkTGluZXNbYnVmZmVyUm93XSA9IG5ldyBUb2tlbml6ZWRMaW5lKHtvcGVuU2NvcGVzOiBbXSwgdGV4dCwgdGFncywgbGluZUVuZGluZywgQHRva2VuSXRlcmF0b3IsIEBncmFtbWFyfSlcblxuICB0b2tlbml6ZWRMaW5lc0ZvclJvd3M6IChzdGFydFJvdywgZW5kUm93KSAtPlxuICAgIGZvciByb3cgaW4gW3N0YXJ0Um93Li5lbmRSb3ddIGJ5IDFcbiAgICAgIEB0b2tlbml6ZWRMaW5lRm9yUm93KHJvdylcblxuICBzdGFja0ZvclJvdzogKGJ1ZmZlclJvdykgLT5cbiAgICBAdG9rZW5pemVkTGluZXNbYnVmZmVyUm93XT8ucnVsZVN0YWNrXG5cbiAgb3BlblNjb3Blc0ZvclJvdzogKGJ1ZmZlclJvdykgLT5cbiAgICBpZiBwcmVjZWRpbmdMaW5lID0gQHRva2VuaXplZExpbmVzW2J1ZmZlclJvdyAtIDFdXG4gICAgICBAc2NvcGVzRnJvbVRhZ3MocHJlY2VkaW5nTGluZS5vcGVuU2NvcGVzLCBwcmVjZWRpbmdMaW5lLnRhZ3MpXG4gICAgZWxzZVxuICAgICAgW11cblxuICBzY29wZXNGcm9tVGFnczogKHN0YXJ0aW5nU2NvcGVzLCB0YWdzKSAtPlxuICAgIHNjb3BlcyA9IHN0YXJ0aW5nU2NvcGVzLnNsaWNlKClcbiAgICBmb3IgdGFnIGluIHRhZ3Mgd2hlbiB0YWcgPCAwXG4gICAgICBpZiAodGFnICUgMikgaXMgLTFcbiAgICAgICAgc2NvcGVzLnB1c2godGFnKVxuICAgICAgZWxzZVxuICAgICAgICBtYXRjaGluZ1N0YXJ0VGFnID0gdGFnICsgMVxuICAgICAgICBsb29wXG4gICAgICAgICAgYnJlYWsgaWYgc2NvcGVzLnBvcCgpIGlzIG1hdGNoaW5nU3RhcnRUYWdcbiAgICAgICAgICBpZiBzY29wZXMubGVuZ3RoIGlzIDBcbiAgICAgICAgICAgIEBhc3NlcnQgZmFsc2UsIFwiRW5jb3VudGVyZWQgYW4gdW5tYXRjaGVkIHNjb3BlIGVuZCB0YWcuXCIsIChlcnJvcikgPT5cbiAgICAgICAgICAgICAgZXJyb3IubWV0YWRhdGEgPSB7XG4gICAgICAgICAgICAgICAgZ3JhbW1hclNjb3BlTmFtZTogQGdyYW1tYXIuc2NvcGVOYW1lXG4gICAgICAgICAgICAgICAgdW5tYXRjaGVkRW5kVGFnOiBAZ3JhbW1hci5zY29wZUZvcklkKHRhZylcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBwYXRoID0gcmVxdWlyZSAncGF0aCdcbiAgICAgICAgICAgICAgZXJyb3IucHJpdmF0ZU1ldGFkYXRhRGVzY3JpcHRpb24gPSBcIlRoZSBjb250ZW50cyBvZiBgI3twYXRoLmJhc2VuYW1lKEBidWZmZXIuZ2V0UGF0aCgpKX1gXCJcbiAgICAgICAgICAgICAgZXJyb3IucHJpdmF0ZU1ldGFkYXRhID0ge1xuICAgICAgICAgICAgICAgIGZpbGVQYXRoOiBAYnVmZmVyLmdldFBhdGgoKVxuICAgICAgICAgICAgICAgIGZpbGVDb250ZW50czogQGJ1ZmZlci5nZXRUZXh0KClcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnJlYWtcbiAgICBzY29wZXNcblxuICBpbmRlbnRMZXZlbEZvclJvdzogKGJ1ZmZlclJvdykgLT5cbiAgICBsaW5lID0gQGJ1ZmZlci5saW5lRm9yUm93KGJ1ZmZlclJvdylcbiAgICBpbmRlbnRMZXZlbCA9IDBcblxuICAgIGlmIGxpbmUgaXMgJydcbiAgICAgIG5leHRSb3cgPSBidWZmZXJSb3cgKyAxXG4gICAgICBsaW5lQ291bnQgPSBAZ2V0TGluZUNvdW50KClcbiAgICAgIHdoaWxlIG5leHRSb3cgPCBsaW5lQ291bnRcbiAgICAgICAgbmV4dExpbmUgPSBAYnVmZmVyLmxpbmVGb3JSb3cobmV4dFJvdylcbiAgICAgICAgdW5sZXNzIG5leHRMaW5lIGlzICcnXG4gICAgICAgICAgaW5kZW50TGV2ZWwgPSBNYXRoLmNlaWwoQGluZGVudExldmVsRm9yTGluZShuZXh0TGluZSkpXG4gICAgICAgICAgYnJlYWtcbiAgICAgICAgbmV4dFJvdysrXG5cbiAgICAgIHByZXZpb3VzUm93ID0gYnVmZmVyUm93IC0gMVxuICAgICAgd2hpbGUgcHJldmlvdXNSb3cgPj0gMFxuICAgICAgICBwcmV2aW91c0xpbmUgPSBAYnVmZmVyLmxpbmVGb3JSb3cocHJldmlvdXNSb3cpXG4gICAgICAgIHVubGVzcyBwcmV2aW91c0xpbmUgaXMgJydcbiAgICAgICAgICBpbmRlbnRMZXZlbCA9IE1hdGgubWF4KE1hdGguY2VpbChAaW5kZW50TGV2ZWxGb3JMaW5lKHByZXZpb3VzTGluZSkpLCBpbmRlbnRMZXZlbClcbiAgICAgICAgICBicmVha1xuICAgICAgICBwcmV2aW91c1Jvdy0tXG5cbiAgICAgIGluZGVudExldmVsXG4gICAgZWxzZVxuICAgICAgQGluZGVudExldmVsRm9yTGluZShsaW5lKVxuXG4gIGluZGVudExldmVsRm9yTGluZTogKGxpbmUpIC0+XG4gICAgaW5kZW50TGVuZ3RoID0gMFxuICAgIGZvciBjaGFyIGluIGxpbmVcbiAgICAgIGlmIGNoYXIgaXMgJ1xcdCdcbiAgICAgICAgaW5kZW50TGVuZ3RoICs9IEBnZXRUYWJMZW5ndGgoKSAtIChpbmRlbnRMZW5ndGggJSBAZ2V0VGFiTGVuZ3RoKCkpXG4gICAgICBlbHNlIGlmIGNoYXIgaXMgJyAnXG4gICAgICAgIGluZGVudExlbmd0aCsrXG4gICAgICBlbHNlXG4gICAgICAgIGJyZWFrXG5cbiAgICBpbmRlbnRMZW5ndGggLyBAZ2V0VGFiTGVuZ3RoKClcblxuICBzY29wZURlc2NyaXB0b3JGb3JQb3NpdGlvbjogKHBvc2l0aW9uKSAtPlxuICAgIHtyb3csIGNvbHVtbn0gPSBAYnVmZmVyLmNsaXBQb3NpdGlvbihQb2ludC5mcm9tT2JqZWN0KHBvc2l0aW9uKSlcblxuICAgIGl0ZXJhdG9yID0gQHRva2VuaXplZExpbmVGb3JSb3cocm93KS5nZXRUb2tlbkl0ZXJhdG9yKClcbiAgICB3aGlsZSBpdGVyYXRvci5uZXh0KClcbiAgICAgIGlmIGl0ZXJhdG9yLmdldEJ1ZmZlckVuZCgpID4gY29sdW1uXG4gICAgICAgIHNjb3BlcyA9IGl0ZXJhdG9yLmdldFNjb3BlcygpXG4gICAgICAgIGJyZWFrXG5cbiAgICAjIHJlYnVpbGQgc2NvcGUgb2YgbGFzdCB0b2tlbiBpZiB3ZSBpdGVyYXRlZCBvZmYgdGhlIGVuZFxuICAgIHVubGVzcyBzY29wZXM/XG4gICAgICBzY29wZXMgPSBpdGVyYXRvci5nZXRTY29wZXMoKVxuICAgICAgc2NvcGVzLnB1c2goaXRlcmF0b3IuZ2V0U2NvcGVFbmRzKCkucmV2ZXJzZSgpLi4uKVxuXG4gICAgbmV3IFNjb3BlRGVzY3JpcHRvcih7c2NvcGVzfSlcblxuICB0b2tlbkZvclBvc2l0aW9uOiAocG9zaXRpb24pIC0+XG4gICAge3JvdywgY29sdW1ufSA9IFBvaW50LmZyb21PYmplY3QocG9zaXRpb24pXG4gICAgQHRva2VuaXplZExpbmVGb3JSb3cocm93KS50b2tlbkF0QnVmZmVyQ29sdW1uKGNvbHVtbilcblxuICB0b2tlblN0YXJ0UG9zaXRpb25Gb3JQb3NpdGlvbjogKHBvc2l0aW9uKSAtPlxuICAgIHtyb3csIGNvbHVtbn0gPSBQb2ludC5mcm9tT2JqZWN0KHBvc2l0aW9uKVxuICAgIGNvbHVtbiA9IEB0b2tlbml6ZWRMaW5lRm9yUm93KHJvdykudG9rZW5TdGFydENvbHVtbkZvckJ1ZmZlckNvbHVtbihjb2x1bW4pXG4gICAgbmV3IFBvaW50KHJvdywgY29sdW1uKVxuXG4gIGJ1ZmZlclJhbmdlRm9yU2NvcGVBdFBvc2l0aW9uOiAoc2VsZWN0b3IsIHBvc2l0aW9uKSAtPlxuICAgIHBvc2l0aW9uID0gUG9pbnQuZnJvbU9iamVjdChwb3NpdGlvbilcblxuICAgIHtvcGVuU2NvcGVzLCB0YWdzfSA9IEB0b2tlbml6ZWRMaW5lRm9yUm93KHBvc2l0aW9uLnJvdylcbiAgICBzY29wZXMgPSBvcGVuU2NvcGVzLm1hcCAodGFnKSA9PiBAZ3JhbW1hci5zY29wZUZvcklkKHRhZylcblxuICAgIHN0YXJ0Q29sdW1uID0gMFxuICAgIGZvciB0YWcsIHRva2VuSW5kZXggaW4gdGFnc1xuICAgICAgaWYgdGFnIDwgMFxuICAgICAgICBpZiB0YWcgJSAyIGlzIC0xXG4gICAgICAgICAgc2NvcGVzLnB1c2goQGdyYW1tYXIuc2NvcGVGb3JJZCh0YWcpKVxuICAgICAgICBlbHNlXG4gICAgICAgICAgc2NvcGVzLnBvcCgpXG4gICAgICBlbHNlXG4gICAgICAgIGVuZENvbHVtbiA9IHN0YXJ0Q29sdW1uICsgdGFnXG4gICAgICAgIGlmIGVuZENvbHVtbiA+PSBwb3NpdGlvbi5jb2x1bW5cbiAgICAgICAgICBicmVha1xuICAgICAgICBlbHNlXG4gICAgICAgICAgc3RhcnRDb2x1bW4gPSBlbmRDb2x1bW5cblxuXG4gICAgcmV0dXJuIHVubGVzcyBzZWxlY3Rvck1hdGNoZXNBbnlTY29wZShzZWxlY3Rvciwgc2NvcGVzKVxuXG4gICAgc3RhcnRTY29wZXMgPSBzY29wZXMuc2xpY2UoKVxuICAgIGZvciBzdGFydFRva2VuSW5kZXggaW4gWyh0b2tlbkluZGV4IC0gMSkuLjBdIGJ5IC0xXG4gICAgICB0YWcgPSB0YWdzW3N0YXJ0VG9rZW5JbmRleF1cbiAgICAgIGlmIHRhZyA8IDBcbiAgICAgICAgaWYgdGFnICUgMiBpcyAtMVxuICAgICAgICAgIHN0YXJ0U2NvcGVzLnBvcCgpXG4gICAgICAgIGVsc2VcbiAgICAgICAgICBzdGFydFNjb3Blcy5wdXNoKEBncmFtbWFyLnNjb3BlRm9ySWQodGFnKSlcbiAgICAgIGVsc2VcbiAgICAgICAgYnJlYWsgdW5sZXNzIHNlbGVjdG9yTWF0Y2hlc0FueVNjb3BlKHNlbGVjdG9yLCBzdGFydFNjb3BlcylcbiAgICAgICAgc3RhcnRDb2x1bW4gLT0gdGFnXG5cbiAgICBlbmRTY29wZXMgPSBzY29wZXMuc2xpY2UoKVxuICAgIGZvciBlbmRUb2tlbkluZGV4IGluIFsodG9rZW5JbmRleCArIDEpLi4udGFncy5sZW5ndGhdIGJ5IDFcbiAgICAgIHRhZyA9IHRhZ3NbZW5kVG9rZW5JbmRleF1cbiAgICAgIGlmIHRhZyA8IDBcbiAgICAgICAgaWYgdGFnICUgMiBpcyAtMVxuICAgICAgICAgIGVuZFNjb3Blcy5wdXNoKEBncmFtbWFyLnNjb3BlRm9ySWQodGFnKSlcbiAgICAgICAgZWxzZVxuICAgICAgICAgIGVuZFNjb3Blcy5wb3AoKVxuICAgICAgZWxzZVxuICAgICAgICBicmVhayB1bmxlc3Mgc2VsZWN0b3JNYXRjaGVzQW55U2NvcGUoc2VsZWN0b3IsIGVuZFNjb3BlcylcbiAgICAgICAgZW5kQ29sdW1uICs9IHRhZ1xuXG4gICAgbmV3IFJhbmdlKG5ldyBQb2ludChwb3NpdGlvbi5yb3csIHN0YXJ0Q29sdW1uKSwgbmV3IFBvaW50KHBvc2l0aW9uLnJvdywgZW5kQ29sdW1uKSlcblxuICAjIEdldHMgdGhlIHJvdyBudW1iZXIgb2YgdGhlIGxhc3QgbGluZS5cbiAgI1xuICAjIFJldHVybnMgYSB7TnVtYmVyfS5cbiAgZ2V0TGFzdFJvdzogLT5cbiAgICBAYnVmZmVyLmdldExhc3RSb3coKVxuXG4gIGdldExpbmVDb3VudDogLT5cbiAgICBAYnVmZmVyLmdldExpbmVDb3VudCgpXG5cbiAgbG9nTGluZXM6IChzdGFydD0wLCBlbmQ9QGJ1ZmZlci5nZXRMYXN0Um93KCkpIC0+XG4gICAgZm9yIHJvdyBpbiBbc3RhcnQuLmVuZF1cbiAgICAgIGxpbmUgPSBAdG9rZW5pemVkTGluZXNbcm93XS50ZXh0XG4gICAgICBjb25zb2xlLmxvZyByb3csIGxpbmUsIGxpbmUubGVuZ3RoXG4gICAgcmV0dXJuXG5cbnNlbGVjdG9yTWF0Y2hlc0FueVNjb3BlID0gKHNlbGVjdG9yLCBzY29wZXMpIC0+XG4gIHRhcmdldENsYXNzZXMgPSBzZWxlY3Rvci5yZXBsYWNlKC9eXFwuLywgJycpLnNwbGl0KCcuJylcbiAgXy5hbnkgc2NvcGVzLCAoc2NvcGUpIC0+XG4gICAgc2NvcGVDbGFzc2VzID0gc2NvcGUuc3BsaXQoJy4nKVxuICAgIF8uaXNTdWJzZXQodGFyZ2V0Q2xhc3Nlcywgc2NvcGVDbGFzc2VzKVxuIl19
