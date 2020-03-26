app.controller('playCtrl', ["$scope", "$timeout", "$location", "$window", "$http", "uiSortableMultiSelectionMethods", "$rootScope", "youtubeFuncs", "songDatashare", "playDatashare",
		function ($scope, $timeout, $location, $window, $http, uiSortableMultiSelectionMethods, $rootScope, youtubeFuncs, songDatashare, playDatashare) {
	$scope.songDatashare = songDatashare;
	$scope.playlistData = {touched: false, renamed: "", name:""};
	$scope.songIndices = [];
	$scope.focusMode = false;
	$scope.reccMode = true;
	// $scope.nowPlaying = null;
	$scope.nowPlayingIndex = 0;
	var userSet = false;	//used to handle user playing a song; true if action is from user or simulates user, false if normal progression of tracks
	var songsToAdd = [];	//keep track of songs added through reccommended link
	var edittingToAdd = [];	//keep track of songs that are editting
	// $scope.playem = new Playem();
	// var config = {
	// 	playerContainer: document.getElementById("mainPlayerContainer"),
	// 	playerId: "mainPlayer"
	// };
	var autoSelect = true;	//set to false when dragging, multiple selected, or edit modal open (download modal downloads entire playlist)

	// function loadPlayem() {
	// 	$scope.playem.stop();
	// 	$scope.playem.clearQueue();
	// 	$scope.playem.clearPlayers();
	// 	$("#mainPlayerContainer").empty();
	// 	$scope.playem.addPlayer(YoutubePlayer, config);	//TODO: add more players here
	// };

	//https://stackoverflow.com/questions/34883555/how-to-scroll-text-within-a-div-to-left-when-hovering-the-div/43889818#43889818
	$(".nowPlaying").on("mouseover", function() {
		var maxScroll = $(this).width();
		$(this).removeClass("ellipsis").animate({
			scrollLeft: maxScroll
		}, "fast");
	}).on("mouseout", function() {
		$(this).stop().addClass("ellipsis").animate({
			scrollLeft: 0
		}, "fast");
	});

	//scroll into view: https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollIntoView
	function scrollSelected() {
		if ($scope.songIndices.length > 0 && $(".playItem").eq($scope.songIndices).length > 0) {
			$(".playItem").eq($scope.songIndices)[0].scrollIntoView({
				behavior: "smooth",
				block: "start",
				inline: "nearest"
			});
		}
	};

	function loadAndStart(data, play=true, delay=50) {
		$scope.updatePlayView();
		console.log("starting to play");
		console.log(data);
		//clear edit
		songsToAdd = [];
		edittingToAdd = [];
		//add into queue
		// loadPlayem();
		playDatashare.loadPlayem();
		$scope.playlistData = data;
		if (! ("renamed" in data)) {
			$scope.playlistData.renamed = "";
		}
		for (var i = 0; i < data["contents"].length; i ++) {
			// $scope.playlistData["contents"][i]["artistStr"] = data["contents"][i]["artist"].join(", ");
			if (!$scope.shuffleOn) {
				$scope.playlistData["contents"][i]["origOrder"] = i;
			}
			// $scope.playem.addTrackByUrl(data["contents"][i]["url"]);
			playDatashare.playem.addTrackByUrl(data["contents"][i]["url"], data["contents"][i]["vol"]);
			//add to songsToAdd if no _id
			if (!data["contents"][i]["_id"]) {
				console.log("load adding song to add queue");
				songsToAdd.push(data["contents"][i]);
			}
		}
		// console.log($scope.playem);
		console.log(songsToAdd);
		$timeout(function() {
			var loadIndex = data["startIndex"] || 0;
			$scope.selectIndex(data["startIndex"] || 0, play);	//triggers play
			if (!play) {
				//cue; nowPlaying is set on trackchange
				playDatashare.playem.cue(data["startIndex"] || 0);
			}
			// $(window).on("load", scrollSelected);
			$timeout(scrollSelected, delay);
		}, delay);
	};

	$rootScope.$on("startPlay", function(e, data) {
		$scope.shuffleOn = false;	//don't shuffle on load
		loadAndStart(data);
		var myQuery = {
			"touched": data.touched,
			"name": $scope.playlistData.name,
			"renamed": $scope.playlistData.renamed,
			"contents": $scope.playlistData.contents,
			"shuffle": false
		};
		if ($scope.playlistData["_id"] != null) {
			myQuery["_id"] = $scope.playlistData["_id"];
		}
		else {
			myQuery["unset"] = true
		}
		$http.post("/setLast", myQuery).then(undefined ,function(err) {
			alert("Failed to update last playlist");
		});
	});

	function setQueue(nextIndex=0, select=false, scroll=select) {
		//update playem queue here
		playDatashare.playem.clearQueue();
		// $scope.playem.clearQueue();
		console.log($scope.playlistData.contents);
		for (var i = 0; i < $scope.playlistData.contents.length; i ++) {
			playDatashare.playem.addTrackByUrl($scope.playlistData.contents[i]["url"]);
			// $scope.playem.addTrackByUrl($scope.playlistData.contents[i]["url"]);
		}
		// console.log($scope.playem.getQueue());
		//select the current playing
		$scope.nowPlayingIndex = $scope.playlistData.contents.findIndex(function(song) { return song["origOrder"] == playDatashare.nowPlaying["origOrder"]; });
		// $scope.nowPlayingIndex = $scope.playlistData.contents.findIndex(function(song) { return song["origOrder"] == $scope.nowPlaying["origOrder"]; });
		if ($scope.nowPlayingIndex == -1) {
			//can't find the index, so it must have been removed. select the next index and play
			$scope.selectIndex(nextIndex);	//track changes -> scrolls
		}
		else {
			if (select) {
				$scope.selectIndex($scope.nowPlayingIndex, false);	//select the now playing song, but don't trigger play
				//scroll
				if (scroll) {
					scrollSelected();
				}
			}
			//set the current playing
			playDatashare.playem.setCurrentTrack($scope.nowPlayingIndex);
			// $scope.playem.setCurrentTrack($scope.nowPlayingIndex);
		}
	};

	$scope.sortablePlayingList = uiSortableMultiSelectionMethods.extendOptions({
		refreshPositions: true,
		start: function(e, ui) {
			autoSelect = false;
		},
		stop: function(e, ui) {
			setQueue();
			//update only if order changes; need to update origOrder after determining no difference
			var changed = false;
			console.log("STOP DRAG");
			console.log($scope.playlistData.contents);
			for (var i = 0; i < $scope.playlistData.contents.length; i ++) {
				if (!changed && $scope.playlistData.contents[i]["origOrder"] != i) {
					changed = true;
				}
				if (changed) {
					$scope.playlistData.contents[i]["origOrder"] = i;
				}
			}
			if (changed) {
				$scope.playlistData.touched = true;
				$http.post("/setLast", {"touched": true, "contents": $scope.playlistData.contents}).then(undefined, function(err) {
					alert("Failed to update last playlist");
				});
			}
			if ($scope.songIndices.length <= 1) {
				autoSelect = true;
			}
		}
	});

	playDatashare.playem.on("onTrackChange", function(data) {
	// $scope.playem.on("onTrackChange", function(data) {
		console.log("track changed");
		console.log(userSet);
		//set the new index here if continuing (ie not user set)
		if (!userSet) {
			$scope.nowPlayingIndex = playDatashare.playem.getCurrentTrack().index;
			// $scope.nowPlayingIndex = $scope.playem.getCurrentTrack().index;
		}
		//don't select the current song if dragging, multiple selected, or modal open
		if (autoSelect) {
			$scope.selectIndex($scope.nowPlayingIndex, false);
			scrollSelected();
		}
		playDatashare.nowPlaying = $scope.playlistData.contents[data.index];
		// $scope.nowPlaying = $scope.playlistData.contents[data.index];
		$scope.nowPlayingIndex = data.index;
		//set media navigator; TODO: does not work
		if ("mediaSession" in navigator) {
			console.log("SETTING NAVIGATOR");
			navigator.mediaSession.setActionHandler("previoustrack", function() {
				console.log("PREV PRESS");
				$scope.previousSong();
			});
			navigator.mediaSession.setActionHandler("nexttrack", function() {
				console.log("NEXT PRESS");
				$scope.nextSong();
			})
			// console.log(navigator);
		}
		console.log(data);
		//set the reccs here
		console.log("TRACK CHANGED");
		// console.log($scope.nowPlaying);
		// console.log($scope.playem.getQueue());
		// console.log($scope.playem.getCurrentTrack());
		//update last played playlist
		$http.post("/setLast", {"startIndex": $scope.nowPlayingIndex}).then(undefined, function(err) {
			alert("Failed to update last playlist");
		});
		getRecommended();
	});

	function getRecommended() {
		$http.post("/getRecc", {"type": playDatashare.nowPlaying["type"], "vid": youtubeFuncs.cleanUrl(playDatashare.nowPlaying["url"])}).then(function(resp) {
			console.log("RECOMMENDED DATA");
			console.log(resp);
			$("#recommended").html(resp.data.contents);

			$("#recommended").find("a").on("click", function(e) {
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
					tempData["type"] = "youtube";
					tempData["url"] = parentA.attr("href");
					//search for this url in song data; if it exists copy the info instead of adding
					var matched = false;
					$http.post("/findMusic", {"url": [tempData["url"]]}).then(function(m_resp) {
						console.log(m_resp);
						if (m_resp.data.results.length == 1) {
							tempData = m_resp.data.results[0];
						}
						else {
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
						var curOrigOrder = playDatashare.nowPlaying.origOrder;
						for (var i = 0; i < $scope.playlistData.contents.length; i ++) {
							if ($scope.playlistData.contents[i].origOrder > curOrigOrder) {
								$scope.playlistData.contents[i].origOrder ++;
							}
						}
						tempData["origOrder"] = curOrigOrder + 1;
						$scope.playlistData.contents.splice($scope.nowPlayingIndex + 1, 0, tempData);
						if (!$scope.$$phase) {
							$scope.$apply();
						}
						setQueue();
						$scope.playlistData.touched = true;
						$http.post("/setLast", {"touched": true, "contents": $scope.playlistData.contents}).then(undefined, function(err) {
							console.log(err);
							alert("Failed to update last playlist");
						});
					});
				});
		}, function(err) {
			console.log(err);
		});
	}

	$("#playingSelect").on('ui-sortable-selectionschanged', function (e, args) {
		//updates new indices; track ordering handled by stop
		$scope.songIndices = $(this).find('.ui-sortable-selected').map(function(i, element){
		  return $(this).index();
		}).toArray();
		if ($scope.songIndices.length > 1) {
			autoSelect = false;
		}
		else {
			autoSelect = true;
		}
		$scope.$apply();
	});

	// $scope.startPlay = function(index) {
	// 	console.log("playing now!");
	// 	playDatashare.playem.play(index);
	// 	// $scope.playem.play(index);
	// };

	$scope.selectIndex = function(index, play=true) {
		$scope.nowPlayingIndex = index;
		$scope.songIndices = [index];
		console.log($scope.songIndices);
		$timeout(function() {
			console.log($(".playItem"));
			//find and click
			$(".playItem").eq($scope.songIndices).click();
			if (play) {
				userSet = true;
				// $scope.startPlay(index);
				playDatashare.playem.play(index);
			}
			else {
				userSet = false;
			}
		});
	};

	var initLoad = false;
	$scope.$on("$locationChangeStart", function(event, next, current) {
		console.log("CHANGING LOCATION");
		//make the following only trigger if we are navigating away from the play view
		//https://github.com/angular/angular.js/issues/13812
		if ($window.location.hash == "#!#play") {	//$window.location.hash contains the current hash
			if ($scope.playlistData.touched && confirm("Unsaved changes; do you want to save them?")) {
				// //cancel the location change
				// event.preventDefault();
				//trigger save
				$scope.savePlaylist();
			}
			//with global ctrl, don't pause
			// if (playDatashare.playem != null && playDatashare.playem.getPlayers().length > 0 && playDatashare.playem.getCurrentTrack() != null) {
			// // if ($scope.playem != null && $scope.playem.getPlayers().length > 0 && $scope.playem.getCurrentTrack() != null) {
			// 	// console.log($scope.playem.getPlayers());
			// 	playDatashare.playem.pause();
			// 	// $scope.playem.pause();
			// }
		}
		if (next.split("#")[2] == "play") {
			console.log("switched to play");
			if (!initLoad) {
				initLoad = true;
				$timeout(scrollSelected);
			}
		}
	});

	$scope.playDatashare = playDatashare;
	$scope.previousSong = playDatashare.previousSong;
	$scope.nextSong = playDatashare.nextSong;
	$scope.playPause = playDatashare.playPause;

	$scope.repeatOn = false;
	$scope.toggleRepeat = function() {
		$scope.repeatOn = playDatashare.playem.toggleRepeat();
		// $scope.repeatOn = $scope.playem.toggleRepeat();
		$http.post("/setLast", {"loop": $scope.repeatOn}).then(undefined, function(err) {
			alert("Failed to update last playlist");
		});
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
			setQueue(undefined, true);
			$http.post("/setLast", {"shuffle": $scope.shuffleOn, "contents": $scope.playlistData.contents}).then(undefined, function(err) {
				alert("Failed to update last playlist");
			});
			return;
		}
		//modified from: https://stackoverflow.com/questions/6274339/how-can-i-shuffle-an-array
		//if currently playing is index 0, shuffle all but 0
		//else set currently playing to index 0, and shuffle rest
		var j, x, i;
		if ($scope.playlistData.contents.length < 2) {	//need at least 2 elements, otherwise no shuffling
			$http.post("/setLast", {"shuffle": $scope.shuffleOn}).then(undefined, function(err) {
				alert("Failed to update last playlist");
			});
			return;
		}
		else if ($scope.playlistData.contents.length == 2) {	//simple swap
			x = $scope.playlistData.contents[0];
			$scope.playlistData.contents[0] = $scope.playlistData.contents[1];
			$scope.playlistData.contents[1] = x;
			setQueue(undefined, true);
			$http.post("/setLast", {"shuffle": $scope.shuffleOn, "contents": $scope.playlistData.contents}).then(undefined, function(err) {
				alert("Failed to update last playlist");
			});
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
		setQueue(undefined, true);
		$http.post("/setLast", {"shuffle": $scope.shuffleOn, "contents": $scope.playlistData.contents}).then(undefined, function(err) {
			alert("Failed to update last playlist");
		});
	};

	$scope.getThumbnail = youtubeFuncs.getThumbnail;

	$scope.removeSelected = function() {
		if (confirm("Remove selected song(s)?")) {
			//remove from scope, then set queue, then play the next track if removing currently playing (handled in setQueue)
			$scope.playlistData.touched = true;
			var lastSelectedIndex = $scope.nowPlayingIndex;
			var reduce = false;
			$scope.songIndices.sort((a, b) => a-b);		//start at end of song indices when removing
			for (var i = $scope.songIndices.length - 1; i >= 0; i--) {
				//check if in to add; if so, remove it
				for (var j = songsToAdd.length - 1; j >= 0; j--) {
					if ($scope.playlistData.contents[$scope.songIndices[i]]["url"] == songsToAdd[j]["url"]) {
						songsToAdd.splice(j, 1);
						break;
					}
				}
				$scope.playlistData.contents.splice($scope.songIndices[i], 1);
				if (lastSelectedIndex == $scope.songIndices[i]) {
					reduce = true;
				}
				else if (reduce && lastSelectedIndex < $scope.songIndices[i]) {
					lastSelectedIndex --;
				}
			}
			if ($scope.playlistData.contents.length == 0) {
				playDatashare.playem.clearQueue();
				// $scope.playem.clearQueue();
				playDatashare.playem.stop();
				// $scope.playem.stop();
				$("#mainPlayerContainer").empty().append("Select a playlist first!");
				$scope.songIndices = [];
			}
			else {
				setQueue(Math.min(lastSelectedIndex, $scope.playlistData.contents.length - 1), true, false);
			}
			$http.post("/setLast", {"touched": true, "contents": $scope.playlistData.contents}).then(undefined, function(err) {
				alert("Failed to update last playlist");
			});
		}
	};

	$scope.revertName = function() {
		$scope.playlistData.name = $scope.playlistData.renamed;
	}

	function doSavePlaylistCallback() {
		$rootScope.$emit("songsRemoved");
		$scope.playlistData.touched = false;
		$scope.playlistData.renamed = $scope.playlistData.name;
		$http.post("/setLast", {"touched": false, "_id": $scope.playlistData["_id"], "name": $scope.playlistData.name,
				"renamed": $scope.playlistData.renamed, "contents": $scope.playlistData.contents}).then(undefined, function(err) {
			alert("Failed to update last playlist");
		});
	}

	function doSavePlaylist() {
		var submission = {};
		submission["name"] = $scope.playlistData["name"];
		if (submission["name"].length == 0) {
			alert("Invalid playlist name");
			return;
		}
		submission["contents"] = [];
		for (var i = 0; i < $scope.playlistData.contents.length; i ++) {
			submission["contents"].push($scope.playlistData.contents[i]["_id"]);
		}
		if ($scope.playlistData.renamed == $scope.playlistData.name && $scope.playlistData["_id"]) {
			console.log("saving playlist");
			submission["_id"] = $scope.playlistData["_id"];
			$http.post("/editPlaylist", submission).then(function(resp) {
				console.log("editting playlist ok");
				doSavePlaylistCallback();
				alert("Playlist saved!");
			}, function(err) {
				console.log(err);
				alert("Failed to save playlist");
			});
		}
		else {
			console.log("adding playlist");
			if (confirm("Create new playlist?")) {
				$http.post("/addPlaylist", submission).then(function(resp) {
					console.log("adding playlist ok");
					$scope.playlistData["_id"] = resp.data["_id"];
					$scope.playlistData.renamed = $scope.playlistData.name;
					doSavePlaylistCallback();
					alert("Playlist added!");
				}, function(err) {
					console.log(err);
					alert("Failed to add playlist");
				});
			}
		}
	};

	$scope.savePlaylist = function() {
		//check if need to write songs first
		if (songsToAdd.length > 0) {
			if (confirm("There are new songs to add; continue?")) {
				console.log("SAVING PLAYLIST WITH NEW SONGS");
				console.log(songsToAdd);
				songDatashare.addMultipleSongs(songsToAdd, false, function(insertedData) {
					//clear songsToAdd, and copy in new info
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
					//then make save
					doSavePlaylist();
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
		$rootScope.$emit("loadDownload", {"name": $scope.playlistData.name, "songs": $scope.playlistData.contents})
	};

	$scope.updatePlayView = function() {
		if (!$scope.focusMode && $scope.reccMode) {	//show both player and reccs
			$("#mainPlayerContainer").height("calc(100% - 300px)");
			$("#recommended").height("300px");
		}
		else if ($scope.focusMode && $scope.reccMode) {	//show only reccs
			if ($scope.nowPlaying) {
				$("#recommended").height("calc(100% - 20px)");
			}
		}
		else if (!$scope.focusMode && !$scope.reccMode) {	//show only player
			$("#mainPlayerContainer").height("100%");
		}
	};

	$scope.editSelected = function() {
		autoSelect = false;
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
		console.log("EDIT TEMPLATE POPULATING WITH:");
		console.log(toEdit);
		songDatashare.loadEditTemplate("#nowPlayingEditTemplate", $scope, toEdit);
		//display modal
		$("#nowPlayingEditMusicModal").css("display", "flex");
		//disable URL since we shouldn't be allowed to edit that in play view
		$timeout(function() {
			$("#newSongUrlInput").prop("disabled", true);
		}, 50);
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
			console.log("adding mult songs");
			songDatashare.addMultipleSongs(edittingToAdd, true, function(insertedData) {
				//remove songs that were added via edit
				for (var j = 0; j < insertedData.length; j ++) {
					for (var i = songsToAdd.length - 1; i >= 0; i --) {
						if (songsToAdd[i]["url"] == insertedData[j]["url"]) {
							songsToAdd.splice(i, 1);
							// break;
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
					//add info to edit data
					songDatashare.editDataID.add(insertedData[j]["_id"]);
				}
				edittingToAdd = [];
				//data is now coerced and ready to push
				songDatashare.editSong(function() {
					$scope.closeEditSongModal();
				});
			});
		}
		else {
			songDatashare.editSong(function() {
				$scope.closeEditSongModal();
			});
		}
	};

	$rootScope.$on("playEditSubmit", function() {
		$scope.submitEditSong();
	});

	$rootScope.$on("songChanged", function(e, insertedData) {
		if (!$scope.playlistData.contents) {
			return;
		}
		for (var j = 0; j < insertedData.length; j ++) {
			for (var i = 0; i < $scope.playlistData.contents.length; i ++) {
				if ($scope.playlistData.contents[i]["_id"] == insertedData[j]["_id"]) {
					//save the origOrder
					var origOrder = $scope.playlistData.contents[i]["origOrder"];
					$scope.playlistData.contents[i] = insertedData[j];
					$scope.playlistData.contents[i]["origOrder"] = origOrder;
				}
			}
			//update now playing
			if (playDatashare.nowPlaying["_id"] == insertedData[j]["_id"]) {
				//iterate through keys of inserted and add to now playing
				for (const [key, value] of Object.entries(insertedData[j])) {
					if (!(key in playDatashare.nowPlaying) || value != playDatashare.nowPlaying[key]) {
						playDatashare.nowPlaying[key] = value;
					}
				}
			}
		}
		setQueue();
		console.log("SONG CHANGED CALLBACK:");
		console.log($scope.playlistData.contents);
		$http.post("/setLast", {"contents": $scope.playlistData.contents}).then(undefined, function(err) {
			alert("Failed to update last playlist");
		});
	})

	$scope.closeEditSongModal = function() {
		edittingToAdd = [];
		console.log("MY PLAYEM:");
		// console.log($scope.playem.getPlayers());
		songDatashare.stopPlayem();
		$("#nowPlayingEditMusicModal").hide();
		//re-enable URL
		$("#newSongUrlInput").prop("disabled", false);
		autoSelect = true;
	};

	$rootScope.$on("playlistChanged", function(e, updatedData) {
		//only for name changes; doesn't support updating the song info yet
		$scope.playlistData.name = updatedData.name;
		$scope.playlistData.renamed = updatedData.name;
		$http.post("/setLast", {"name": $scope.playlistData.name, "renamed": $scope.playlistData.renamed}).then(undefined, function(err) {
			alert("Failed to update last playlist");
		});
	});

	$scope.noAutoplay = false;
	$scope.pauseNext = function() {
		console.log("autoplay switch");
		// if ($scope.noAutoplay) {
		// 	console.log("disabling autoplay");
		// }
		playDatashare.playem.toggleAutoplay();
		// $scope.playem.toggleAutoplay();
	};

	//default load old playlist
	$http.post("/getLast").then(function(resp) {
		console.log("GETTING LAST");
		console.log(resp.data);
		if (resp.data != null) {
			// $scope.playlistData = resp.data.playlist;
			// $scope.
			if (resp.data.loop) {
				$scope.toggleRepeat();
			}
			if (resp.data.shuffle) {
				//set the shuffle mode only; the content is already shuffled
				$scope.shuffleOn = resp.data.shuffle;
			}
			// $(window).on("load", function() {
			$timeout(function() {
				// $timeout(function() {
				// 	loadAndStart(resp.data.playlist, $window.location.hash == "#!#play")
				// }, 1000);
				console.log("loading and starting");
				loadAndStart(resp.data.playlist, $window.location.hash == "#!#play", 500);
			});
		}
	}, function(err) {
		console.log(err);
		alert("Failed to load last playlist");
	});
}]);