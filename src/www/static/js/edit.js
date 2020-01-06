app.controller('editCtrl', ['$scope', '$http', '$location', '$timeout', 'dispatcher', 'uiSortableMultiSelectionMethods', 'sortingFuncs',
		function($scope, $http, $location, $timeout, dispatcher, uiSortableMultiSelectionMethods, sortingFuncs) {
	
}]);

//handle subtab click
$("#editDiv .nav-link").on("click", function(e) {
	e.preventDefault();
	$(".tab-pane").removeClass("show active");
	$($(this)[0]["dataset"]["target"]).addClass("show active");
});