app.controller('playCtrl', ["$scope", "$timeout", "$location", "$http", "uiSortableMultiSelectionMethods", "dispatcher", "youtubeFuncs", "songDatashare",
		function ($scope, $timeout, $location, $http, uiSortableMultiSelectionMethods, dispatcher, youtubeFuncs, songDatashare) {
	$scope.songDatashare = songDatashare;
	$scope.playlistData = {touched: false};
	$scope.songIndices = [];
	$scope.focusMode = false;
	$scope.reccMode = true;
	$scope.nowPlaying = null;
	$scope.nowPlayingIndex = 0;
	// var curIndex = 0;
	var userSet = false;	//used to handle user playing a song; true if action is from user or simulates user, false if normal progression of tracks
	var songsToAdd = [];	//keep track of songs added through link
	$scope.playem = new Playem();
	var config = {
		playerContainer: document.getElementById("mainPlayer"),
		playerId: "mainPlayer"
	};
	//test
	// $scope.playem.addPlayer(YoutubePlayer, config);
	// $scope.playem.addTrackByUrl("https://www.youtube.com/watch?v=L16vTRw9mDQ");
	// $scope.playem.play();

	dispatcher.on("startPlay", function(data) {
		$scope.updatePlayView();
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
			// $scope.playlistData["contents"][i]["artistStr"] = data["contents"][i]["artist"].join(", ");
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
		//set the reccs here
		console.log("TRACK CHANGED");
		console.log($scope.nowPlaying);
		//from: http://www.whateverorigin.org/
		$.getJSON('http://www.whateverorigin.org/get?url=' + encodeURIComponent($scope.nowPlaying["url"]) + '&callback=?', function(data){
			// alert(data.contents);
			console.log("RECEIVED recommended data!");
			if (data && data != null && typeof data == "object" && data.contents && data.contents != null && typeof data.contents == "string") {
				//from: https://stackoverflow.com/questions/6659351/removing-all-script-tags-from-html-with-js-regular-expression
				var reccHtml = data.contents.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
				// console.log(reccHtml);
				$("#recommended").html($("li.video-list-item.related-list-item.show-video-time.related-list-item-compact-video", reccHtml));
				$("#recommended > li").wrap('<div class="recc-container"/>').contents().unwrap();
				//modify links
				var duplicateLinks = [];
				var addingLinks = new Set();
				$("#recommended").find("a, img").attr("href", function(i, attr) {
					if (typeof attr != "undefined") {
						let key = $(this).parent().attr("class") + attr;
						if (addingLinks.has(key)) {
							duplicateLinks.push(i);
						}
						else {
							addingLinks.add(key);
						}
						return "https://youtube.com" + attr;
					}
				});
				//remove duplicate links
				console.log("REMOVING DUPS");
				console.log(duplicateLinks);
				console.log(addingLinks);
				duplicateLinks.sort(function(a, b) { return b - a; });
				for (var i = 0; i < duplicateLinks.length; i ++) {
					console.log("removing duplicate");
					$("#recommended").find("a, img").eq(duplicateLinks[i]).parents(".recc-container").remove();
				}
				//modify images
				$("#recommended").find("img").attr("src", function(i, src) {
					return $(this).attr("data-thumb");
				});
				//remove duation span
				$(".content-wrapper > a > span:contains(Duration)").remove();
				//remove view count
				$(".content-wrapper").find(".stat.view-count").remove();
				//attach a click event handler to the links
				$("#recommended").find("a").on("click", function(e) {
					console.log("clicked recc link");
					console.log(this);
					e.preventDefault();
					//insert link data as the next song
					var tempData = {};
					var parentA;
					var curParent = $(this).parent();
					if (curParent.is(".thumb-wrapper")) {
						console.log("thumb clicked");
						parentA = $(this).parent().siblings(".content-wrapper").find("a");
					}
					else if (curParent.is(".content-wrapper")) {
						console.log("span clicked");
						parentA = $(this);
					}
					else {
						return;
					}
					console.log("found parent A");
					console.log(parentA);
					tempData["type"] = "youtube";
					tempData["url"] = parentA.attr("href");
					//search for this url in song data; if it exists copy the info instead of adding
					var matched = false;
					for (var i = 0; i < songDatashare.songData.length; i ++) {
						if (songDatashare.songData[i]["url"] == tempData["url"]) {
							console.log("MATCHED URL");
							tempData = songDatashare.songData[i];
							matched = true;
							break;
						}
					}
					if (!matched) {
						console.log("FAILED TO FIND URL: MUST BE NEW SONG");
						tempData["name"] = parentA.children(".title").text().trim();
						tempData["artistStr"] = parentA.children(".stat.attribution").text().trim();
						tempData["artist"] = [tempData["artistStr"]];
						tempData["album"] = "";
						tempData["genre"] = "";
						tempData["vol"] = 100;
						tempData["start"] = 0;
						tempData["end"] = 0;
						console.log(tempData);
						songsToAdd.push(tempData);
					}
					//add to contents and set origOrder and add to playem
					var curOrigOrder = $scope.nowPlaying.origOrder;
					for (var i = 0; i < $scope.playlistData.contents.length; i ++) {
						if ($scope.playlistData.contents[i].origOrder > curOrigOrder) {
							$scope.playlistData.contents[i].origOrder ++;
						}
					}
					tempData["origOrder"] = curOrigOrder + 1;
					$scope.playlistData.contents.splice($scope.nowPlayingIndex + 1, 0, tempData);
					setQueue();
					$scope.playlistData.touched = true;
				});
			}
		});
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
		if ($scope.playem != null && $scope.playem.getPlayers().length > 0 && $scope.playem.getCurrentTrack() != null) {
			console.log($scope.playem.getPlayers());
			$scope.playem.pause();
		}
		//TODO: check if touched, and if true, verify to discard or save
		//TODO: check if added song, but didn't save yet
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

	$scope.getThumbnail = youtubeFuncs.getThumbnail;

	$scope.removeSelected = function() {
		if (confirm("Remove selected song(s)?")) {
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
				$("#mainPlayer").empty().append("Select a playlist first!");
				$scope.songIndices = [];
			}
			else {
				setQueue(Math.min(lastSelectedIndex, $scope.playlistData.contents.length - 1));
			}
		}
	};

	function doSavePlaylist() {
		var submission = {};
		submission["name"] = $scope.playlistData["name"];
		submission["contents"] = [];
		for (var i = 0; i < $scope.playlistData.contents.length; i ++) {
			submission["contents"].push($scope.playlistData.contents[i]["_id"]);
		}
		if ($scope.playlistData["_id"]) {
			console.log("saving playlist");
			submission["_id"] = $scope.playlistData["_id"];
			$http.post("/editPlaylist", submission).then(function(resp) {
				console.log("editting playlist ok");
				dispatcher.emit("songsRemoved");
				$scope.playlistData.touched = false;
			}, function(err) {
				console.log(err);
			});
		}
		else {
			console.log("adding playlist");
			$http.post("/addPlaylist", submission).then(function(resp) {
				console.log("adding playlist ok");
				dispatcher.emit("songsRemoved");
				$scope.playlistData.touched = false;
			}, function(err) {
				console.log(err);
			});
		}
	};

	$scope.savePlaylist = function() {
		//TODO: check if need to write songs first
		if (songsToAdd.length > 0) {
			if (confirm("There are new songs to add; continue?")) {
				//add multiple with their default values
				//then make save playlist
				$http.post("/addManyMusic", songsToAdd).then(function(resp) {
					console.log(resp);
					//clear songsToAdd, and copy in new info
					for (var j = 0; j < resp.data.length; j ++) {
						for (var i = songsToAdd.length - 1; i >= 0; i --) {
							if (songsToAdd[i]["url"] == resp.data[j]["url"]) {
								songsToAdd.splice(i, 1);
								break;
							}
						}
						//add info to current playlist
						for (var i = 0; i < $scope.playlistData.contents.length; i ++) {
							if ($scope.playlistData.contents[i]["url"] == resp.data[j]["url"]) {
								//save the origOrder
								var origOrder = $scope.playlistData.contents[i]["origOrder"];
								$scope.playlistData.contents[i] = resp.data[j];
								$scope.playlistData.contents[i]["origOrder"] = origOrder;
							}
						}
					}
					//then make save
					doSavePlaylist();
				}, function(err) {
					console.log(err);
				});
			}
			else {
				return;
			}
		}
		else {
			doSavePlaylist();
		}
	};

	$scope.downloadPlaylist = function() {
		dispatcher.emit("loadDownload", {"name": $scope.playlistData.name, "songs": $scope.playlistData.contents})
	};

	$scope.updatePlayView = function() {
		if (!$scope.focusMode && $scope.reccMode) {	//show both player and reccs
			$("#mainPlayer").height("calc(100% - 300px)");
			$("#recommended").height("300px");
		}
		else if ($scope.focusMode && $scope.reccMode) {	//show only reccs
			$("#recommended").height("calc(100% - 20px)");
		}
		else if (!$scope.focusMode && !$scope.reccMode) {	//show only player
			$("#mainPlayer").height("100%");
		}
	};

	var edittingToAdd = [];
	$scope.editSelected = function() {
		//load the edit song file
		var toEdit = [];
		for (var i = 0; i < $scope.songIndices.length; i ++) {
			for (var j = 0; j < songsToAdd.length; j ++ ) {
				if (songsToAdd[j]["url"] == $scope.playlistData.contents[$scope.songIndices[i]]["url"]) {
					edittingToAdd.push(songsToAdd[j]);
					break;
				}
			}
			toEdit.push($scope.playlistData.contents[$scope.songIndices[i]]);
		};
		songDatashare.loadEditTemplate("#nowPlayingEditTemplate", $scope, toEdit);
		//display modal
		$("#nowPlayingEditMusicModal").css("display", "flex");
	};

	$scope.submitEditSong = function() {
		//write update to DB
		//first check if safe to add
		if (songDatashare.checkSongFields()) {
			//true means not ok
			return;
		}
		//first check if we need to add the song to the database:
		if (edittingToAdd.length > 0) {
			//add these songs!
			songDatashare.addMultipleSongs(edittingToAdd, function(insertedData) {
				//remove songs that were added via edit
				for (var j = 0; j < insertedData.length; j ++) {
					for (var i = songsToAdd.length - 1; i >= 0; i --) {
						if (songsToAdd[i]["url"] == insertedData[j]["url"]) {
							songsToAdd.splice(i, 1);
							break;
						}
					}
					//add info to current playlist
					for (var i = 0; i < $scope.playlistData.contents.length; i ++) {
						if ($scope.playlistData.contents[i]["url"] == insertedData[j]["url"]) {
							//save the origOrder
							var origOrder = $scope.playlistData.contents[i]["origOrder"];
							$scope.playlistData.contents[i] = insertedData[j];
							$scope.playlistData.contents[i]["origOrder"] = origOrder;
						}
					}
				}
				edittingToAdd = [];
			});
		}
		//data is now coerced and ready to push
		songDatashare.editSong(function(insertedData) {
			dispatcher.emit("songChanged", insertedData);
		});
		$scope.closeEditSongModal();
	};

	dispatcher.on("songChanged", function(insertedData) {
		for (var j = 0; j < insertedData.length; j ++) {
			for (var i = 0; i < $scope.playlistData.contents.length; i ++) {
				if ($scope.playlistData.contents[i]["_id"] == insertedData[j]["_id"]) {
					//save the origOrder
					var origOrder = $scope.playlistData.contents[i]["origOrder"];
					$scope.playlistData.contents[i] = insertedData[j];
					$scope.playlistData.contents[i]["origOrder"] = origOrder;
				}
			}
		}
	})

	$scope.closeEditSongModal = function() {
		songDatashare.stopPlayem();
		$("#nowPlayingEditMusicModal").hide();
	};

	$("body").on("click", function(evt) {
		if ($(".modal").toArray().includes(evt.target)) {
			$scope.closeEditSongModal();
		}
	})
	.keyup(function(evt) {
		if (evt.keyCode == 27) {	//escape key
			$scope.closeEditSongModal();
		}
	});
}]);