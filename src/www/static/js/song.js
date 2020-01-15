app.controller('songCtrl', ['$scope', '$http', '$location', '$timeout', 'dispatcher', 'uiSortableMultiSelectionMethods', 'sortingFuncs', 'songDatashare',
		function($scope, $http, $location, $timeout, dispatcher, uiSortableMultiSelectionMethods, sortingFuncs, songDatashare) {
	//data model
	$scope.songDatashare = songDatashare;

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
		//load the edit song file
		songDatashare.loadEditTemplate("#songEditTemplate", $scope, songDatashare.songData[songDatashare.songIndices], undefined, function() {
			dispatcher.emit("preview");
		});
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
		songDatashare.stopPlayem();
		$("#songEditModal").hide();
	}

	$("body").on("click", function(evt) {
		if ($(".modal").toArray().includes(evt.target)) {
			$scope.closeEdit();
		}
	})
	.keyup(function(evt) {
		if (evt.keyCode == 27) {	//escape key
			$scope.closeEdit();
		}
	});

	$scope.removeSongs = function() {
		songDatashare.removeSongs();
	};

	$scope.addSong = function() {
		songDatashare.addSong();
	};

	$scope.cancelAdd = function() {
		songDatashare.resetEdit();
		$("#songListTab").click();
	};
}]);