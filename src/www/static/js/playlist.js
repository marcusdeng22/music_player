app.controller('playlistCtrl', ['$scope', '$http', '$location', '$timeout', 'dispatcher', 'uiSortableMultiSelectionMethods', function($scope, $http, $location, $timeout, dispatcher, uiSortableMultiSelectionMethods) {
	$scope.playlistData = [];
	$scope.playlistIndices = [];
	$scope.songData = [];
	$scope.songIndices = [];

	//select info
	// $scope.playlistSelect = [];
	// $scope.songSelect = [];
	$scope.searchMusicSelect = [];

	$scope.getPlaylistData = function() {
		// $http.post("/findPlaylist", {}).then(function(resp) {
		// 	console.log("success");
		// 	$scope.playlistData = resp.data;
		// 	console.log($scope.playlistData);
		// }, function(error) {
		// 	console.log(error);
		// });
		$scope.playlistData = [
			{"name": "playlist1", "contents": ["1","3"]},
			{"name": "playlist2", "contents": ["0","1","2"]},
			{"name": "playlist3", "contents": ["1","2","3"]}
		]
	};

	$scope.getPlaylistData();

	$scope.getSongData = function(songDict) {
		query = {"content": songDict};
		console.log("playlist query songDict:", $scope.playlistData[$scope.playlistIndices]);
		console.log("playlist query: ", query);
		$http.post("/findMusicList", {"content": songDict}).then(function(resp) {
			// console.log("success");
			$scope.songData = resp.data;
			console.log("playlist query songs returned: ", $scope.songData);
		}, function(error) {
			console.log(error);
		});
	};

	$scope.sortablePlaylist = uiSortableMultiSelectionMethods.extendOptions({
		refreshPositions: true
	});

	$("#playlistSelect").on('ui-sortable-selectionschanged', function (e, args) {
		$scope.playlistIndices = $(this).find('.ui-sortable-selected').map(function(i, element){
		  return $(this).index();
		}).toArray();
		$scope.songIndices = [];
		if ($scope.playlistIndices.length > 1) {
			$scope.songData = [];
			$scope.$apply();    //forces update
		}
		else {
			$scope.getSongData($scope.playlistData[$scope.playlistIndices[0]]["contents"]);
		}
	});

	$scope.sortableSongs = uiSortableMultiSelectionMethods.extendOptions({
		refreshPositions: true,
		stop: function(e, ui) {
			console.log("stop: songData = ", $scope.songData);
			var songOrder = $scope.songData.map(function(i) {
				return i["_id"];
			});
			console.log("song order: ", songOrder);
			console.log("original order: ", $scope.playlistData[$scope.playlistIndices]);
			$scope.playlistData[$scope.playlistIndices]["contents"] = songOrder;
			console.log("new order: ", $scope.playlistData[$scope.playlistIndices]);
		}
	});

	$("#songSelect").on('ui-sortable-selectionschanged', function (e, args) {
		//TODO: update the indices in the playlist store
		$scope.songIndices = $(this).find('.ui-sortable-selected').map(function(i, element){
		  return $(this).index();
		}).toArray();
		$scope.$apply();
		console.log($scope.songIndices);
	});

	$(function() {	//maybe wrap this in a function and call on update? TODO test
		// $(".playlistItem").not(".ui-sortable-placeholder").droppable({
		$(".playlistItem").droppable({
			drop: function(event, ui) {	//this occurs before the sortable.beforeStop
				$(this).removeClass("over");
				//$(this) refers to the target
				//ui.draggable refers to the source
				if (ui["draggable"][0].className.split(/\s+/).includes("playlistItem")) {	//merge two playlists together into target
					console.log("merging playlists");
					console.log(ui["draggable"]["sortableMultiSelect"]["selectedModels"]);
					console.log($(".playlistItem:not(.ui-sortable-placeholder)").index(this));
					console.log($scope.playlistData[$(".playlistItem:not(.ui-sortable-placeholder)").index(this)]);
					//TODO: perform merge and push to DB
				}
				else if (ui["draggable"][0].className.split(/\s+/).includes("songItem")) {	//add songs to target
					console.log("adding songs");
					console.log(ui["draggable"]["sortableMultiSelect"]["selectedModels"]);
					console.log($scope.playlistData[$(".playlistItem:not(.ui-sortable-placeholder)").index(this)]);
					//TODO: perform merge and push to DB
				}
			},
			over: function(event, ui) {
				$(this).addClass("over");
			},
			out: function(event, ui) {
				$(this).removeClass("over");
			}
		});

		//prepare escaping functions
		$("body").on("click", function(evt) {
			// if (evt.target == $("#addPlaylistModal")[0]) {
			// if ([$("#addPlaylistModal")[0], $("#addMusicListModal")[0], $("#editMusicModal")[0]].includes(evt.target)) {
			if ($(".modal").toArray().includes(evt.target)) {
				closeAllModals();
			}
		})
		.keyup(function(evt) {
			if (evt.keyCode == 27) {	//escape key
				closeAllModals();
			}
		});
	});

	//PLAYLIST BUTTONS##############################################################################################################################
	//play the playlist
	$scope.triggerPlay = function() {
		//switch tabs to "Play" and pass the playlist data
		var passedList = {
			"name": "Unnamed playlist",
			//date now
			"contents": []
		};
		if ($scope.playlistIndices.length == 1) {
			passedList = $scope.playlistData[$scope.playlistIndices];
		}
		else {
			for (var curList in $scope.playlistIndices) {
					passedList["contents"].push($scope.playlistData[curList]["contents"]);
			}
		}
		dispatcher.emit("startPlay", passedList);
		$location.hash("play");
	}

	//add new or edit playlist
	$scope.newPlaylistName = "";
	$scope.editing = false;

	$scope.newPlaylist = function(type="") {
		if (type == "edit") {
			$scope.editing = true;
			$("#playlistMode").html("Editing: " + $scope.playlistData[$scope.playlistIndices]["name"]);
			$scope.newPlaylistName = $scope.playlistData[$scope.playlistIndices]["name"];
		}
		else {
			$("#playlistMode").html("New Playlist");
		}
		$("#addPlaylistModal").show();
		$("#newPlaylistName").focus();
	};

	$("#newPlaylistName").keypress(function(evt) {
		if (evt.which == 13 && $scope.newPlaylistName.length > 0) {	//enter key
			$("#submitNewPlaylist").click();
		}
	});

	$scope.addNewPlaylist = function() {
		if ($scope.editing) {
			$scope.playlistData[$scope.playlistIndices]["name"] = $scope.newPlaylistName;
		}
		else {
			$scope.playlistData.unshift({"name": $scope.newPlaylistName, "contents": []});
			angular.element(document).ready(function() {
				$(".playlistItem").first().click();
			});
		}
		//TODO: perform update to DB
		$scope.closePlaylistModal();
	}

	$scope.closePlaylistModal = function() {
		$scope.editing = false;
		$scope.newPlaylistName = "";
		$("#addPlaylistModal").hide();
	}

	//delete playlist
	$scope.deletePlaylist = function() {
		$scope.playlistIndices.sort(function(a, b) {return b - a;});
		for (var i = $scope.playlistIndices.length - 1; i >= 0; i--) {
			$scope.playlistData.splice($scope.playlistIndices[i], 1);
			//TODO: perform update to DB
		}
	}

	//SONG BUTTONS##################################################################################################################################
	//add a song
	$scope.addSongs = function() {

	}

	//edit a song
	$scope.newSongData = {};
	$scope.editSong = function() {
		console.log("editing song");
		console.log($scope.songData[$scope.songIndices]);
		$scope.newSongData = angular.copy($scope.songData[$scope.songIndices]);
		$("#editMusicModal").show();
		$scope.previewSong();
	}

	$scope.checkSongFields = function() {
		for (var key in $scope.newSongData) {
			//TODO: check fields here
			if ($scope.newSongData[key] === "") {
				return true;
			}
		}
		return false;
	}

	// function logEvent (evtName) {
	// 	this.on(evtName, (data) =>
	// 	console.log("event:", evtName, data)
	// 	);
	// }
	var config = {
		playerContainer: document.getElementById("previewDisplay")
	};
	var playem = new Playem();
	playem.addPlayer(YoutubePlayer, config);
	// init logging for all player events
	// ["onPlay", "onReady", "onTrackChange", "onEnd", "onPause", "onError", "onBuffering"].forEach(logEvent.bind(playem));

	$scope.previewPlayer;
	$scope.previewSong = function() {
		console.log("previewing song");
		//.loadVideoByUrl	loads a video by the url, but need to figure out how to create the player object
		//.setVolume		sets the volume
		//.playVideo
		//.pauseVideo
		//.getPlayerState	0=ended, 1=playing, 2=paused
		//.getDuration
		//.addEventListener	onReady, onStateChange
		//.getIframe()

		//create the video player on the start of opening the modal; then load the original video ID: TODO: splice out the video ID
		//here, load the new ID once refreshed
		//check the buffer status: may cause the play to fail
		// function onYouTubePlayerAPIReady() {
		// 	$scope.previewPlayer = new YT.Player('previewDisplay', {
		// 		// videoId: $scope.songData[$scope.songIndices]["url"]
		// 		events:
		// 	})
		// }
		playem.stop();
		playem.clearQueue();
		console.log(playem.getQueue());
		// console.log("adding url: ", $scope.songData[$scope.songIndices]["url"]);
		// console.log($scope.songData);
		// console.log($scope.songIndices);
		// playem.addTrackByUrl($scope.songData[$scope.songIndices]["url"]);
		// playem.addTrackByUrl($("#newSongUrlInput").val());
		// console.log("adding: ", $("#newSongUrlInput").val());
		console.log("adding: ", $scope.newSongData["url"]);
		playem.addTrackByUrl($scope.newSongData["url"]);
		// playem.addTrackByUrl("https://www.youtube.com/watch?v=8axQACbVkrk");
		console.log(playem.getPlayers());
		console.log(playem.getQueue());
		playem.play();
	}

	$scope.submitEditSong = function() {
		//TODO: write update to DB
		$scope.songData[$scope.songIndices] = $scope.newSongData;
		$scope.closeEditSongModal();
	}

	$scope.closeEditSongModal = function() {
		// console.log($scope.songData[$scope.songIndices]);
		// $scope.previewPlayer.destroy();
		playem.stop();
		playem.clearQueue();
		$("#editMusicModal").hide();
	}

	//delete a song
	$scope.deleteSong = function() {
		$scope.songIndices.sort(function(a, b) {return b - a;});
		for (var i = $scope.songIndices.length - 1; i >= 0; i--) {
			$scope.songData.splice($scope.songIndices[i], 1);
			$scope.playlistData[$scope.playlistIndices]["contents"].splice($scope.songIndices[i], 1);
			//TODO: perform update to DB
		}
	}

	function closeAllModals() {
		$scope.closePlaylistModal();
		$scope.closeEditSongModal();
	}
}]);
