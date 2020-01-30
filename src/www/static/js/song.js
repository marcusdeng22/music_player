app.controller('songCtrl', ['$scope', '$http', '$location', '$timeout', '$rootScope', 'dispatcher', 'uiSortableMultiSelectionMethods', 'sortingFuncs', 'songDatashare', 'youtubeFuncs',
		function($scope, $http, $location, $timeout, $rootScope, dispatcher, uiSortableMultiSelectionMethods, sortingFuncs, songDatashare, youtubeFuncs) {
	//data model
	$scope.songDatashare = songDatashare;

	dispatcher.on("songLoadListTemplate", function() {
		songDatashare.loadListTemplate("#songEditDiv", $scope);
	});

	$scope.playSelected = function() {
		//switch tabs to "Play" and pass the playlist data
		var passedList = {
			"name": "Unnamed playlist",
			//date now
			"contents": [],
			"touched": true
		};
		songDatashare.songIndices.sort((a, b) => a-b);
		for (var i = 0; i < songDatashare.songIndices.length; i ++) {
			passedList["contents"].push(songDatashare.songData[songDatashare.songIndices[i]]);
		}
		dispatcher.emit("startPlay", passedList);
		$location.hash("play");
	};

	$scope.editSong = function() {
		var toEdit = [];
		for (var i = 0; i < songDatashare.songIndices.length; i ++) {
			toEdit.push(songDatashare.songData[songDatashare.songIndices[i]]);
		}
		if (toEdit.length == 1) {
			//load the edit song file
			songDatashare.loadEditTemplate("#songEditTemplate", $scope, toEdit, undefined, function() {
				console.log("dispatching preview");
				// dispatcher.emit("preview");
				$rootScope.$emit("preview");
			});
		}
		else {
			songDatashare.loadEditTemplate("#songEditTemplate", $scope, toEdit);
		}
		//display modal
		$("#songEditModal").css("display", "flex");
		// songDatashare.editSong(null, true);
	};

	$scope.submitEditSong = function() {
		console.log("editting song");
		songDatashare.editSong(null, true);
		$scope.closeEdit();
	}

	$scope.closeEdit = function() {
		console.log("song closing edit");
		songDatashare.stopPlayem();
		$("#songEditModal").hide();
	}

	$scope.removeSongs = function() {
		if (confirm("Remove selected song(s)?")) {
			songDatashare.removeSongs();
		}
	};

	$scope.addSong = function() {
		songDatashare.addSong(function() {
			$("#addSongNotifCompl").toast("show");
		});
	};

	$scope.cancelAdd = function() {
		songDatashare.resetEdit();
		$("#songListTab").click();
	};

	$scope.downloadSongs = function() {
		var songList = [];
		for (var i = 0; i < songDatashare.songIndices.length; i ++) {
			songList.push(songDatashare.songData[songDatashare.songIndices[i]]);
		}

		dispatcher.emit("loadDownload", {"songs": songList});
	};

	$scope.addAndDownload = function() {
		if (songDatashare.checkSongFields()) {
			return;
		}
		console.log("add + download");
		console.log(songDatashare.editData);
		dispatcher.emit("loadDownload", {"songs": [songDatashare.editData]}, $scope.addSong);
		// songDatashare.addSong();	//this resets the input
	}
}]);