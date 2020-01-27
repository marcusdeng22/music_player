app.controller('playlistCtrl', ['$scope', '$http', '$location', '$window', '$timeout', 'dispatcher', 'uiSortableMultiSelectionMethods', 'sortingFuncs', 'songDatashare', 'youtubeFuncs',
		function($scope, $http, $location, $window, $timeout, dispatcher, uiSortableMultiSelectionMethods, sortingFuncs, songDatashare, youtubeFuncs) {
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
	$scope.playlistNameSearch = "";
	$scope.playlistStartDate = "";
	$scope.playlistEndDate = "";
	$scope.playlistSongSearch = "";
	$scope.playlistArtistSearch = "";
	$scope.playlistAlbumSearch = "";
	$scope.playlistGenreSearch = "";

	$scope.getPlaylistData = function(query={}, sortVar="date", sortRev=true, callback=null) {
		$http.post("/findPlaylist", query).then(function(resp) {
			console.log("success");
			$scope.playlistData = resp.data;
			console.log($scope.playlistData);
			$scope.sortBy(sortVar, sortRev);
			if (callback != null) {
				callback();
			}
		}, function(err) {
			console.log("failed to get playlist data");
			console.log(err);
			if (err.status == 403) {
				alert("Session timed out");
				$window.location.href = "/";
			}
			else {
				alert("Failed to get playlist data");
			}
		});
	};

	$scope.getPlaylistData();

	$scope.advSearch = function(callback=null) {
		// create query
		// available keys: "name", "start_date", "end_date", "song_names", "artist_names" "_id"
		var query = {};
		if (!($scope.playlistNameSearch == "")) {
			query["playlist_names"] = $scope.playlistNameSearch.split(",").map(i => i.trim()).filter(function(i) {return i != "";});
		}
		if (!($scope.playlistStartDate == undefined || $scope.playlistStartDate == "")) {
			query["start_date"] = $scope.playlistStartDate;
		}
		if (!($scope.playlistEndDate == undefined || $scope.playlistEndDate == "")) {
			query["end_date"] = $scope.playlistEndDate;
		}
		var sortByRelev = false;
		if (!($scope.playlistSongSearch == undefined || $scope.playlistSongSearch == "")) {
			query["song_names"] = $scope.playlistSongSearch.split(",").map(i => i.trim()).filter(function(i) {return i != "";});
			sortByRelev = true;
		}
		if (!($scope.playlistArtistSearch == undefined || $scope.playlistArtistSearch == "")) {
			query["artist_names"] = $scope.playlistArtistSearch.split(",").map(i => i.trim()).filter(function(i) {return i != "";});
			sortByRelev = true;
		}
		if (!($scope.playlistAlbumSearch == undefined || $scope.playlistAlbumSearch == "")) {
			query["album_names"] = $scope.playlistAlbumSearch.split(",").map(i => i.trim()).filter(function(i) {return i != "";});
			sortByRelev = true;
		}
		if (!($scope.playlistGenreSearch == undefined || $scope.playlistGenreSearch == "")) {
			query["genre_names"] = $scope.playlistGenreSearch.split(",").map(i => i.trim()).filter(function(i) {return i != "";});
			sortByRelev = true;
		}
		console.log("query:", query)
		if (sortByRelev) {
			$scope.getPlaylistData(query, "relev", undefined, callback);
		}
		else {
			$scope.getPlaylistData(query, undefined, undefined, callback);
		}
	}

	function clearSearch() {
		$scope.playlistNameSearch = "";
		$scope.playlistSongSearch = "";
		$scope.playlistArtistSearch = "";
		$scope.playlistAlbumSearch = "";
		$scope.playlistGenreSearch = "";
		$('#playlistStartDate, #playlistEndDate').datepicker("clearDates");
	}

	// $("#playlistSongSearch,#playlistArtistSearch").keypress(function(evt) {
	$(".playlist-search").keypress(function(evt) {
		if (evt.which == 13) {	//enter key
			$("#advSearchBtn").click();
		}
	});

	$scope.sortBy = function(propertyName, preserveOrder=false) {
		// $scope.playlistIndices = [];
		clearPlaylistSelected();
		var res = sortingFuncs.sortBy($scope.playlistData, $scope.reverse, $scope.orderVar, propertyName, preserveOrder);
		$scope.reverse = res["reverse"];
		$scope.orderVar = res["orderVar"];
		$scope.playlistData = res["data"];
	}

	$scope.sortGlyph = function(type) {
		return sortingFuncs.sortGlyph($scope.reverse, $scope.orderVar, type);
	}

	$scope.getSongData = function(songDict, selectedSongs=null) {	//SKIP: change this to query the db for playlist id and return the order stored on db
		query = {"content": songDict};
		// console.log("playlist query songDict:", $scope.playlistData[$scope.playlistIndices]);
		// console.log("playlist query: ", query);
		$http.post("/findMusicList", {"content": songDict}).then(function(resp) {
			// console.log("success");
			$scope.songData = resp.data;
			console.log("playlist query songs returned: ", $scope.songData);
			if (selectedSongs != null) {
				$timeout(function() {
					for (var i = 0; i < selectedSongs.length; i ++) {
						$("#songSelect > .songItem").eq(selectedSongs[i]).addClass("ui-sortable-selected");
					}
				});
			}
		}, function(err) {
			console.log(err);
			if (err.status == 403) {
				alert("Session timed out");
				$window.location.href = "/";
			}
			else {
				alert("Failed to get song data");
			}
		});
	};

	function clearPlaylistSelected() {
		$scope.songData = [];
		clearSongSelected();
		$("#playlistSelect > .ui-sortable-selected").removeClass("ui-sortable-selected");
		$scope.playlistIndices = [];
		if (!$scope.$$phase) {
			$scope.$apply();
		}
	}

	function clearSongSelected() {
		$("#songSelect > .ui-sortable-selected").removeClass("ui-sortable-selected");
		$scope.songIndices = [];
		if (!$scope.$$phase) {
			$scope.$apply();
		}
	}

	$scope.sortablePlaylist = uiSortableMultiSelectionMethods.extendOptions({
		refreshPositions: true
	});

	$("#playlistSelect").on('ui-sortable-selectionschanged', function (e, selectedSongs=null) {
		// console.log("playlist select changed");
		// console.log($(this).find('.ui-sortable-selected').map(function(i, element){
		// 	return $(this).index();
		// }).toArray());
		$scope.playlistIndices = $(this).find('.ui-sortable-selected').map(function(i, element){
			return $(this).index();
		}).toArray();
		// $scope.songIndices = [];
		$scope.songFilter = "";
		clearSongSelected();
		if ($scope.playlistIndices.length > 1) {
			$scope.songData = [];
			$scope.$apply();    //forces update
		}
		else if ($scope.playlistIndices.length == 1) {
			console.log("ARGS");
			console.log(selectedSongs);
			$scope.getSongData($scope.playlistData[$scope.playlistIndices[0]]["contents"], selectedSongs);
		}
	});

	function sameArrays(arr1, arr2) {
		if (arr1.length != arr2.length) {
			return false;
		}
		for (var i = 0; i < arr1.length; i ++) {
			if (arr1[i] != arr2[i]) {
				return false;
			}
		}
		return true;
	}

	var updatingPlaylist = false;
	$scope.sortableSongs = uiSortableMultiSelectionMethods.extendOptions({
		refreshPositions: true,
		update: function(e, ui) {
			if (updatingPlaylist) {
				ui.item.sortable.cancel();
			}
		},
		stop: function(e, ui) {
			console.log("stop: songData = ", $scope.songData);
			var songOrder = $scope.songData.map(function(i) {
				return i["_id"];
			});
			console.log("song order: ", songOrder);
			console.log("original order: ", $scope.playlistData[$scope.playlistIndices]["contents"]);
			// $scope.playlistData[$scope.playlistIndices]["contents"] = songOrder;
			// console.log("new order: ", $scope.playlistData[$scope.playlistIndices]);
			//update DB of new order
			if (!sameArrays(songOrder, $scope.playlistData[$scope.playlistIndices]["contents"])) {
				$http.post("/editPlaylist", {"_id": $scope.playlistData[$scope.playlistIndices]["_id"], "contents": songOrder}).then(function(resp) {
					console.log("successful update of song order");
					$scope.playlistData[$scope.playlistIndices] = resp["data"];
					updatePlaylistSortable(null, true);
				}, function(err) {
					console.log(err);
					if (err.status == 403) {
						alert("Session timed out");
						$window.location.href = "/";
					}
					else {
						alert("Failed to update playlist data");
					}
				});
			}
		}
	});

	$("#songSelect").on('ui-sortable-selectionschanged', function (e, args) {
		//DONE: update the indices in the playlist store
		$scope.songIndices = $(this).find('.ui-sortable-selected').map(function(i, element){
		  return $(this).index();
		}).toArray();
		console.log("before apply: indices");
		console.log($scope.songIndices);
		$scope.$apply();
		console.log("after apply: indices");
		console.log($scope.songIndices);
		// console.log($scope.songIndices);
	});

	//sorts the playlist data and selects the updated playlist
	function updatePlaylistSortable(modifiedID=null, selectSongs=false) {
		console.log("updating positions and selecting");
		var oldSongIndices = $scope.songIndices;
		var oldID = $scope.playlistIndices.length == 1 ? $scope.playlistData[$scope.playlistIndices]["_id"] : null;
		var oldIndex = $scope.playlistIndices;
		$scope.sortBy($scope.orderVar, true);
		if (modifiedID != null) {
			$scope.playlistIndices = [$scope.playlistData.findIndex(function(p) { return p["_id"] == modifiedID; })];
		}
		else {
			if (oldID == null) {
				console.log("multi or none selected");
				console.log($scope.playlistIndices);
				clearPlaylistSelected();
				return;
			}
			$scope.playlistIndices = [$scope.playlistData.findIndex(function(p) { return p["_id"] == oldID; })];
		}
		angular.element(document).ready(function() {
			// // $scope.songIndices = [];
			// clearSongSelected();
			// // $scope.$apply();
			// console.log("clicking: " + $scope.playlistIndices);
			// $(".playlistItem").eq($scope.playlistIndices).click();

			console.log("clicking new playlist");
			$(".playlistItem").eq($scope.playlistIndices).addClass("ui-sortable-selected");
			if (selectSongs) {
				$("#playlistSelect").trigger('ui-sortable-selectionschanged', [oldSongIndices]);
			}
			else {
				$("#playlistSelect").trigger('ui-sortable-selectionschanged');
			}
			// $(".playlistItem").eq($scope.playlistIndices).click();
			// // $(".playlistItem").eq($scope.playlistIndices).addClass("ui-sortable-selected");
			// // $("#playlistSelect").trigger('ui-sortable-selectionschanged');
			// console.log(selectSongs);
			// console.log(oldSongIndices);
			// if (selectSongs) {
			// 	// clearSongSelected();
			// 	// $timeout(function() {
			// 		console.log($("#songSelect").children());
			// 		for (var i = 0; i < oldSongIndices.length; i ++) {
			// 			// $("#songSelect > .songItem").eq(oldSongIndices[i]).addClass("ui-sortable-selected");
			// 			$("#songSelect").children().eq(oldSongIndices[i]).addClass("ui-sortable-selected");
			// 		}
			// 		// $("#songSelect").trigger("ui-sortable-selectionschanged");
			// 	// });
			// }
		});
	}

	dispatcher.on("songChanged", function(data) {
		//update the currently selected songs
		for (var i = 0; i < $scope.songData.length; i ++) {
			for (var j = 0; j < data.length; j ++) {
				if ($scope.songData[i]["_id"] == data[j]["_id"]) {
					$scope.songData[i] = data[j];
				}
			}
		}
		
	});

	dispatcher.on("songsRemoved", function() {
		//get the new playlist info
		// $scope.clearSearch();
		// $scope.getPlaylistData();
		var targetID = $scope.playlistIndices.length == 1 ? $scope.playlistData[$scope.playlistIndices]["_id"] : null;
		$scope.advSearch(function() {
			updatePlaylistSortable(targetID);
		});	//use the same filters
		//select the original, if one was selected
		// updatePlaylistSortable();
	});

	function initiatilizeDrop() {
		$(".playlistItem").droppable({
			drop: function(event, ui) {	//this occurs before the sortable.beforeStop
				$(this).removeClass("over");
				//$(this) refers to the target
				//ui.draggable refers to the source
				var targetIndex = $(".playlistItem:not(.ui-sortable-placeholder)").index(this);
				var targetID = $scope.playlistData[targetIndex]["_id"];
				var updatedContents = $scope.playlistData[targetIndex]["contents"];
				if (ui["draggable"][0].className.split(/\s+/).includes("playlistItem")) {	//merge two playlists together into target
					console.log("merging playlists");
					$.each(ui["draggable"]["sortableMultiSelect"]["selectedModels"], function(i, e) {
						console.log("source:");
						console.log(e);
						// curContents = curContents.concat(e["contents"]);
						// $scope.playlistData[targetIndex]["contents"] = $scope.playlistData[targetIndex]["contents"].concat(e["contents"]);
						updatedContents = updatedContents.concat(e["contents"]);
					});
					console.log("result:");
					console.log($scope.playlistData);
					$http.post("/editPlaylist", {"_id": targetID, "contents": updatedContents}).then(function(resp) {
						//find the new index
						var newIndex = $scope.playlistData.findIndex(function(p) { return p["_id"] == targetID; });
						console.log(newIndex);
						console.log($scope.playlistIndices);
						$scope.playlistData[newIndex] = resp["data"];
						updatePlaylistSortable(targetID);
					}, function(err) {
						console.log(err);
						if (err.status == 403) {
							alert("Session timed out");
							$window.location.href = "/";
						}
						else {
							alert("Failed to update playlist");
						}
					});
				}
				else if (ui["draggable"][0].className.split(/\s+/).includes("songItem")) {	//add songs to target
					updatingPlaylist = true;
					console.log("adding songs");
					//perform merge
					$.each(ui["draggable"]["sortableMultiSelect"]["selectedModels"], function(i, e) {
						updatedContents.push(e["_id"]);
					});
					//write to DB
					$http.post("/editPlaylist", {"_id": targetID, "contents": updatedContents}).then(function(resp) {
						//find the new index
						var newIndex = $scope.playlistData.findIndex(function(p) { return p["_id"] == targetID; });
						$scope.playlistData[newIndex] = resp["data"];
						updatePlaylistSortable(targetID);
						updatingPlaylist = false;
					}, function(err) {
						console.log(err);
						if (err.status == 403) {
							alert("Session timed out");
							$window.location.href = "/";
						}
						else {
							updatingPlaylist = false;
							alert("Failed to update playlist");
						}
					});
				}
			},
			over: function(event, ui) {
				$(this).addClass("over");
			},
			out: function(event, ui) {
				$(this).removeClass("over");
			}
		});
	}

	$(window).on("load", function() {
		// $(".playlistItem").not(".ui-sortable-placeholder").droppable({
		initiatilizeDrop();

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

	$scope.getThumbnail = youtubeFuncs.getThumbnail;

	//PLAYLIST BUTTONS##############################################################################################################################
	//play the playlist
	$scope.triggerPlay = function(index=0) {	//allow double click on song to start from an index
		//switch tabs to "Play" and pass the playlist data
		var passedList = {
			"name": "Unnamed playlist",
			//date now
			"contents": [],
			"touched": false
		};
		if ($scope.playlistIndices.length == 1) {
			passedList = angular.copy($scope.playlistData[$scope.playlistIndices]);
			passedList["touched"] = false;
		}
		else {
			$scope.playlistIndices.sort((a, b) => a-b);
			for (var i = 0; i < $scope.playlistIndices.length; i ++) {
				passedList["contents"] = passedList["contents"].concat($scope.playlistData[$scope.playlistIndices[i]]["contents"]);
			}
			passedList["touched"] = true;
		}
		//resolve the contents to the actual data
		$http.post("/findMusicList", {"content": passedList["contents"]}).then(function(resp) {
			passedList["contents"] = resp["data"];
			passedList["startIndex"] = index;
			dispatcher.emit("startPlay", passedList);
			$location.hash("play");
		}, function(err) {
			console.log(err);
			if (err.status == 403) {
				alert("Session timed out");
				$window.location.href = "/";
			}
			else {
				alert("Failed to load playlist data");
			}
		});
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
				$scope.playlistData[$scope.playlistIndices] = resp["data"];
				updatePlaylistSortable();
			}, function(err) {
				console.log("failed to update playlist data");
				console.log(err);
				if (err.status == 403) {
					alert("Session timed out");
					$window.location.href = "/";
				}
				else {
					alert("Failed to update playlist data");
				}
			});
		}
		else {
			console.log("adding");
			$http.post("/addPlaylist", {"name": $scope.newPlaylistName, "contents": []}).then(function(resp) {
				console.log("added playlist data, getting new");
				console.log(resp);
				// $scope.getPlaylistData(undefined, undefined, undefined, selectFirst=true);
				$scope.playlistData.push(resp["data"]);
				updatePlaylistSortable(resp["data"]["_id"]);
				$timeout(initiatilizeDrop);
			}, function(err) {
				console.log("failed to add playlist");
				if (err.status == 403) {
					alert("Session timed out");
					$window.location.href = "/";
				}
				else {
					alert("Failed to add playlist");
				}
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
			for (var i = 0; i < $scope.playlistIndices.length; i ++) {
				toRemove.push($scope.playlistData[$scope.playlistIndices[i]]["_id"]);
			}
		}
		console.log("removing playlists");
		console.log(toRemove);
		if (confirm("Delete selected playlist(s)?")) {
			$http.post("/removePlaylists", {"playlists": toRemove}).then(function(resp) {
				$scope.getPlaylistData();
			}, function(err) {
				console.log("error removing playlists");
				if (err.status == 403) {
					alert("Session timed out");
					$window.location.href = "/";
				}
				else {
					alert("Failed to remove playlist");
				}
			});
		}
	}

	//download playlist
	$scope.downloadPlaylist = function() {
		var downloadData = {
			"songs": [],
			//"name" if single playlist
		}
		if ($scope.playlistIndices.length == 1) {
			downloadData["songs"] = $scope.playlistData[$scope.playlistIndices]["contents"];
			downloadData["name"] = $scope.playlistData[$scope.playlistIndices]["name"];
		}
		else {
			$scope.playlistIndices.sort((a, b) => a-b);
			for (var i = 0; i < $scope.playlistIndices.length; i ++) {	//download removes duplicates
				downloadData["songs"] = downloadData["songs"].concat($scope.playlistData[$scope.playlistIndices[i]]["contents"]);
			}
		}
		//resolve the contents to the actual data
		$http.post("/findMusicList", {"content": downloadData["songs"]}).then(function(resp) {
			downloadData["songs"] = resp["data"];
			dispatcher.emit("loadDownload", downloadData);
		}, function(err) {
			console.log(err);
			if (err.status == 403) {
				alert("Session timed out");
				$window.location.href = "/";
			}
			else {
				alert("Failed to download playlist");
			}
		});
	}

	//SONG BUTTONS##################################################################################################################################
	function getSongIDList() {
		var idList = [];
		for (var i = 0; i < $scope.songData.length; i++) {
			idList.push($scope.songData[i]["_id"]);
		}
		return idList;
	}
	//add a song
	$scope.addSongs = function() {
		console.log("adding song");
		songDatashare.loadEditTemplate("#addNewSong", $scope);
		$("#addMusicListModal").css("display", "flex");
	}

	$scope.submitSongs = function() {
		console.log(songDatashare);
		//add selected songs
		if (songDatashare.tab == "#existingSongSearch") {
			for (const i of songDatashare.songIndices) {
				$scope.songData.push(songDatashare.songData[i]);
			}
			$http.post("/editPlaylist", {"_id": $scope.playlistData[$scope.playlistIndices]["_id"], "contents": getSongIDList()}).then(function(resp) {
				console.log("adding songs to playlist ok");
				$scope.playlistData[$scope.playlistIndices] = resp["data"];
				updatePlaylistSortable();
			}, function(err) {
				console.log(err);
				if (err.status == 403) {
					alert("Session timed out");
					$window.location.href = "/";
				}
				else {
					alert("Failed to add songs to playlist");
				}
			});
		}
		//add a new song
		else if (songDatashare.tab == "#addNewSong") {
			songDatashare.addSong(function(insertedData) {
				//now append to local song data and push to DB
				$scope.songData.push(insertedData);
				$http.post("/editPlaylist", {"_id": $scope.playlistData[$scope.playlistIndices]["_id"], "contents": getSongIDList()}).then(function(resp) {
					console.log("adding new song to playlist ok");
					$scope.playlistData[$scope.playlistIndices] = resp["data"];
					updatePlaylistSortable();
				}, function(err) {
					console.log(err);
					if (err.status == 403) {
						alert("Session timed out");
						$window.location.href = "/";
					}
					else {
						alert("Failed to add songs to playlist");
					}
				});
			});
		}
		$scope.closeAddSongsModal();
	}

	$scope.closeAddSongsModal = function() {
		songDatashare.clearSelected();
		$("#addMusicListModal").hide();
	}

	$scope.editSong = function() {
		//load the edit song file
		var toEdit = [];
		for (var i = 0; i < $scope.songIndices.length; i ++) {
			toEdit.push($scope.songData[$scope.songIndices[i]]);
		}
		if (toEdit.length == 1) {
			songDatashare.loadEditTemplate("#playlistEditTemplate", $scope, toEdit, undefined, function() {
				dispatcher.emit("preview");
			});
		}
		else {
			songDatashare.loadEditTemplate("#playlistEditTemplate", $scope, toEdit);
		}
		//share the data
		// songDatashare.setEditData($scope.songData[$scope.songIndices]);
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
		songDatashare.editSong(function(insertedData) {
			for (var i = 0; i < $scope.songData.length; i ++) {
				for (var j = 0; j < insertedData.length; j ++) {
					if ($scope.songData[i]["_id"] == insertedData[j]["_id"]) {
						$scope.songData[i] = insertedData[j];
					}
				}
			}
		});
		$scope.closeEditSongModal();
	}

	$scope.closeEditSongModal = function() {
		songDatashare.stopPlayem();
		$("#editMusicModal").hide();
	}

	//delete a song
	$scope.deleteSong = function() {
		if (confirm("Remove selected song(s)?")) {
			//selected indices are to be removed; remove them
			$scope.songIndices.sort((a, b) => a-b);
			for (var i = $scope.songIndices.length - 1; i >= 0; i--) {
				$scope.songData.splice($scope.songIndices[i], 1);
			}
			clearSongSelected();
			var idList = getSongIDList();
			//update DB
			$http.post("/editPlaylist", {"_id": $scope.playlistData[$scope.playlistIndices]["_id"], "contents": idList}).then(function(resp) {
				console.log("removal of songs from playlist ok");
				$scope.playlistData[$scope.playlistIndices] = resp["data"];
				updatePlaylistSortable();
			}, function(err) {
				console.log(err);
				if (err.status == 403) {
					alert("Session timed out");
					$window.location.href = "/";
				}
				else {
					alert("Failed to delete songs");
				}
			});
		}
	}

	function closeAllModals() {
		$scope.closePlaylistModal();
		$scope.closeEditSongModal();
		$scope.closeAddSongsModal();
	}
}]);
