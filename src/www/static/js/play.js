app.controller('playCtrl', ["$scope", "$timeout", "uiSortableMultiSelectionMethods", "dispatcher",
		function ($scope, $timeout, uiSortableMultiSelectionMethods, dispatcher) {
	$scope.playlistData = {};
	$scope.songIndices = [];
	$scope.playem = new Playem();
	$scope.playem.addPlayer(YoutubePlayer, {playerContainer: document.getElementById("mainPlayer")});
	dispatcher.on("startPlay", function(data) {
		console.log("starting to play");
		console.log(data);
		$scope.playlistData = data;
		for (var i = 0; i < data["contents"].length; i ++) {
			$scope.playlistData["contents"][i]["artistStr"] = data["contents"][i]["artist"].join(", ");
		}
		selectIndex(0);
	});

	$scope.sortablePlayingList = uiSortableMultiSelectionMethods.extendOptions({
		refreshPositions: true,
		stop: function(e, ui) {
			//update playem queue here
		}
	});

	$("#playingSelect").on('ui-sortable-selectionschanged', function (e, args) {
		$scope.songIndices = $(this).find('.ui-sortable-selected').map(function(i, element){
		  return $(this).index();
		}).toArray();
		$scope.$apply();
	});

	$scope.startPlay = function() {
		//play
		$scope.playem.stop();
		$scope.playem.clearQueue();
		console.log("playing now!");
	}

	// $(function() {
	// 	$(".playItem").dblclick(function() {
	// 		//play this
	// 		console.log("playing " + $(this));
	// 	}).click(function() {
	// 		console.log("clicked ele");
	// 	});
	// });

	function selectIndex(index) {
		$scope.songIndices = [index];
		console.log($scope.songIndices);
		// angular.element(document).ready(function() {
		$timeout(function() {
			console.log($(".playItem"));
			//find and click
			$(".playItem").eq($scope.songIndices).click();
			$scope.startPlay();
		});
	};
}]);