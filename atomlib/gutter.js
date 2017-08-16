(function() {
  var CustomGutterComponent, DefaultPriority, Emitter, Gutter;

  Emitter = require('event-kit').Emitter;

  CustomGutterComponent = null;

  DefaultPriority = -100;

  module.exports = Gutter = (function() {
    function Gutter(gutterContainer, options) {
      var ref, ref1;
      this.gutterContainer = gutterContainer;
      this.name = options != null ? options.name : void 0;
      this.priority = (ref = options != null ? options.priority : void 0) != null ? ref : DefaultPriority;
      this.visible = (ref1 = options != null ? options.visible : void 0) != null ? ref1 : true;
      this.emitter = new Emitter;
    }


    /*
    Section: Gutter Destruction
     */

    Gutter.prototype.destroy = function() {
      if (this.name === 'line-number') {
        throw new Error('The line-number gutter cannot be destroyed.');
      } else {
        this.gutterContainer.removeGutter(this);
        this.emitter.emit('did-destroy');
        return this.emitter.dispose();
      }
    };


    /*
    Section: Event Subscription
     */

    Gutter.prototype.onDidChangeVisible = function(callback) {
      return this.emitter.on('did-change-visible', callback);
    };

    Gutter.prototype.onDidDestroy = function(callback) {
      return this.emitter.on('did-destroy', callback);
    };


    /*
    Section: Visibility
     */

    Gutter.prototype.hide = function() {
      if (this.visible) {
        this.visible = false;
        this.gutterContainer.scheduleComponentUpdate();
        return this.emitter.emit('did-change-visible', this);
      }
    };

    Gutter.prototype.show = function() {
      if (!this.visible) {
        this.visible = true;
        this.gutterContainer.scheduleComponentUpdate();
        return this.emitter.emit('did-change-visible', this);
      }
    };

    Gutter.prototype.isVisible = function() {
      return this.visible;
    };

    Gutter.prototype.decorateMarker = function(marker, options) {
      return this.gutterContainer.addGutterDecoration(this, marker, options);
    };

    Gutter.prototype.getElement = function() {
      return this.element != null ? this.element : this.element = document.createElement('div');
    };

    return Gutter;

  })();

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiL1VzZXJzL2Rpc3RpbGxlci9hdG9tL291dC9hcHAvc3JjL2d1dHRlci5jb2ZmZWUiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFBQSxNQUFBOztFQUFDLFVBQVcsT0FBQSxDQUFRLFdBQVI7O0VBQ1oscUJBQUEsR0FBd0I7O0VBRXhCLGVBQUEsR0FBa0IsQ0FBQzs7RUFLbkIsTUFBTSxDQUFDLE9BQVAsR0FDTTtJQUNTLGdCQUFDLGVBQUQsRUFBa0IsT0FBbEI7QUFDWCxVQUFBO01BQUEsSUFBQyxDQUFBLGVBQUQsR0FBbUI7TUFDbkIsSUFBQyxDQUFBLElBQUQscUJBQVEsT0FBTyxDQUFFO01BQ2pCLElBQUMsQ0FBQSxRQUFELHVFQUFnQztNQUNoQyxJQUFDLENBQUEsT0FBRCx3RUFBOEI7TUFFOUIsSUFBQyxDQUFBLE9BQUQsR0FBVyxJQUFJO0lBTko7OztBQVFiOzs7O3FCQUtBLE9BQUEsR0FBUyxTQUFBO01BQ1AsSUFBRyxJQUFDLENBQUEsSUFBRCxLQUFTLGFBQVo7QUFDRSxjQUFVLElBQUEsS0FBQSxDQUFNLDZDQUFOLEVBRFo7T0FBQSxNQUFBO1FBR0UsSUFBQyxDQUFBLGVBQWUsQ0FBQyxZQUFqQixDQUE4QixJQUE5QjtRQUNBLElBQUMsQ0FBQSxPQUFPLENBQUMsSUFBVCxDQUFjLGFBQWQ7ZUFDQSxJQUFDLENBQUEsT0FBTyxDQUFDLE9BQVQsQ0FBQSxFQUxGOztJQURPOzs7QUFRVDs7OztxQkFVQSxrQkFBQSxHQUFvQixTQUFDLFFBQUQ7YUFDbEIsSUFBQyxDQUFBLE9BQU8sQ0FBQyxFQUFULENBQVksb0JBQVosRUFBa0MsUUFBbEM7SUFEa0I7O3FCQVFwQixZQUFBLEdBQWMsU0FBQyxRQUFEO2FBQ1osSUFBQyxDQUFBLE9BQU8sQ0FBQyxFQUFULENBQVksYUFBWixFQUEyQixRQUEzQjtJQURZOzs7QUFHZDs7OztxQkFLQSxJQUFBLEdBQU0sU0FBQTtNQUNKLElBQUcsSUFBQyxDQUFBLE9BQUo7UUFDRSxJQUFDLENBQUEsT0FBRCxHQUFXO1FBQ1gsSUFBQyxDQUFBLGVBQWUsQ0FBQyx1QkFBakIsQ0FBQTtlQUNBLElBQUMsQ0FBQSxPQUFPLENBQUMsSUFBVCxDQUFjLG9CQUFkLEVBQW9DLElBQXBDLEVBSEY7O0lBREk7O3FCQU9OLElBQUEsR0FBTSxTQUFBO01BQ0osSUFBRyxDQUFJLElBQUMsQ0FBQSxPQUFSO1FBQ0UsSUFBQyxDQUFBLE9BQUQsR0FBVztRQUNYLElBQUMsQ0FBQSxlQUFlLENBQUMsdUJBQWpCLENBQUE7ZUFDQSxJQUFDLENBQUEsT0FBTyxDQUFDLElBQVQsQ0FBYyxvQkFBZCxFQUFvQyxJQUFwQyxFQUhGOztJQURJOztxQkFTTixTQUFBLEdBQVcsU0FBQTthQUNULElBQUMsQ0FBQTtJQURROztxQkFpQlgsY0FBQSxHQUFnQixTQUFDLE1BQUQsRUFBUyxPQUFUO2FBQ2QsSUFBQyxDQUFBLGVBQWUsQ0FBQyxtQkFBakIsQ0FBcUMsSUFBckMsRUFBMkMsTUFBM0MsRUFBbUQsT0FBbkQ7SUFEYzs7cUJBR2hCLFVBQUEsR0FBWSxTQUFBO29DQUNWLElBQUMsQ0FBQSxVQUFELElBQUMsQ0FBQSxVQUFXLFFBQVEsQ0FBQyxhQUFULENBQXVCLEtBQXZCO0lBREY7Ozs7O0FBN0ZkIiwic291cmNlc0NvbnRlbnQiOlsie0VtaXR0ZXJ9ID0gcmVxdWlyZSAnZXZlbnQta2l0J1xuQ3VzdG9tR3V0dGVyQ29tcG9uZW50ID0gbnVsbFxuXG5EZWZhdWx0UHJpb3JpdHkgPSAtMTAwXG5cbiMgRXh0ZW5kZWQ6IFJlcHJlc2VudHMgYSBndXR0ZXIgd2l0aGluIGEge1RleHRFZGl0b3J9LlxuI1xuIyBTZWUge1RleHRFZGl0b3I6OmFkZEd1dHRlcn0gZm9yIGluZm9ybWF0aW9uIG9uIGNyZWF0aW5nIGEgZ3V0dGVyLlxubW9kdWxlLmV4cG9ydHMgPVxuY2xhc3MgR3V0dGVyXG4gIGNvbnN0cnVjdG9yOiAoZ3V0dGVyQ29udGFpbmVyLCBvcHRpb25zKSAtPlxuICAgIEBndXR0ZXJDb250YWluZXIgPSBndXR0ZXJDb250YWluZXJcbiAgICBAbmFtZSA9IG9wdGlvbnM/Lm5hbWVcbiAgICBAcHJpb3JpdHkgPSBvcHRpb25zPy5wcmlvcml0eSA/IERlZmF1bHRQcmlvcml0eVxuICAgIEB2aXNpYmxlID0gb3B0aW9ucz8udmlzaWJsZSA/IHRydWVcblxuICAgIEBlbWl0dGVyID0gbmV3IEVtaXR0ZXJcblxuICAjIyNcbiAgU2VjdGlvbjogR3V0dGVyIERlc3RydWN0aW9uXG4gICMjI1xuXG4gICMgRXNzZW50aWFsOiBEZXN0cm95cyB0aGUgZ3V0dGVyLlxuICBkZXN0cm95OiAtPlxuICAgIGlmIEBuYW1lIGlzICdsaW5lLW51bWJlcidcbiAgICAgIHRocm93IG5ldyBFcnJvcignVGhlIGxpbmUtbnVtYmVyIGd1dHRlciBjYW5ub3QgYmUgZGVzdHJveWVkLicpXG4gICAgZWxzZVxuICAgICAgQGd1dHRlckNvbnRhaW5lci5yZW1vdmVHdXR0ZXIodGhpcylcbiAgICAgIEBlbWl0dGVyLmVtaXQgJ2RpZC1kZXN0cm95J1xuICAgICAgQGVtaXR0ZXIuZGlzcG9zZSgpXG5cbiAgIyMjXG4gIFNlY3Rpb246IEV2ZW50IFN1YnNjcmlwdGlvblxuICAjIyNcblxuICAjIEVzc2VudGlhbDogQ2FsbHMgeW91ciBgY2FsbGJhY2tgIHdoZW4gdGhlIGd1dHRlcidzIHZpc2liaWxpdHkgY2hhbmdlcy5cbiAgI1xuICAjICogYGNhbGxiYWNrYCB7RnVuY3Rpb259XG4gICMgICogYGd1dHRlcmAgVGhlIGd1dHRlciB3aG9zZSB2aXNpYmlsaXR5IGNoYW5nZWQuXG4gICNcbiAgIyBSZXR1cm5zIGEge0Rpc3Bvc2FibGV9IG9uIHdoaWNoIGAuZGlzcG9zZSgpYCBjYW4gYmUgY2FsbGVkIHRvIHVuc3Vic2NyaWJlLlxuICBvbkRpZENoYW5nZVZpc2libGU6IChjYWxsYmFjaykgLT5cbiAgICBAZW1pdHRlci5vbiAnZGlkLWNoYW5nZS12aXNpYmxlJywgY2FsbGJhY2tcblxuICAjIEVzc2VudGlhbDogQ2FsbHMgeW91ciBgY2FsbGJhY2tgIHdoZW4gdGhlIGd1dHRlciBpcyBkZXN0cm95ZWQuXG4gICNcbiAgIyAqIGBjYWxsYmFja2Age0Z1bmN0aW9ufVxuICAjXG4gICMgUmV0dXJucyBhIHtEaXNwb3NhYmxlfSBvbiB3aGljaCBgLmRpc3Bvc2UoKWAgY2FuIGJlIGNhbGxlZCB0byB1bnN1YnNjcmliZS5cbiAgb25EaWREZXN0cm95OiAoY2FsbGJhY2spIC0+XG4gICAgQGVtaXR0ZXIub24gJ2RpZC1kZXN0cm95JywgY2FsbGJhY2tcblxuICAjIyNcbiAgU2VjdGlvbjogVmlzaWJpbGl0eVxuICAjIyNcblxuICAjIEVzc2VudGlhbDogSGlkZSB0aGUgZ3V0dGVyLlxuICBoaWRlOiAtPlxuICAgIGlmIEB2aXNpYmxlXG4gICAgICBAdmlzaWJsZSA9IGZhbHNlXG4gICAgICBAZ3V0dGVyQ29udGFpbmVyLnNjaGVkdWxlQ29tcG9uZW50VXBkYXRlKClcbiAgICAgIEBlbWl0dGVyLmVtaXQgJ2RpZC1jaGFuZ2UtdmlzaWJsZScsIHRoaXNcblxuICAjIEVzc2VudGlhbDogU2hvdyB0aGUgZ3V0dGVyLlxuICBzaG93OiAtPlxuICAgIGlmIG5vdCBAdmlzaWJsZVxuICAgICAgQHZpc2libGUgPSB0cnVlXG4gICAgICBAZ3V0dGVyQ29udGFpbmVyLnNjaGVkdWxlQ29tcG9uZW50VXBkYXRlKClcbiAgICAgIEBlbWl0dGVyLmVtaXQgJ2RpZC1jaGFuZ2UtdmlzaWJsZScsIHRoaXNcblxuICAjIEVzc2VudGlhbDogRGV0ZXJtaW5lIHdoZXRoZXIgdGhlIGd1dHRlciBpcyB2aXNpYmxlLlxuICAjXG4gICMgUmV0dXJucyBhIHtCb29sZWFufS5cbiAgaXNWaXNpYmxlOiAtPlxuICAgIEB2aXNpYmxlXG5cbiAgIyBFc3NlbnRpYWw6IEFkZCBhIGRlY29yYXRpb24gdGhhdCB0cmFja3MgYSB7RGlzcGxheU1hcmtlcn0uIFdoZW4gdGhlIG1hcmtlciBtb3ZlcyxcbiAgIyBpcyBpbnZhbGlkYXRlZCwgb3IgaXMgZGVzdHJveWVkLCB0aGUgZGVjb3JhdGlvbiB3aWxsIGJlIHVwZGF0ZWQgdG8gcmVmbGVjdFxuICAjIHRoZSBtYXJrZXIncyBzdGF0ZS5cbiAgI1xuICAjICMjIEFyZ3VtZW50c1xuICAjXG4gICMgKiBgbWFya2VyYCBBIHtEaXNwbGF5TWFya2VyfSB5b3Ugd2FudCB0aGlzIGRlY29yYXRpb24gdG8gZm9sbG93LlxuICAjICogYGRlY29yYXRpb25QYXJhbXNgIEFuIHtPYmplY3R9IHJlcHJlc2VudGluZyB0aGUgZGVjb3JhdGlvbi4gSXQgaXMgcGFzc2VkXG4gICMgICB0byB7VGV4dEVkaXRvcjo6ZGVjb3JhdGVNYXJrZXJ9IGFzIGl0cyBgZGVjb3JhdGlvblBhcmFtc2AgYW5kIHNvIHN1cHBvcnRzXG4gICMgICBhbGwgb3B0aW9ucyBkb2N1bWVudGVkIHRoZXJlLlxuICAjICAgKiBgdHlwZWAgX19DYXZlYXRfXzogc2V0IHRvIGAnbGluZS1udW1iZXInYCBpZiB0aGlzIGlzIHRoZSBsaW5lLW51bWJlclxuICAjICAgICBndXR0ZXIsIGAnZ3V0dGVyJ2Agb3RoZXJ3aXNlLiBUaGlzIGNhbm5vdCBiZSBvdmVycmlkZGVuLlxuICAjXG4gICMgUmV0dXJucyBhIHtEZWNvcmF0aW9ufSBvYmplY3RcbiAgZGVjb3JhdGVNYXJrZXI6IChtYXJrZXIsIG9wdGlvbnMpIC0+XG4gICAgQGd1dHRlckNvbnRhaW5lci5hZGRHdXR0ZXJEZWNvcmF0aW9uKHRoaXMsIG1hcmtlciwgb3B0aW9ucylcblxuICBnZXRFbGVtZW50OiAtPlxuICAgIEBlbGVtZW50ID89IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpXG4iXX0=
