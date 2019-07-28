// var app = angular.module('MusicApp', []);
var app = angular.module('MusicApp', ['ui.sortable', 'ui.sortable.multiselection']);
app.value('dispatcher', {

	callbacks: {},
	emit: function(event, data) {
		if (this.callbacks[event]) {
			this.callbacks[event].forEach(function (callback) {
				callback(data);
			})
		}
	},

	on: function(event, callback) {
		if (!this.callbacks[event]) {
			this.callbacks[event] = [];
		}

		this.callbacks[event].push(callback);
	}

});
// console.log("hi");
// angular.element('[ui-sortable]').on('ui-sortable-selectionschanged', function (e, args) {
//     console.log("selection changed");
// //     var $this = $(this);
// //     console.log($this);
// //     var selectedItemIndexes = $this.find('.ui-sortable-selected')//, .' + $this[0]["id"])
// //     .map(function(i, element){
// //       return $(this).index();
// //     })
// //     .toArray();
// //     console.log(selectedItemIndexes);

// //     //this gets the actual objects stored in elements
// //     // var selectedItems = $.map(selectedItemIndexes, function(i) {
// //     //   return $scope.list[i]
// //     // });
// //     // console.log(selectedItems);
// });