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

	function clearSearch() {
		$scope.playlistNameSearch = "";
		$scope.playlistSongSearch = "";
		$scope.playlistArtistSearch = "";
		$('#playlistStartDate, #playlistEndDate').datepicker("clearDates");
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

	$scope.getSongData = function(songDict) {	//SKIP: change this to query the db for playlist id and return the order stored on db
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
			// console.log("original order: ", $scope.playlistData[$scope.playlistIndices]);
			$scope.playlistData[$scope.playlistIndices]["contents"] = songOrder;
			// console.log("new order: ", $scope.playlistData[$scope.playlistIndices]);
			//update DB of new order
			$http.post("/editPlaylist", {"_id": $scope.playlistData[$scope.playlistIndices]["_id"], "contents": songOrder}).then(function(resp) {
				console.log("successful update of song order");
			}, function(error) {
				console.log(error);
			});
		}
	});

	$("#songSelect").on('ui-sortable-selectionschanged', function (e, args) {
		//DONE: update the indices in the playlist store
		$scope.songIndices = $(this).find('.ui-sortable-selected').map(function(i, element){
		  return $(this).index();
		}).toArray();
		$scope.$apply();
		// console.log($scope.songIndices);
	});

	$(function() {
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
					//perform merge
					console.log("merging playlists");
					var targetPlaylist = $scope.playlistData[$(".playlistItem:not(.ui-sortable-placeholder)").index(this)];
					var curContents = targetPlaylist["contents"];
					$.each(ui["draggable"]["sortableMultiSelect"]["selectedModels"], function(i, e) {
						curContents = curContents.concat(e["contents"]);
					});
					targetPlaylist["contents"] = curContents;
					//write to DB
					$http.post("/editPlaylist", {"_id": targetPlaylist["_id"], "contents": curContents}).then(function(resp) {
						console.log("playlist merge successful");
					}, function(err) {
						console.log(err);
					});
				}
				else if (ui["draggable"][0].className.split(/\s+/).includes("songItem")) {	//add songs to target
					console.log("adding songs");
					console.log(ui["draggable"]["sortableMultiSelect"]["selectedModels"]);
					console.log($scope.playlistData[$(".playlistItem:not(.ui-sortable-placeholder)").index(this)]);
					//perform merge
					var targetPlaylist = $scope.playlistData[$(".playlistItem:not(.ui-sortable-placeholder)").index(this)];
					// var songsToAdd = [];
					$.each(ui["draggable"]["sortableMultiSelect"]["selectedModels"], function(i, e) {
						targetPlaylist["contents"].push(e["_id"]);
					});
					$scope.$apply();
					//write to DB
					$http.post("/editPlaylist", {"_id": targetPlaylist["_id"], "contents": targetPlaylist["contents"]}).then(function(resp) {
						console.log("song merge successful");
					}, function(err) {
						console.log(err);
					});
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
		//clear the search
		clearSearch();
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
		songDatashare.loadEditTemplate("#addNewSong", $scope);
		$("#addMusicListModal").css("display", "flex");
	}

	$scope.submitSongs = function() {
		console.log(songDatashare);
		//TODO: add songs and update db
	}

	$scope.closeAddSongsModal = function() {
		$("#addMusicListModal").hide();
	}

	$scope.editSong = function() {
		//load the edit song file
		songDatashare.loadEditTemplate("#playlistEditTemplate", $scope);
		//share the data
		songDatashare.setEditData($scope.songData[$scope.songIndices]);
		//display modal
		$("#editMusicModal").css("display", "flex");
	}

	$scope.submitEditSong = function() {
		//write update to DB
		//first check if safe to add
		if (songDatashare.checkSongFields()) {
			//true means not ok
			return;
		}
		//data is now coerced and ready to push
		//update local
		$scope.songData[$scope.songIndices] = angular.copy(songDatashare.editData);
		$http.post("/editMusic", songDatashare.editData).then(function(resp) {
			console.log("edit song ok");
		}, function(err) {
			console.log(err);
		});
		$scope.closeEditSongModal();
	}

	$scope.closeEditSongModal = function() {
		songDatashare.stopPlayem();
		$("#editMusicModal").hide();
	}

	//delete a song
	$scope.deleteSong = function() {
		//selected indices are to be removed; remove them
		$scope.songIndices.sort((a, b) => a-b);
		for (var i = $scope.songIndices.length - 1; i >= 0; i--) {
			$scope.songData.splice($scope.songIndices[i], 1);
		}
		$scope.songIndices = [];	//clear selection
		var idList = [];
		for (var i = 0; i < $scope.songData.length; i++) {
			idList.push($scope.songData[i]["_id"]);
		}
		$scope.playlistData[$scope.playlistIndices]["contents"] = idList;
		//update DB
		$http.post("/editPlaylist", {"_id": $scope.playlistData[$scope.playlistIndices]["_id"], "contents": idList}).then(function(resp) {
			console.log("removal of songs from playlist ok");
		}, function(err) {
			console.log(err);
		});
	}

	function closeAllModals() {
		$scope.closePlaylistModal();
		$scope.closeEditSongModal();
		$scope.closeAddSongsModal();
	}
}]);
