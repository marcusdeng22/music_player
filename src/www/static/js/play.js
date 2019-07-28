app.controller('sortableController', function ($scope, uiSortableMultiSelectionMethods) {
	var tmpList = [];
	
	for (var i = 1; i <= 6; i++){
		tmpList.push({
			text: 'Item ' + i,
			value: i
		});
	}
	
	$scope.list = tmpList;
	
	$scope.sortingLog = [];
	
	$scope.sortableOptions = uiSortableMultiSelectionMethods.extendOptions({
		stop: function(e, ui) {
			console.log("custom stop");
			// this callback has the changed model
			var logEntry = tmpList.map(function(i){
				return i.value;
			}).join(', ');
			$scope.sortingLog.push('Stop: ' + logEntry);
		}
	});
	
	// bonus: listen for sortable item selections
	// angular.element('[ui-sortable]').on('ui-sortable-selectionschanged', function (e, args) {
	$('#testList').on('ui-sortable-selectionschanged', function (e, args) {
		console.log("selection changed from test");
		var $this = $(this);	//$(this) refers to the div containing each item
		console.log($this);
		console.log($this.find('.ui-sortable-selected'));
		var selectedItemIndexes = $this.find('.ui-sortable-selected')//, .' + $this[0]["id"])
		.map(function(i, element){
			return $(this).index();
		})
		.toArray();
		console.log(selectedItemIndexes);
		
		//this gets the actual objects stored in elements
		// var selectedItems = $.map(selectedItemIndexes, function(i) {
		//   return $scope.list[i]
		// });
		// console.log(selectedItems);
	});

	$scope.getSelected = function() {
		console.log('clicked');
		// console.log($scope.list);
		console.log($(this));
		console.log($(this).parent());
		console.log($(this).parent().find('.ui-sortable-selected').map(function(i, ele){return $(this).index();}).toArray());
	}

	$(function() {
		$(".testItem").droppable({
			tolerance: "pointer",
			drop: function(event, ui) {
				console.log("dropped from play.js");
				console.log($(this));
				console.log(event);
				//use the selectedItems to see what is being dragged, then use event.target.id to get the box that is being dropped on
			}
		});
	});

	// $scope.preserveSingle = function(origin, e) {
	//   console.log(origin);
	//   console.log(e);
	//   if (!(e.originalEvent.ctrlKey || e.originalEvent.shiftKey) && !$("#" + origin).hasClass("ui-sortable-selected")) {
	//     $("#" + origin).addClass("ui-sortable-selected");
	//     console.log("selected already");
	//   }
	// }
});