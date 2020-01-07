// var app = angular.module('MusicApp', []);
var app = angular.module('MusicApp', ['ui.sortable', 'ui.sortable.multiselection']);
// app.config(["$controllerProvider", function($controllerProvider) {
// 	app.register = {
// 		controller: $controllerProvider.register
// 	};
// }]);
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

app.factory("sortingFuncs", ["orderByFilter", function(orderBy) {
	var sortingFuncs = {};
	sortingFuncs.sortGlyph = function(reverse, orderVar, type) {
		ret = "icon icon-arrow-" + (reverse ? "down" : "up");
		if (orderVar == "date" && orderVar == type) {
			return ret;
		}
		else if (orderVar == "name" && orderVar == type) {
			return ret;
		}
		else if (orderVar == "relev" && orderVar == type) {
			return ret;
		}
		else {
			return "";
		}
	};

	//ordering function
	//TODO: make this a stable sort? https://stackoverflow.com/questions/24678527/is-backbonejs-and-angularjs-sorting-stable
	sortingFuncs.sortBy = function(data, reverse, orderVar, propertyName, preserveOrder=false) {
		if (!preserveOrder) {
			reverse = (propertyName !== null && orderVar === propertyName) ? !reverse : false;
		}
		orderVar = propertyName;
		data = orderBy(data, orderVar, reverse);
		return {
			"reverse": reverse,
			"orderVar": orderVar,
			"data": data
		}
	}
	return sortingFuncs;
}]);

app.factory("songDatashare", function() {
	var data = {};
	data.songData = [];
	data.songIndices = [];
	return data;
})
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