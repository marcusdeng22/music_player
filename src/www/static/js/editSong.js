app.controller('editSongCtrl', ['$scope', '$http', '$location', '$timeout', 'dispatcher', 'uiSortableMultiSelectionMethods', 'songDatashare',
		function($scope, $http, $location, $timeout, dispatcher, uiSortableMultiSelectionMethods, songDatashare) {

	$scope.songDatashare = songDatashare;
	$scope.$apply();

	$scope.songFields = ["type", "url", "name", "artist", "album", "genre"];
	$scope.songNumFields = ["vol", "start", "end"];

	$scope.previewSong = function() {
		console.log("previewing song");
		console.log(songDatashare.playem);
		console.log(songDatashare.playem.getPlayers());
		console.log($scope.songDatashare.editData);
		songDatashare.playem.stop();
		songDatashare.playem.clearQueue();
		songDatashare.playem.addTrackByUrl($scope.songDatashare.editData["url"]);
		songDatashare.playem.play();
	}

	dispatcher.on("preview", $scope.previewSong);

	//update song url preview on enter key
	$(document).keyup(function(e) {
		if ($("#newSongUrlInput").is(":focus") && e.key == "Enter") {
			$scope.previewSong();
		}
	});

	console.log("editting data:");
	console.log($scope.songDatashare.editData);
	$scope.$digest();
}]);