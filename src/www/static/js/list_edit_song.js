app.controller('listEditSongCtrl', ['$scope', '$http', '$location', '$window', '$timeout', 'uiSortableMultiSelectionMethods', 'sortingFuncs', 'songDatashare', 'youtubeFuncs',
		function($scope, $http, $location, $window, $timeout, uiSortableMultiSelectionMethods, sortingFuncs, songDatashare, youtubeFuncs) {
	//data model
	$scope.songDatashare = songDatashare;

	$scope.$parent["childScope"] = $scope;

	//order vars
	$scope.orderVar = "date";
	$scope.reverse = true;
	//sorting funcs
	// $scope.sortBy = function(propertyName, preserveOrder=false) {
	// 	var res = sortingFuncs.sortBy($scope.songs.songData, $scope.reverse, $scope.orderVar, propertyName, preserveOrder);
	// 	$scope.reverse = res["reverse"];
	// 	$scope.orderVar = res["orderVar"];
	// 	$scope.songs.songData = res["data"];
	// }
	$scope.sortBy = function(propertyName, preserveOrder=false) {
		songDatashare.sortBy(propertyName, preserveOrder);
	};

	// $scope.sortGlyph = function(type) {
	// 	return sortingFuncs.sortGlyph($scope.reverse, $scope.orderVar, type);
	// }
	$scope.sortGlyph = function(type) {
		return songDatashare.sortGlyph(type);
	}

	$scope.sortableSongs = uiSortableMultiSelectionMethods.extendOptions({
		refreshPositions: true,
		// items: "> :not(.item)"
		update: function(e, ui) {
			ui.item.sortable.cancel();
		}
	});
	// $scope.sortableSongs = songDatashare.songSortable;

	// console.log("sortablesongs:");
	// console.log($scope.sortableSongs);

	var updateSortable = function (e, args) {
		console.log("song select changed");
		console.log(e);
		console.log(args);
		$scope.songDatashare.songIndices = $(this).find('.ui-sortable-selected').map(function(i, element){
		// songDatashare.songIndices = $(this).find('.ui-sortable-selected').map(function(i, element){
			return $(this).index();
		}).toArray();
		if (!$scope.$$phase) {
			$scope.$apply();
		}
	};

	$("#editSongSelect").on('ui-sortable-selectionschanged', updateSortable);

	$scope.getSongData = function(query={}, sortVar="date", sortRev=true) {
		$http.post("/findMusic", query).then(function(resp) {
			console.log("edit music query success");
			$scope.songDatashare.songData = resp.data;
			console.log("songs returned: ", $scope.songDatashare.songData);
			//sort data
			$scope.sortBy(sortVar, sortRev);
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

	$scope.getSongData();

	//search variables
	$scope.songNameSearch = "";
	$scope.songStartDate = "";
	$scope.songEndDate = "";
	$scope.songArtistSearch = "";
	$scope.songAlbumSearch = "";
	$scope.songGenreSearch = "";
	$scope.advSearch = function() {
		$scope.songDatashare.songIndices = [];
		// create query
		// available keys: "name", "start_date", "end_date", "artist_names" "_id"
		var query = {};
		if ($scope.songNameSearch != "") {
			query["song_names"] = $scope.songNameSearch.split(",").map(i => i.trim()).filter(function(i) {return i != "";});
		}
		if (!($scope.songStartDate == undefined || $scope.songStartDate == "")) {
			query["start_date"] = $scope.songStartDate;
		}
		if (!($scope.songEndDate == undefined || $scope.songEndDate == "")) {
			query["end_date"] = $scope.songEndDate;
		}
		var sortByRelev = false;
		if (!($scope.songArtistSearch == undefined || $scope.songArtistSearch == "")) {
			query["artist_names"] = $scope.songArtistSearch.split(",").map(i => i.trim()).filter(function(i) {return i != "";});
			sortByRelev = true;
		}
		if (!($scope.songAlbumSearch == undefined || $scope.songAlbumSearch == "")) {
			query["album_names"] = $scope.songAlbumSearch.split(",").map(i => i.trim()).filter(function(i) {return i != "";});
			sortByRelev = true;
		}
		if (!($scope.songGenreSearch == undefined || $scope.songGenreSearch == "")) {
			query["genre_names"] = $scope.songGenreSearch.split(",").map(i => i.trim()).filter(function(i) {return i != "";});
			sortByRelev = true;
		}
		console.log("query:", query)
		if (sortByRelev) {
			$scope.getSongData(query, "relev");
		}
		else {
			$scope.getSongData(query);
		}
	}

	var searchFunc = function(evt) {
		if (evt.which == 13) {	//enter key
			$("#advSongSearchBtn").click();
		}
	};

	$(".song-search").on("keypress", searchFunc);

	var tabFunc = function(e) {
		console.log("subtab clicked");
		console.log($(this)[0]);
		var targetTab = $(this)[0]["dataset"]["target"];
		songDatashare.tab = targetTab;
		if (targetTab == "#addNewSong") {
			songDatashare.loadEditTemplate("#addNewSong", $scope, null, true);
		}
		if (!$scope.$$phase) {
			$scope.$apply();
		}
		console.log(songDatashare);
		e.preventDefault();
		$(".tab-pane").removeClass("show active");
		$(targetTab).addClass("show active");
	};

	$(function() {
		//handle subtab click
		$("#listEditSongDiv .nav-link").on("click", tabFunc);

		//prepare datepicker
		$('#songStartDate, #songEndDate').datepicker({
			todayBtn: "linked",
			clearBtn: true,
			autoclose: true,
			todayHighlight: true
		});
		$('#songStartDate, #songEndDate').datepicker("clearDates");
	});

	$scope.getThumbnail = youtubeFuncs.getThumbnail;

	console.log("edit controller exec");

	$scope.$on("$destroy", function() {
		console.log("list template destroy");
		$("#editSongSelect").off('ui-sortable-selectionschanged', updateSortable);
		$(".song-search").off("keypress", searchFunc);
		$("#listEditSongDiv .nav-link").off("click", tabFunc);
	});
	
}]);
console.log("edit exec");
