app.controller('editSongCtrl', ['$scope', '$http', '$location', '$timeout', 'dispatcher', 'uiSortableMultiSelectionMethods', 'songDatashare',
		function($scope, $http, $location, $timeout, dispatcher, uiSortableMultiSelectionMethods, songDatashare) {

	$scope.songDatashare = songDatashare;

	$scope.previewSong = function() {
		console.log("previewing song");
		songDatashare.playem.stop();
		songDatashare.playem.clearQueue();
		songDatashare.playem.addTrackByUrl($scope.songDatashare.editData["url"]);
		songDatashare.playem.play();
	}

	$scope.previewSong();

	//update song url preview on enter key
	$(document).keyup(function(e) {
		if ($("#newSongUrlInput").is(":focus") && e.key == "Enter") {
			$scope.previewSong();
		}
	});
}]);