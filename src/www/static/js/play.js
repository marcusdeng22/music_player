app.controller('playCtrl', ["$scope", "$timeout", "$location", "uiSortableMultiSelectionMethods", "dispatcher",
		function ($scope, $timeout, $location, uiSortableMultiSelectionMethods, dispatcher) {
	$scope.playlistData = {};
	$scope.songIndices = [];
	$scope.focusMode = false;
	$scope.nowPlaying = null;
	var curIndex = 0;
	var userSet = false;	//used to handle user playing a song; true if action is from user or simulates user, false if normal progression of tracks
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
			$scope.playlistData["contents"][i]["origOrder"] = i;
			$scope.playem.addTrackByUrl(data["contents"][i]["url"]);
		}
		console.log($scope.playem);
		$scope.selectIndex(0);	//triggers play
	});

	$scope.sortablePlayingList = uiSortableMultiSelectionMethods.extendOptions({
		refreshPositions: true,
		beforeStop: function(e, ui) {
			console.log("BEFORE STOP");
			console.log($scope.playlistData.contents);
		},
		stop: function(e, ui) {
			console.log("STOP");
			console.log($scope.playlistData.contents);
			//update playem queue here
			$scope.playem.clearQueue();
			console.log($scope.playlistData.contents);
			for (var i = 0; i < $scope.playlistData.contents.length; i ++) {
				$scope.playem.addTrackByUrl($scope.playlistData.contents[i]["url"]);
			}
			console.log($scope.playem.getQueue());
			//select the current playing
			curIndex = $scope.playlistData.contents.findIndex(function(song) { return song["origOrder"] == $scope.nowPlaying["origOrder"]; });
			$scope.selectIndex(curIndex, false);
			// userSet = false;
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
			// curIndex ++;
			curIndex = $scope.playem.getCurrentTrack().index;
		}
		$scope.selectIndex(curIndex, false);
		$scope.nowPlaying = $scope.playlistData.contents[data.index];
		// userSet = false;
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
		console.log("playing now!");
		$scope.playem.play(index);
	};

	$scope.selectIndex = function(index, play=true) {
		// userSet = true;
		curIndex = index;
		$scope.songIndices = [index];
		console.log($scope.songIndices);
		$timeout(function() {
			console.log($(".playItem"));
			//find and click
			$(".playItem").eq($scope.songIndices).click();
			if (play) {
				userSet = true;
				$scope.startPlay(index);
			}
			else {
				userSet = false;
			}
		});
	};

	$scope.$on("$locationChangeStart", function() {
		if ($scope.playem != null) {
			$scope.playem.pause();
		}
	});

	$(function() {
		$("#focusSwitch").bootstrapToggle({
			on: "Focus Mode",
			off: "Watch Mode"
		});
	});

	$scope.previousSong = function() {
		if ($scope.playem != null) {
			$scope.playem.prev();	//TODO: onTrackChange triggers + instead of -
		}
	};

	$scope.nextSong = function() {
		if ($scope.playem != null) {
			$scope.playem.next();
		}
	};

	$scope.currentState = 0;	//1 for play, 0 for pause
	$scope.playPause = function() {
		console.log("play pause btn pressed");
		console.log($scope.currentState);
		if ($scope.playem != null) {
			if ($scope.currentState == 1) {
				$scope.playem.pause();
			}
			else if ($scope.currentState == 0) {
				$scope.playem.resume();
			}
		}
		// $scope.currentState = ~$scope.currentState;	//handled by events below
	};

	$scope.playem.on("onPlay", function() {
		console.log("playing!");
		$scope.currentState = 1;
		if (!$scope.$$phase) {
			$scope.$apply();
		}
	});

	$scope.playem.on("onPause", function() {
		console.log("paused!");
		$scope.currentState = 0;
		if (!$scope.$$phase) {
			$scope.$apply();
		}
	});

	$scope.toggleRepeat = function() {
		//TODO implement
	};

	$scope.toggleShuffle = function() {
		//TODO implement
	};
}]);