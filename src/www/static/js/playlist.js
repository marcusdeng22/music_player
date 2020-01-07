app.controller('playlistCtrl', ['$scope', '$http', '$location', '$timeout', 'dispatcher', 'uiSortableMultiSelectionMethods', 'sortingFuncs', 'songDatashare',
		function($scope, $http, $location, $timeout, dispatcher, uiSortableMultiSelectionMethods, sortingFuncs, songDatashare) {
	$scope.playlistData = [];
	$scope.playlistIndices = [];
	$scope.songData = [];
	$scope.songIndices = [];
	$scope.songDatashare = songDatashare;

	//select info
	// $scope.playlistSelect = [];
	// $scope.songSelect = [];
	$scope.searchMusicSelect = [];

	//order vars
	$scope.orderVar = "date";
	$scope.reverse = true;

	//search vars
	$scope.playlistStartDate = "";

	$scope.getPlaylistData = function(query={}, sortVar="date", sortRev=true, selectFirst=false) {
		$http.post("/findPlaylist", query).then(function(resp) {
			console.log("success");
			$scope.playlistData = resp.data;
			console.log($scope.playlistData);
			$scope.sortBy(sortVar, sortRev);
			if (selectFirst) {
				angular.element(document).ready(function() {
					$(".playlistItem").first().click();
				});
			}
		}, function(error) {
			console.log("failed to get playlist data");
			console.log(error);
		});
		// $scope.playlistData = [
		// 	{"name": "playlist1", "contents": ["1","3"], "date": "2019-03-01T15:00:00", "dateStr": "2019-03-01"},
		// 	{"name": "playlist2", "contents": ["0","1","2"], "date": "2019-04-01T15:00:00", "dateStr": "2019-04-01"},
		// 	{"name": "playlist3", "contents": ["1","2","3"], "date": "2019-05-01T15:00:00", "dateStr": "2019-05-01"}
		// ]
		// data = [
		// 	{"name": "playlist1", "contents": ["1","3"], "date": "2019-03-01T15:00:00", "dateStr": "2019-03-01"},
		// 	{"name": "playlist2", "contents": ["0","1","2"], "date": "2019-04-01T15:00:00", "dateStr": "2019-04-01"},
		// 	{"name": "playlist3", "contents": ["1","2","3"], "date": "2019-05-01T15:00:00", "dateStr": "2019-05-01"}
		// ];
		// $scope.playlistData = orderBy(data, "date", true);
	};

	$scope.getPlaylistData();

	$scope.playlistNameSearch = "";
	$scope.advSearch = function() {
		// create query
		// available keys: "name", "start_date", "end_date", "song_names", "artist_names" "_id"
		var query = {};
		query["name"] = $scope.playlistNameSearch;
		if (!($scope.playlistStartDate == undefined || $scope.playlistStartDate == "")) {
			query["start_date"] = $scope.playlistStartDate;
		}
		if (!($scope.playlistEndDate == undefined || $scope.playlistEndDate == "")) {
			query["end_date"] = $scope.playlistEndDate;
		}
		var sortByRelev = false;
		if (!($scope.playlistSongSearch == undefined || $scope.playlistSongSearch == "")) {
			query["song_names"] = $scope.playlistSongSearch.split(";").map(i => i.trim()).filter(function(i) {return i != "";});
			sortByRelev = true;
		}
		if (!($scope.playlistArtistSearch == undefined || $scope.playlistArtistSearch == "")) {
			query["artist_names"] = $scope.playlistArtistSearch.split(";").map(i => i.trim()).filter(function(i) {return i != "";});
			sortByRelev = true;
		}
		console.log("query:", query)
		if (sortByRelev) {
			$scope.getPlaylistData(query, "relev");
		}
		else {
			$scope.getPlaylistData(query);
		}
	}

	$("#playlistSongSearch,#playlistArtistSearch").keypress(function(evt) {
		if (evt.which == 13) {	//enter key
			$("#advSearchBtn").click();
		}
	});

	$scope.sortBy = function(propertyName, preserveOrder=false) {
		var res = sortingFuncs.sortBy($scope.playlistData, $scope.reverse, $scope.orderVar, propertyName, preserveOrder);
		$scope.reverse = res["reverse"];
		$scope.orderVar = res["orderVar"];
		$scope.playlistData = res["data"];
	}

	$scope.sortGlyph = function(type) {
		return sortingFuncs.sortGlyph($scope.reverse, $scope.orderVar, type);
	}

	$scope.getSongData = function(songDict) {	//TODO: change this to query the db for playlist id and return the order stored on db
		query = {"content": songDict};
		// console.log("playlist query songDict:", $scope.playlistData[$scope.playlistIndices]);
		// console.log("playlist query: ", query);
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
			//TODO: update DB of new order
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
				console.log("over");
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

		//update song url preview on enter key
		$(document).keyup(function(e) {
			if ($("#newSongUrlInput").is(":focus") && e.key == "Enter") {
				$scope.previewSong();
			}
		});

		//prepare datepicker
		$('#playlistStartDate, #playlistEndDate').datepicker({
			todayBtn: "linked",
			clearBtn: true,
			autoclose: true,
			todayHighlight: true
		});
		$('#playlistStartDate, #playlistEndDate').datepicker("clearDates");
		// $('#playlistStartDate, #playlistEndDate').datepicker("setDate", new Date());
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
		$("#addPlaylistModal").css("display", "flex");
		$("#newPlaylistName").focus();
	};

	$("#newPlaylistName").keypress(function(evt) {
		if (evt.which == 13 && $scope.newPlaylistName.length > 0) {	//enter key
			$("#submitNewPlaylist").click();
		}
	});

	$scope.addNewPlaylist = function() {
		//TODO: clear the search
		if ($scope.editing) {	//editing a playlist name
			console.log('editing');
			console.log($scope.playlistData[$scope.playlistIndices])
			$http.post("/editPlaylist", {"_id": $scope.playlistData[$scope.playlistIndices]["_id"], "name": $scope.newPlaylistName}).then(function(resp) {
				$scope.getPlaylistData(undefined, undefined, undefined, selectFirst=true);
			}, function(error) {
				console.log("failed to update playlist data");
				console.log(error);
			});
		}
		else {
			console.log("adding");
			$http.post("/addPlaylist", {"name": $scope.newPlaylistName, "contents": []}).then(function(resp) {
				console.log("added playlist data, getting new");
				$scope.getPlaylistData(undefined, undefined, undefined, selectFirst=true);
			}, function(error) {
				console.log("failed to add playlist");
			});
		}
		$scope.closePlaylistModal();
	}

	$scope.closePlaylistModal = function() {
		$scope.editing = false;
		$scope.newPlaylistName = "";
		$("#addPlaylistModal").hide();
	}

	//delete playlist
	$scope.deletePlaylist = function() {
		var toRemove = [];
		if ($scope.playlistIndices.length > 0) {
			for (const i in $scope.playlistIndices) {
				toRemove.push($scope.playlistData[i]["_id"]);
			}
		}
		console.log("removing playlists");
		console.log(toRemove);
		$http.post("/removePlaylists", {"playlists": toRemove}).then(function(resp) {
			$scope.getPlaylistData();
		}, function(err) {
			console.log("error removing playlists");
		})
	}

	//SONG BUTTONS##################################################################################################################################
	//add a song
	$scope.addSongs = function() {
		console.log("adding song");
		$("#addMusicListModal").css("display", "flex");
	}

	$scope.submitSongs = function() {
		console.log(songDatashare);
	}

	$scope.closeAddSongsModal = function() {
		$("#addMusicListModal").hide();
	}

	//edit a song
	$scope.newSongData = {};
	$scope.editSong = function() {
		console.log("editing song");
		console.log($scope.songData[$scope.songIndices]);
		$scope.newSongData = angular.copy($scope.songData[$scope.songIndices]);
		$("#editMusicModal").css("display", "flex");
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
		$("#previewDisplay").empty();	//stops loading if closing modal early
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
		// $("#songSelect").children().removeClass("ui-sortable-selected")
		$scope.songIndices = [];
	}

	function closeAllModals() {
		$scope.closePlaylistModal();
		$scope.closeEditSongModal();
		$scope.closeAddSongsModal();
	}
}]);
