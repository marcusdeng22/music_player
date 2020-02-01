app.controller('editSongCtrl', ['$scope', '$rootScope', '$http', '$location', '$timeout', 'uiSortableMultiSelectionMethods', 'songDatashare',
		function($scope, $rootScope, $http, $location, $timeout, uiSortableMultiSelectionMethods, songDatashare) {

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

	var previewEvent = $rootScope.$on("preview", function() {
		console.log("preview event recv");
		$scope.previewSong();
	})

	//submit the edits on enter key
	$scope.enterSubmit = function() {
		//switch on the template for the dispatch
		console.log("enter key pressed");
		console.log($scope["editTemplateDiv"]);
		console.log($scope["listTemplateDiv"]);
		switch($scope["editTemplateDiv"]) {
			case "#addNewSong":
				//playlist/song view add new song
				if ($scope["listTemplateDiv"] == "#playlistSongEditDiv") {
					$rootScope.$emit("playlistAddSubmit");
				}
				else if ($scope["listTemplateDiv"] == "#songEditDiv") {
					$rootScope.$emit("songAddSubmit");
				}
				break;
			case "#playlistEditTemplate":
				//playlist edit song
				$rootScope.$emit("playlistEditSubmit");
				break;
			case "#nowPlayingEditTemplate":
				//play edit song
				$rootScope.$emit("playEditSubmit");
				break;
			case "#songEditTemplate":
				//songs edit song
				$rootScope.$emit("songEditSubmit");
				break;
			default:
				console.log("mismatch");
		}
		$("#newSongUrlInput").focus();
	}

	console.log("editting data:");
	console.log($scope.songDatashare.editData);
	// $scope.$digest();

	$scope.$on("$destroy", function() {
		console.log("edit scope destroyed");
		previewEvent();
	});

	$scope.testEnter = function() {
		console.log("test enter pressed");
		console.log($scope["editTemplateDiv"]);
	};

	$("#newSongUrlInput").focus();
}]);