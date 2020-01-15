app.controller('playCtrl', ["$scope", "$timeout", "$location", "uiSortableMultiSelectionMethods", "dispatcher",
		function ($scope, $timeout, $location, uiSortableMultiSelectionMethods, dispatcher) {
	$scope.playlistData = {touched: false};
	$scope.songIndices = [];
	$scope.focusMode = false;
	$scope.nowPlaying = null;
	$scope.nowPlayingIndex = 0;
	// var curIndex = 0;
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

	function setQueue(nextIndex=0) {
		//update playem queue here
		$scope.playem.clearQueue();
		console.log($scope.playlistData.contents);
		for (var i = 0; i < $scope.playlistData.contents.length; i ++) {
			$scope.playem.addTrackByUrl($scope.playlistData.contents[i]["url"]);
		}
		console.log($scope.playem.getQueue());
		//select the current playing
		$scope.nowPlayingIndex = $scope.playlistData.contents.findIndex(function(song) { return song["origOrder"] == $scope.nowPlaying["origOrder"]; });
		if ($scope.nowPlayingIndex == -1) {
			//can't find the index, so it must have been removed. select the next index and play
			$scope.selectIndex(nextIndex);
		}
		else {
			// curIndex = $scope.playlistData.contents.findIndex(function(song) { return song["origOrder"] == $scope.nowPlaying["origOrder"]; });
			// $scope.selectIndex(curIndex, false);
			$scope.selectIndex($scope.nowPlayingIndex, false);
			// userSet = false;
			//set the current playing
			// $scope.nowPlayingIndex = $scope.playem.setCurrentTrack(curIndex).index;
			$scope.playem.setCurrentTrack($scope.nowPlayingIndex).index;
		}
	};

	$scope.sortablePlayingList = uiSortableMultiSelectionMethods.extendOptions({
		refreshPositions: true,
		stop: function(e, ui) {
			setQueue();
			for (var i = 0; i < $scope.playlistData.contents.length; i ++) {
				$scope.playlistData.contents["origOrder"] = i;
			}
			$scope.playlistData.touched = true;
		}
	});

	$scope.playem.on("onTrackChange", function(data) {
		console.log("track changed");
		// console.log(curIndex);
		console.log(userSet);
		//set the new index here if continuing (ie not user set)
		if (!userSet) {
			// curIndex ++;
			// curIndex = $scope.playem.getCurrentTrack().index;
			$scope.nowPlayingIndex = $scope.playem.getCurrentTrack().index;
		}
		$scope.selectIndex($scope.nowPlayingIndex, false);
		// $scope.selectIndex(curIndex, false);
		$scope.nowPlaying = $scope.playlistData.contents[data.index];
		$scope.nowPlayingIndex = data.index;
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
		// curIndex = index;
		$scope.nowPlayingIndex = index;
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
		//TODO: check if touched, and if true, verify to discard or save
	});

	$scope.previousSong = function() {
		if ($scope.playem != null) {
			$scope.playem.prev();
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

	$scope.repeatOn = false;
	$scope.toggleRepeat = function() {
		$scope.repeatOn = $scope.playem.toggleRepeat();
	};

	$scope.shuffleOn = false;
	$scope.toggleShuffle = function() {
		$scope.shuffleOn = !$scope.shuffleOn;
		if (!$scope.playlistData.contents) {
			return;
		}
		if (!$scope.shuffleOn) {
			//rearrange to the original order
			$scope.playlistData.contents.sort((a, b) => a.origOrder - b.origOrder);
			setQueue();
			return;
		}
		//modified from: https://stackoverflow.com/questions/6274339/how-can-i-shuffle-an-array
		//if currently playing is index 0, shuffle all but 0
		//else set currently playing to index 0, and shuffle rest
		var j, x, i;
		if ($scope.playlistData.contents.length < 2) {	//need at least 2 elements, otherwise no shuffling
			return;
		}
		else if ($scope.playlistData.contents.length == 2) {	//simple swap
			x = $scope.playlistData.contents[0];
			$scope.playlistData.contents[0] = $scope.playlistData.contents[1];
			$scope.playlistData.contents[1] = x;
			setQueue();
			return;
		}

		console.log("SHUFFLING");
		console.log($scope.nowPlayingIndex);
		if ($scope.nowPlayingIndex != 0) {	//then swap the current playing with 0
			x = $scope.playlistData.contents[0];
			$scope.playlistData.contents[0] = $scope.playlistData.contents[$scope.nowPlayingIndex];
			$scope.playlistData.contents[$scope.nowPlayingIndex] = x;
			$scope.nowPlayingIndex = 0;
		}
		for (i = $scope.playlistData.contents.length - 1; i > 1; i--) {
			j = Math.floor(Math.random() * i) + 1;
			x = $scope.playlistData.contents[i];
			$scope.playlistData.contents[i] = $scope.playlistData.contents[j];
			$scope.playlistData.contents[j] = x;
		}
		setQueue();
	};

	function cleanUrl(id){
		// return /([a-zA-Z0-9_\-]+)/.test(id) && RegExp.lastParen;
		return id.match(/^.*(?:(?:youtu\.be\/|v\/|vi\/|u\/\w\/|embed\/)|(?:(?:watch)?\?v(?:i)?=|\&v(?:i)?=))([^#\&\?]*).*/)[1];
	};

	$scope.getThumbnail = function(url) {
		console.log("THUMBNAIL");
		console.log(url);
		console.log(cleanUrl(url));
		return "https://img.youtube.com/vi/" + cleanUrl(url) + "/0.jpg";
	};

	$scope.removeSelected = function() {
		//remove from scope, then set queue, then play the next track if removing currently playing (handled in setQueue)
		$scope.playlistData.touched = true;
		var lastSelectedIndex = $scope.nowPlayingIndex;
		var reduce = false;
		$scope.songIndices.sort((a, b) => a-b);
		for (var i = $scope.songIndices.length - 1; i >= 0; i--) {
			$scope.playlistData.contents.splice($scope.songIndices[i], 1);
			if (lastSelectedIndex == $scope.songIndices[i]) {
				reduce = true;
			}
			else if (reduce && lastSelectedIndex < $scope.songIndices[i]) {
				lastSelectedIndex --;
			}
		}
		if ($scope.playlistData.contents.length == 0) {
			$scope.playem.clearQueue();
			$scope.playem.stop();
			$("#mainPlayer").empty();
		}
		else {
			setQueue(Math.min(lastSelectedIndex, $scope.playlistData.contents.length - 1));
		}
	};

	$scope.savePlaylist = function() {
		//TODO implement
	};
}]);