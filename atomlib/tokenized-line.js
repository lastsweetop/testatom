(function() {
  var CommentScopeRegex, Token, TokenizedLine, idCounter;

  Token = require('./token');

  CommentScopeRegex = /(\b|\.)comment/;

  idCounter = 1;

  module.exports = TokenizedLine = (function() {
    function TokenizedLine(properties) {
      this.id = idCounter++;
      if (properties == null) {
        return;
      }
      this.openScopes = properties.openScopes, this.text = properties.text, this.tags = properties.tags, this.ruleStack = properties.ruleStack, this.tokenIterator = properties.tokenIterator, this.grammar = properties.grammar;
    }

    TokenizedLine.prototype.getTokenIterator = function() {
      return this.tokenIterator.reset(this);
    };

    Object.defineProperty(TokenizedLine.prototype, 'tokens', {
      get: function() {
        var iterator, tokens;
        iterator = this.getTokenIterator();
        tokens = [];
        while (iterator.next()) {
          tokens.push(new Token({
            value: iterator.getText(),
            scopes: iterator.getScopes().slice()
          }));
        }
        return tokens;
      }
    });

    TokenizedLine.prototype.tokenAtBufferColumn = function(bufferColumn) {
      return this.tokens[this.tokenIndexAtBufferColumn(bufferColumn)];
    };

    TokenizedLine.prototype.tokenIndexAtBufferColumn = function(bufferColumn) {
      var column, i, index, len, ref, token;
      column = 0;
      ref = this.tokens;
      for (index = i = 0, len = ref.length; i < len; index = ++i) {
        token = ref[index];
        column += token.value.length;
        if (column > bufferColumn) {
          return index;
        }
      }
      return index - 1;
    };

    TokenizedLine.prototype.tokenStartColumnForBufferColumn = function(bufferColumn) {
      var delta, i, len, nextDelta, ref, token;
      delta = 0;
      ref = this.tokens;
      for (i = 0, len = ref.length; i < len; i++) {
        token = ref[i];
        nextDelta = delta + token.bufferDelta;
        if (nextDelta > bufferColumn) {
          break;
        }
        delta = nextDelta;
      }
      return delta;
    };

    TokenizedLine.prototype.isComment = function() {
      var i, j, len, len1, ref, ref1, tag;
      if (this.isCommentLine != null) {
        return this.isCommentLine;
      }
      this.isCommentLine = false;
      ref = this.openScopes;
      for (i = 0, len = ref.length; i < len; i++) {
        tag = ref[i];
        if (this.isCommentOpenTag(tag)) {
          this.isCommentLine = true;
          return this.isCommentLine;
        }
      }
      ref1 = this.tags;
      for (j = 0, len1 = ref1.length; j < len1; j++) {
        tag = ref1[j];
        if (this.isCommentOpenTag(tag)) {
          this.isCommentLine = true;
          return this.isCommentLine;
        }
      }
      return this.isCommentLine;
    };

    TokenizedLine.prototype.isCommentOpenTag = function(tag) {
      var scope;
      if (tag < 0 && (tag & 1) === 1) {
        scope = this.grammar.scopeForId(tag);
        if (CommentScopeRegex.test(scope)) {
          return true;
        }
      }
      return false;
    };

    TokenizedLine.prototype.tokenAtIndex = function(index) {
      return this.tokens[index];
    };

    TokenizedLine.prototype.getTokenCount = function() {
      var count, i, len, ref, tag;
      count = 0;
      ref = this.tags;
      for (i = 0, len = ref.length; i < len; i++) {
        tag = ref[i];
        if (tag >= 0) {
          count++;
        }
      }
      return count;
    };

    return TokenizedLine;

  })();

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiL1VzZXJzL2Rpc3RpbGxlci9hdG9tL291dC9hcHAvc3JjL3Rva2VuaXplZC1saW5lLmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUFBLE1BQUE7O0VBQUEsS0FBQSxHQUFRLE9BQUEsQ0FBUSxTQUFSOztFQUNSLGlCQUFBLEdBQXFCOztFQUVyQixTQUFBLEdBQVk7O0VBRVosTUFBTSxDQUFDLE9BQVAsR0FDTTtJQUNTLHVCQUFDLFVBQUQ7TUFDWCxJQUFDLENBQUEsRUFBRCxHQUFNLFNBQUE7TUFFTixJQUFjLGtCQUFkO0FBQUEsZUFBQTs7TUFFQyxJQUFDLENBQUEsd0JBQUEsVUFBRixFQUFjLElBQUMsQ0FBQSxrQkFBQSxJQUFmLEVBQXFCLElBQUMsQ0FBQSxrQkFBQSxJQUF0QixFQUE0QixJQUFDLENBQUEsdUJBQUEsU0FBN0IsRUFBd0MsSUFBQyxDQUFBLDJCQUFBLGFBQXpDLEVBQXdELElBQUMsQ0FBQSxxQkFBQTtJQUw5Qzs7NEJBT2IsZ0JBQUEsR0FBa0IsU0FBQTthQUFHLElBQUMsQ0FBQSxhQUFhLENBQUMsS0FBZixDQUFxQixJQUFyQjtJQUFIOztJQUVsQixNQUFNLENBQUMsY0FBUCxDQUFzQixhQUFDLENBQUEsU0FBdkIsRUFBa0MsUUFBbEMsRUFBNEM7TUFBQSxHQUFBLEVBQUssU0FBQTtBQUMvQyxZQUFBO1FBQUEsUUFBQSxHQUFXLElBQUMsQ0FBQSxnQkFBRCxDQUFBO1FBQ1gsTUFBQSxHQUFTO0FBRVQsZUFBTSxRQUFRLENBQUMsSUFBVCxDQUFBLENBQU47VUFDRSxNQUFNLENBQUMsSUFBUCxDQUFnQixJQUFBLEtBQUEsQ0FBTTtZQUNwQixLQUFBLEVBQU8sUUFBUSxDQUFDLE9BQVQsQ0FBQSxDQURhO1lBRXBCLE1BQUEsRUFBUSxRQUFRLENBQUMsU0FBVCxDQUFBLENBQW9CLENBQUMsS0FBckIsQ0FBQSxDQUZZO1dBQU4sQ0FBaEI7UUFERjtlQU1BO01BVitDLENBQUw7S0FBNUM7OzRCQVlBLG1CQUFBLEdBQXFCLFNBQUMsWUFBRDthQUNuQixJQUFDLENBQUEsTUFBTyxDQUFBLElBQUMsQ0FBQSx3QkFBRCxDQUEwQixZQUExQixDQUFBO0lBRFc7OzRCQUdyQix3QkFBQSxHQUEwQixTQUFDLFlBQUQ7QUFDeEIsVUFBQTtNQUFBLE1BQUEsR0FBUztBQUNUO0FBQUEsV0FBQSxxREFBQTs7UUFDRSxNQUFBLElBQVUsS0FBSyxDQUFDLEtBQUssQ0FBQztRQUN0QixJQUFnQixNQUFBLEdBQVMsWUFBekI7QUFBQSxpQkFBTyxNQUFQOztBQUZGO2FBR0EsS0FBQSxHQUFRO0lBTGdCOzs0QkFPMUIsK0JBQUEsR0FBaUMsU0FBQyxZQUFEO0FBQy9CLFVBQUE7TUFBQSxLQUFBLEdBQVE7QUFDUjtBQUFBLFdBQUEscUNBQUE7O1FBQ0UsU0FBQSxHQUFZLEtBQUEsR0FBUSxLQUFLLENBQUM7UUFDMUIsSUFBUyxTQUFBLEdBQVksWUFBckI7QUFBQSxnQkFBQTs7UUFDQSxLQUFBLEdBQVE7QUFIVjthQUlBO0lBTitCOzs0QkFRakMsU0FBQSxHQUFXLFNBQUE7QUFDVCxVQUFBO01BQUEsSUFBeUIsMEJBQXpCO0FBQUEsZUFBTyxJQUFDLENBQUEsY0FBUjs7TUFFQSxJQUFDLENBQUEsYUFBRCxHQUFpQjtBQUVqQjtBQUFBLFdBQUEscUNBQUE7O1FBQ0UsSUFBRyxJQUFDLENBQUEsZ0JBQUQsQ0FBa0IsR0FBbEIsQ0FBSDtVQUNFLElBQUMsQ0FBQSxhQUFELEdBQWlCO0FBQ2pCLGlCQUFPLElBQUMsQ0FBQSxjQUZWOztBQURGO0FBS0E7QUFBQSxXQUFBLHdDQUFBOztRQUNFLElBQUcsSUFBQyxDQUFBLGdCQUFELENBQWtCLEdBQWxCLENBQUg7VUFDRSxJQUFDLENBQUEsYUFBRCxHQUFpQjtBQUNqQixpQkFBTyxJQUFDLENBQUEsY0FGVjs7QUFERjthQUtBLElBQUMsQ0FBQTtJQWZROzs0QkFpQlgsZ0JBQUEsR0FBa0IsU0FBQyxHQUFEO0FBQ2hCLFVBQUE7TUFBQSxJQUFHLEdBQUEsR0FBTSxDQUFOLElBQVksQ0FBQyxHQUFBLEdBQU0sQ0FBUCxDQUFBLEtBQWEsQ0FBNUI7UUFDRSxLQUFBLEdBQVEsSUFBQyxDQUFBLE9BQU8sQ0FBQyxVQUFULENBQW9CLEdBQXBCO1FBQ1IsSUFBRyxpQkFBaUIsQ0FBQyxJQUFsQixDQUF1QixLQUF2QixDQUFIO0FBQ0UsaUJBQU8sS0FEVDtTQUZGOzthQUlBO0lBTGdCOzs0QkFPbEIsWUFBQSxHQUFjLFNBQUMsS0FBRDthQUNaLElBQUMsQ0FBQSxNQUFPLENBQUEsS0FBQTtJQURJOzs0QkFHZCxhQUFBLEdBQWUsU0FBQTtBQUNiLFVBQUE7TUFBQSxLQUFBLEdBQVE7QUFDUjtBQUFBLFdBQUEscUNBQUE7O1lBQThCLEdBQUEsSUFBTztVQUFyQyxLQUFBOztBQUFBO2FBQ0E7SUFIYTs7Ozs7QUF6RWpCIiwic291cmNlc0NvbnRlbnQiOlsiVG9rZW4gPSByZXF1aXJlICcuL3Rva2VuJ1xuQ29tbWVudFNjb3BlUmVnZXggID0gLyhcXGJ8XFwuKWNvbW1lbnQvXG5cbmlkQ291bnRlciA9IDFcblxubW9kdWxlLmV4cG9ydHMgPVxuY2xhc3MgVG9rZW5pemVkTGluZVxuICBjb25zdHJ1Y3RvcjogKHByb3BlcnRpZXMpIC0+XG4gICAgQGlkID0gaWRDb3VudGVyKytcblxuICAgIHJldHVybiB1bmxlc3MgcHJvcGVydGllcz9cblxuICAgIHtAb3BlblNjb3BlcywgQHRleHQsIEB0YWdzLCBAcnVsZVN0YWNrLCBAdG9rZW5JdGVyYXRvciwgQGdyYW1tYXJ9ID0gcHJvcGVydGllc1xuXG4gIGdldFRva2VuSXRlcmF0b3I6IC0+IEB0b2tlbkl0ZXJhdG9yLnJlc2V0KHRoaXMpXG5cbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5IEBwcm90b3R5cGUsICd0b2tlbnMnLCBnZXQ6IC0+XG4gICAgaXRlcmF0b3IgPSBAZ2V0VG9rZW5JdGVyYXRvcigpXG4gICAgdG9rZW5zID0gW11cblxuICAgIHdoaWxlIGl0ZXJhdG9yLm5leHQoKVxuICAgICAgdG9rZW5zLnB1c2gobmV3IFRva2VuKHtcbiAgICAgICAgdmFsdWU6IGl0ZXJhdG9yLmdldFRleHQoKVxuICAgICAgICBzY29wZXM6IGl0ZXJhdG9yLmdldFNjb3BlcygpLnNsaWNlKClcbiAgICAgIH0pKVxuXG4gICAgdG9rZW5zXG5cbiAgdG9rZW5BdEJ1ZmZlckNvbHVtbjogKGJ1ZmZlckNvbHVtbikgLT5cbiAgICBAdG9rZW5zW0B0b2tlbkluZGV4QXRCdWZmZXJDb2x1bW4oYnVmZmVyQ29sdW1uKV1cblxuICB0b2tlbkluZGV4QXRCdWZmZXJDb2x1bW46IChidWZmZXJDb2x1bW4pIC0+XG4gICAgY29sdW1uID0gMFxuICAgIGZvciB0b2tlbiwgaW5kZXggaW4gQHRva2Vuc1xuICAgICAgY29sdW1uICs9IHRva2VuLnZhbHVlLmxlbmd0aFxuICAgICAgcmV0dXJuIGluZGV4IGlmIGNvbHVtbiA+IGJ1ZmZlckNvbHVtblxuICAgIGluZGV4IC0gMVxuXG4gIHRva2VuU3RhcnRDb2x1bW5Gb3JCdWZmZXJDb2x1bW46IChidWZmZXJDb2x1bW4pIC0+XG4gICAgZGVsdGEgPSAwXG4gICAgZm9yIHRva2VuIGluIEB0b2tlbnNcbiAgICAgIG5leHREZWx0YSA9IGRlbHRhICsgdG9rZW4uYnVmZmVyRGVsdGFcbiAgICAgIGJyZWFrIGlmIG5leHREZWx0YSA+IGJ1ZmZlckNvbHVtblxuICAgICAgZGVsdGEgPSBuZXh0RGVsdGFcbiAgICBkZWx0YVxuXG4gIGlzQ29tbWVudDogLT5cbiAgICByZXR1cm4gQGlzQ29tbWVudExpbmUgaWYgQGlzQ29tbWVudExpbmU/XG5cbiAgICBAaXNDb21tZW50TGluZSA9IGZhbHNlXG5cbiAgICBmb3IgdGFnIGluIEBvcGVuU2NvcGVzXG4gICAgICBpZiBAaXNDb21tZW50T3BlblRhZyh0YWcpXG4gICAgICAgIEBpc0NvbW1lbnRMaW5lID0gdHJ1ZVxuICAgICAgICByZXR1cm4gQGlzQ29tbWVudExpbmVcblxuICAgIGZvciB0YWcgaW4gQHRhZ3NcbiAgICAgIGlmIEBpc0NvbW1lbnRPcGVuVGFnKHRhZylcbiAgICAgICAgQGlzQ29tbWVudExpbmUgPSB0cnVlXG4gICAgICAgIHJldHVybiBAaXNDb21tZW50TGluZVxuXG4gICAgQGlzQ29tbWVudExpbmVcblxuICBpc0NvbW1lbnRPcGVuVGFnOiAodGFnKSAtPlxuICAgIGlmIHRhZyA8IDAgYW5kICh0YWcgJiAxKSBpcyAxXG4gICAgICBzY29wZSA9IEBncmFtbWFyLnNjb3BlRm9ySWQodGFnKVxuICAgICAgaWYgQ29tbWVudFNjb3BlUmVnZXgudGVzdChzY29wZSlcbiAgICAgICAgcmV0dXJuIHRydWVcbiAgICBmYWxzZVxuXG4gIHRva2VuQXRJbmRleDogKGluZGV4KSAtPlxuICAgIEB0b2tlbnNbaW5kZXhdXG5cbiAgZ2V0VG9rZW5Db3VudDogLT5cbiAgICBjb3VudCA9IDBcbiAgICBjb3VudCsrIGZvciB0YWcgaW4gQHRhZ3Mgd2hlbiB0YWcgPj0gMFxuICAgIGNvdW50XG4iXX0=
