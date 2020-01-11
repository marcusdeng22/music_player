app.controller('editSongCtrl', ['$scope', '$http', '$location', '$timeout', 'dispatcher', 'uiSortableMultiSelectionMethods', 'songDatashare',
		function($scope, $http, $location, $timeout, dispatcher, uiSortableMultiSelectionMethods, songDatashare) {

	$scope.songDatashare = songDatashare;
	$scope.$apply();

	$scope.previewSong = function() {
		console.log("previewing song");
		songDatashare.playem.stop();
		songDatashare.playem.clearQueue();
		songDatashare.playem.addTrackByUrl($scope.songDatashare.editData["url"]);
		songDatashare.playem.play();
	}

	//only auto preview if editing song
	if (songDatashare.editTemplateId == "#playlistEditTemplate") {
		console.log("auto previewing");
		$scope.previewSong();
	}

	//update song url preview on enter key
	$(document).keyup(function(e) {
		if ($("#newSongUrlInput").is(":focus") && e.key == "Enter") {
			$scope.previewSong();
		}
	});

	console.log("editting data:");
	console.log($scope.songDatashare.editData);
	$scope.$digest();

	// //load the edit song template in the new song tab with a dict with default vals
	// //keys: ["url", "type", "name", "artist"]
	// var templateSong = {"url": "", "type": "youtube", "name": "", "artist": []};
	// songDatashare.setEditData(templateSong);
}]);