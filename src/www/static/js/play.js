app.controller('playCtrl', ["$scope", "$timeout", "$location", "uiSortableMultiSelectionMethods", "dispatcher",
		function ($scope, $timeout, $location, uiSortableMultiSelectionMethods, dispatcher) {
	$scope.playlistData = {};
	$scope.songIndices = [];
	var curIndex = 0;
	var userSet = false;	//used to handle user selecting a song
	var playingID;
	$scope.playem = new Playem();
	var config = {
		playerContainer: document.getElementById("mainPlayer")
	};
	//test
	// $scope.playem.addPlayer(YoutubePlayer, config);
	// $scope.playem.addTrackByUrl("https://www.youtube.com/watch?v=L16vTRw9mDQ");
	// $scope.playem.play();

	dispatcher.on("startPlay", function(data) {
		console.log("starting to play");
		console.log(data);
		//add into queue
		$scope.playem.stop();
		$scope.playem.clearQueue();
		$scope.playem.clearPlayers();
		$("#mainPlayer").empty();
		// var config = {playerContainer: document.getElementById("mainPlayer")}
		// var config = {
		// 	playerContainer: document.getElementById("mainPlayer")
		// };
		$scope.playem.addPlayer(YoutubePlayer, config);	//TODO: add more players here
		$scope.playlistData = data;
		for (var i = 0; i < data["contents"].length; i ++) {
			$scope.playlistData["contents"][i]["artistStr"] = data["contents"][i]["artist"].join(", ");
			$scope.playem.addTrackByUrl(data["contents"][i]["url"]);
		}
		console.log($scope.playem);
		$scope.selectIndex(0);	//triggers play
	});

	$scope.sortablePlayingList = uiSortableMultiSelectionMethods.extendOptions({
		refreshPositions: true,
		stop: function(e, ui) {
			//TODO: update playem queue here
			$scope.playem.clearQueue(false);	//does not stop, but stops resuming (TODO: allow resuming)
			console.log($scope.playlistData.contents);
			for (var i = 0; i < $scope.playlistData.contents.length; i ++) {
				$scope.playem.addTrackByUrl($scope.playlistData.contents[i]["url"]);
			}
			console.log($scope.playem.getQueue());
			//select the current playing
			curIndex = $scope.playlistData.contents.findIndex(function(song) { return song["_id"] == playingID; });
			$scope.selectIndex(curIndex, false);
			userSet = false;
			//set the current playing
			$scope.playem.setCurrentTrack(curIndex);
		}
	});

	$scope.playem.on("onTrackChange", function(data) {
		console.log("track changed");
		console.log(curIndex);
		console.log(userSet);
		//set the new index here if continuing (ie not user set)
		if (!userSet) {
			curIndex ++;
			// userSet = false;
		}
		else {
			// userSet = false;
		}
		$scope.selectIndex(curIndex, false);
		playingID = $scope.playlistData.contents[data.index]["_id"];
		userSet = false;
		console.log(data);
	});


	$("#playingSelect").on('ui-sortable-selectionschanged', function (e, args) {
		//updates new indices; track ordering handled by stop
		$scope.songIndices = $(this).find('.ui-sortable-selected').map(function(i, element){
		  return $(this).index();
		}).toArray();
		$scope.$apply();
	});

	$scope.startPlay = function(index) {
		//TODO: switch to track, and play
		console.log("playing now!");
		// selectIndex(index, false);
		// $scope.playem.jumpToTrack(index);
		$scope.playem.play(index);
	};

	$scope.selectIndex = function(index, play=true) {
		userSet = true;
		curIndex = index;
		$scope.songIndices = [index];
		console.log($scope.songIndices);
		$timeout(function() {
			console.log($(".playItem"));
			//find and click
			$(".playItem").eq($scope.songIndices).click();
			if (play) {
				$scope.startPlay(index);
			}
		});
	};

	$scope.$on("$locationChangeStart", function() {
		$scope.playem.pause();
	})
}]);