app.controller('songCtrl', ['$scope', '$http', '$location', '$timeout', '$rootScope', 'uiSortableMultiSelectionMethods', 'sortingFuncs', 'songDatashare', 'youtubeFuncs',
		function($scope, $http, $location, $timeout, $rootScope, uiSortableMultiSelectionMethods, sortingFuncs, songDatashare, youtubeFuncs) {
	//data model
	$scope.songDatashare = songDatashare;

	$rootScope.$on("songLoadListTemplate", function() {
		songDatashare.loadListTemplate("#songEditDiv", $scope);
	});

	$rootScope.$on("songAddSubmit", function() {
		$scope.addSong();
	});

	$rootScope.$on("songEditSubmit", function() {
		$scope.submitEditSong();
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
		$rootScope.$emit("startPlay", passedList);
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
		// songDatashare.editSong(null, true);
		songDatashare.editSong();
		$scope.closeEdit();
	}

	$rootScope.$on("songChanged", function(e, insertedData) {
		// var idIndices= {};
		// for (var i = 0; i < insertedData.length; i ++) {
		// 	idIndices[insertedData[i]["_id"]] = i;
		// }
		// console.log("EDIT START");
		// console.log(songDatashare.songData);
		// //update local data
		// for (var i = 0; i < songDatashare.songIndices.length; i ++) {
		// 	songDatashare.songData[songDatashare.songIndices[i]] = insertedData[idIndices[songDatashare.songData[songDatashare.songIndices[i]]["_id"]]];
		// }
		for (var i = 0; i < insertedData.length; i ++) {
			var newIndex = songDatashare.songData.findIndex(function(p) { return p["_id"] == insertedData[i]["_id"]; });
			songDatashare.songData[newIndex] = insertedData[i];
		}
		//sort
		songDatashare.sortBy(songDatashare.orderVar, true);
		//select the original indices
		songDatashare.songIndices = [];
		console.log("EDIT -> UPDATING LOCAL");
		console.log(songDatashare.songData);
		console.log(insertedData);
		$("#editSongSelect > .songItem").removeClass("ui-sortable-selected");
		for (var i = 0; i < insertedData.length; i ++) {
			var newIndex = songDatashare.songData.findIndex(function(p) { return p["_id"] == insertedData[i]["_id"]; })
			songDatashare.songIndices.push(newIndex);
			$("#editSongSelect > .songItem").eq(newIndex).addClass("ui-sortable-selected");
		}
		$("#editSongSelect").trigger('ui-sortable-selectionschanged');
	});

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

		$rootScope.$emit("loadDownload", {"songs": songList});
	};

	$scope.addAndDownload = function() {
		if (songDatashare.checkSongFields()) {
			return;
		}
		console.log("add + download");
		console.log(songDatashare.editData);
		$rootScope.$emit("loadDownload", {"songs": [songDatashare.editData]}, $scope.addSong);
		// songDatashare.addSong();	//this resets the input
	}
}]);