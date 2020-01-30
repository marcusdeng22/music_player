app.controller('editSongCtrl', ['$scope', '$rootScope', '$http', '$location', '$timeout', 'dispatcher', 'uiSortableMultiSelectionMethods', 'songDatashare',
		function($scope, $rootScope, $http, $location, $timeout, dispatcher, uiSortableMultiSelectionMethods, songDatashare) {

	$scope.songDatashare = songDatashare;
	$scope.$parent["childScope"] = $scope;
	// $scope.$apply();

	$scope.songFields = ["type", "url", "name", "artist", "album", "genre"];
	$scope.songNumFields = ["vol", "start", "end"];

	$scope.previewSong = function() {
		console.log("previewing song");
		console.log($scope.$id);
		// console.log(songDatashare.playem);
		// console.log(songDatashare.playem.getPlayers());
		// console.log($scope.songDatashare.editData);
		songDatashare.playem.stop();
		songDatashare.playem.clearQueue();
		$timeout(function() {
			songDatashare.playem.addTrackByUrl($scope.songDatashare.editData["url"]);
			songDatashare.playem.play();
		});
	}

	// dispatcher.on("preview", $scope.previewSong);
	var previewEvent = $rootScope.$on("preview", function() {
		console.log("preview event recv");
		$scope.previewSong();
	})

	//update song url preview on enter key
	// $(document).keyup(function(e) {
	// 	if ($("#newSongUrlInput").is(":focus") && e.key == "Enter") {
	// 		$scope.previewSong();
	// 	}
	// 	// if ($($scope["editTemplateDiv"] + " #editSongDiv input:not('#newSongUrlInput')").is(":focus") && e.key == "Enter") {
	// 	if ($("#editSongDiv input:not('#newSongUrlInput')").is(":focus") && e.key == "Enter") {
	// 		console.log("enter pressed");
	// 		console.log($scope["editTemplateDiv"]);
	// 		//switch on the template for the dispatch
	// 		// switch($scope["editTemplateDiv"]) {
	// 		// 	case "#songEditTemplate":
	// 		// 		console.log("song edit");
	// 		// 		break;
	// 		// 	case "#addNewSong":
	// 		// 		console.log("add new song");
	// 		// 		break;
	// 		// 	case ""
	// 		// }
	// 	}
	// });

	console.log("editting data:");
	console.log($scope.songDatashare.editData);
	// $scope.$digest();

	$scope.$on("$destroy", function() {
		console.log("edit scope destroyed");
		previewEvent();
		$scope.$destroy();
	});

	$scope.testEnter = function() {
		console.log("test enter pressed");
		console.log($scope["editTemplateDiv"]);
	};
}]);