//source: https://github.com/thgreasi/ui-sortable-multiselection/blob/master/src/ui.sortable.multiselection.js
//edited to allow preselection to stay selected after drag/click

angular.module('ui.sortable.multiselection', [])
  .constant('uiSortableMultiSelectionClass', 'ui-sortable-selected')
  .directive('uiSortableSelectable', [
    'uiSortableMultiSelectionClass',
    function(selectedItemClass) {
      return {
        link: function(scope, element/*, attrs*/) {
          element.on('click', function (e) {
            var $this = angular.element(this);

            var $parent = $this.parent();

            var multiSelectOnClick = $parent.sortable('option', 'multiSelectOnClick') || false;

            var isDisabled = $parent.sortable('option', 'disabled');

            if (isDisabled){
              return;
            }
            var jquerySortableCancelOption = $parent.sortable('option', 'cancel');
            var jquerySortableHandleOption = $parent.sortable('option', 'handle');

            // Respect jQuery UI Sortable's cancel property by testing if element matches selector
            if (jquerySortableCancelOption !== undefined && $this.is(jquerySortableCancelOption)) {
              return;
            }

            // Mimic jQuery UI Sortable's handle property when determining if an item is selected
            if (jquerySortableHandleOption) {
              var validHandle = false;

              $parent.find(jquerySortableHandleOption).find('*').addBack().each(function () {
                if (this === e.target) {
                  validHandle = true;
                }
              });

              if (!validHandle) {
                return;
              }
            }

            var sortableMultiSelectState = $parent.data('uiSortableMultiSelectionState') || {};

            var lastIndex = sortableMultiSelectState.lastIndex;
            var index = $this.index();

            if (e.ctrlKey || e.metaKey || multiSelectOnClick) {
              $this.toggleClass(selectedItemClass);
            } else if (e.shiftKey && lastIndex !== undefined && lastIndex >= 0) {
              if (index > lastIndex) {
                $parent.children().slice(lastIndex, index + 1).addClass(selectedItemClass);
              } else if(index < lastIndex) {
                $parent.children().slice(index, lastIndex).addClass(selectedItemClass);
              }
            } else {
              $parent.children('.'+selectedItemClass).not($this).removeClass(selectedItemClass);
              // $this.toggleClass(selectedItemClass);  //ORIG
              $this.addClass(selectedItemClass);  //ME
            }
            sortableMultiSelectState.lastIndex = index;
            $parent.data('uiSortableMultiSelectionState', sortableMultiSelectState);

            $parent.trigger('ui-sortable-selectionschanged');
          });

          element.parent().on('$destroy', function() {
            element.parent().removeData('uiSortableMultiSelectionState');
          });
        }
      };
    }
  ])
  .factory('uiSortableMultiSelectionMethods', [
    'uiSortableMultiSelectionClass',
    function (selectedItemClass) {
      var uiSelectionCount;

      function fixIndex (oldPosition, newPosition, x) {
        if (oldPosition < x && (newPosition === undefined || (oldPosition < newPosition && x <= newPosition))) {
          return x - 1;
        } else if (x < oldPosition && newPosition !== undefined && newPosition < oldPosition && newPosition <= x) {
          return x + 1;
        }
        return x;
      }

      function groupIndexes (indexes, oldPosition, newPosition) {
        var above = [],
            below = [];

        for (var i = 0; i < indexes.length; i++) {
          var x = indexes[i];
          if (x < oldPosition) {
            above.push(fixIndex(oldPosition, newPosition, x));
          } else if (oldPosition < x) {
            below.push(fixIndex(oldPosition, newPosition, x));
          }
        }

        return {
          above: above,
          below: below
        };
      }

      function extractModelsFromIndexes (ngModel, indexes) {
        var result = [];
        for (var i = indexes.length - 1; i >= 0; i--) {
          result.push(ngModel.splice(indexes[i], 1)[0]);
        }
        result.reverse();
        return result;
      }

      function extractGroupedModelsFromIndexes (ngModel, aboveIndexes, belowIndexes) {
        var models = {
          below: extractModelsFromIndexes(ngModel, belowIndexes),
          above: extractModelsFromIndexes(ngModel, aboveIndexes)
        };
        return models;
      }

      function combineCallbacks(first,second){
        if(second && (typeof second === 'function')) {
          return function() {
            first.apply(this, arguments);
            second.apply(this, arguments);
          };
        }
        return first;
      }

      return {
        extendOptions: function (sortableOptions) {
          sortableOptions = sortableOptions || {};
          var result = angular.extend({}, this, sortableOptions);

          for (var prop in sortableOptions) {
            if (sortableOptions.hasOwnProperty(prop)) {
              if (this[prop]) {
                if (prop === 'helper') {
                  result.helper = this.helper;
                } else {
                  result[prop] = combineCallbacks(this[prop], sortableOptions[prop]);
                }
              }
            }
          }
          uiSelectionCount = result['ui-selection-count'];
          return result;
        },
        helper: function (e, item) {
          // when starting to sort an unhighlighted item ,
          // deselect any existing highlighted items
          if (!item.hasClass(selectedItemClass)) {
              item.addClass(selectedItemClass)
                .siblings()
                .removeClass(selectedItemClass);
          }

          var selectedElements = item.parent().children('.' + selectedItemClass);
          var selectedSiblings = item.siblings('.' + selectedItemClass);

          var selectedIndexes = angular.element.map(selectedElements, function (element) {
            return angular.element(element).index();
          });

          // indexes of the selected siblings
          var indexes = angular.element.map(selectedSiblings, function (element) {
            return angular.element(element).index();
          });

          item.sortableMultiSelect = {
            indexes: indexes,
            selectedIndexes: selectedIndexes
          };

          //Calculate the selectionCount number and initialize the selectionCount attributes if dragging multiple elements
          var selectionCount = selectedIndexes ? selectedIndexes.length : 0;

          // Clone the selected items and to put them inside the helper
          var elements = selectedElements.clone();

          // like `helper: 'clone'` does, hide the dragged elements
          selectedSiblings.hide();

          // Create the helper to act as a bucket for the cloned elements
          var helperTag = item[0].tagName;
          var helper = angular.element('<' + helperTag + '/>');
          if (uiSelectionCount && selectionCount > 1) {
            helper.addClass('ui-selection-count').attr('data-ui-selection-count',  selectionCount);
          }
          return helper.append(elements);
        },
        start: function(e, ui) {
          ui.item.sortableMultiSelect.sourceElement = ui.item.parent();

          //ME: add selection changed notification to parent
          // ui.item.sortableMultiSelect.sourceElement.trigger('ui-sortable-selectionschanged');  //ME

          var sourceModel = ui.item.sortable.sourceModel;
          var indexes = ui.item.sortableMultiSelect.indexes;
          var selectedIndexes = ui.item.sortableMultiSelect.selectedIndexes;
          var models = [];
          var selectedModels = [];
          for (var i = 0, len = selectedIndexes.length; i < len; i++) {
            var index = selectedIndexes[i];
            selectedModels.push(sourceModel[index]);
            if (indexes.indexOf(index) >= 0) {
              models.push(sourceModel[index]);
            }
          }
          ui.item.sortableMultiSelect.models = models;
          ui.item.sortableMultiSelect.selectedModels = selectedModels;
        },
        update: function(e, ui) {
          if (ui.item.sortable.received) {
            if (!ui.item.sortable.isCanceled()) {
              var ngModel = ui.item.sortable.droptargetModel,
                  newPosition = ui.item.sortable.dropindex,
                  models = ui.item.sortableMultiSelect.moved;

              // add the models to the target list
              Array.prototype.splice.apply(
                ngModel,
                [newPosition+ 1, 0]
                .concat(models.below));

              Array.prototype.splice.apply(
                ngModel,
                [newPosition, 0]
                .concat(models.above));
            } else {
              ui.item.sortableMultiSelect.sourceElement.find('> .' + selectedItemClass).show();
            }
          }
        },
        remove: function(e, ui) {
          if (!ui.item.sortable.isCanceled()) {
            var ngModel = ui.item.sortable.sourceModel,
                oldPosition = ui.item.sortable.index;

            var indexes = groupIndexes(ui.item.sortableMultiSelect.indexes, oldPosition);

            // get the models and remove them from the original list
            // the code should run in reverse order,
            // so that the indexes will not break
            ui.item.sortableMultiSelect.moved = extractGroupedModelsFromIndexes(ngModel, indexes.above, indexes.below);
          } else {
            ui.item.sortableMultiSelect.sourceElement.find('> .' + selectedItemClass).show();
          }
        },
        stop: function (e, ui) {
          var sourceElement = ui.item.sortableMultiSelect.sourceElement || ui.item.parent();
          if (!ui.item.sortable.received &&
             // ('dropindex' in ui.item.sortable) &&
             !ui.item.sortable.isCanceled()) {  //ME: this is to control normal stop
            var ngModel = ui.item.sortable.sourceModel,
                oldPosition = ui.item.sortable.index,
                newPosition = ui.item.sortable.dropindex;

            //ME: set the last index on stop
            var multiSelectState = ui.item.parent().data('uiSortableMultiSelectionState') || {};  //ME
            multiSelectState.lastIndex = newPosition; //ME
            ui.item.parent().data('uiSortableMultiSelectionState', multiSelectState); //ME

            var draggedElementIndexes = ui.item.sortableMultiSelect.indexes;
            if (!draggedElementIndexes.length) {
              if (typeof newPosition != "undefined") {  //ME: newPosition is only defined if dragging to a new index
                ui.item.removeClass('' + selectedItemClass); //ME: this is for clearing the select when dragging only one - this is the old position
                ui.item.parent().children().eq(newPosition).addClass(selectedItemClass);  //ME: this is to update the display for the new position of the element
              }
              //ME: trigger selected event on parent
              ui.item.parent().trigger("ui-sortable-selectionschanged");  //ME
              return;
            }

            if (newPosition === undefined) {
              newPosition = oldPosition;
            }

            var indexes = groupIndexes(draggedElementIndexes, oldPosition, newPosition);

            // get the model of the dragged item
            // so that we can locate its position
            // after we remove the co-dragged elements
            var draggedModel = ngModel[newPosition];

            // get the models and remove them from the list
            // the code should run in reverse order,
            // so that the indexes will not break
            var models = extractGroupedModelsFromIndexes(ngModel, indexes.above, indexes.below);

            var newIndex = ngModel.indexOf(draggedModel);
            // add the models to the list
            Array.prototype.splice.apply(
              ngModel,
              [newIndex + 1, 0]
              .concat(models.below));

            Array.prototype.splice.apply(
              ngModel,
              [newIndex, 0]
              .concat(models.above));

            ui.item.parent().find('> .' + selectedItemClass).removeClass('' + selectedItemClass).show(); //ORIG - restores the display of the dragged items
            console.log("STOP MULTI SELECT");
            console.log(newPosition); //this is index where the items are dropped to
            console.log(newIndex);
            console.log(newIndex - indexes.above.length);
            console.log(newIndex + indexes.below.length);
            console.log(indexes); //i think this is the offset above/below the first selection of the selected items
            console.log(draggedElementIndexes);
            ui.item.parent().children().filter(function(i) {  //ME: this is to update the display for the new positions of the selected elements
              // console.log(i);
              // return i >= newIndex - indexes.above.length && i <= newIndex + indexes.below.length;
              return i >= newIndex && i <= newIndex + draggedElementIndexes.length;
            }).addClass(selectedItemClass);
            //ME: trigger selected event on parent
            ui.item.parent().trigger("ui-sortable-selectionschanged");  //ME
            // ui.item.parent().find('> .' + selectedItemClass).show();  //ME: don't use this; is based on the original indices
          } else if (ui.item.sortable.isCanceled()) {
            sourceElement.find('> .' + selectedItemClass).show();
          }
        }
      };
    }]);