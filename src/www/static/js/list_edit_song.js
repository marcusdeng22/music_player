app.controller('listEditSongCtrl', ['$scope', '$rootScope', '$http', '$location', '$window', '$timeout', 'uiSortableMultiSelectionMethods', 'sortingFuncs', 'songDatashare', 'youtubeFuncs',
		function($scope, $rootScope, $http, $location, $window, $timeout, uiSortableMultiSelectionMethods, sortingFuncs, songDatashare, youtubeFuncs) {
	//data model
	$scope.songDatashare = songDatashare;

	$scope.$parent["childScope"] = $scope;

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

	var updateSortable = function (e, args) {
		console.log("song select changed");
		console.log(e);
		songDatashare.allSelect = false;
		songDatashare.songIndices = $(this).find('.ui-sortable-selected').map(function(i, element){
			return $(this).index();
		}).toArray();
		if (!$scope.$$phase) {
			$scope.$apply();
		}
		console.log($scope.songDatashare.songIndices);
	};

	$("#editSongSelect").on('ui-sortable-selectionschanged', updateSortable);

	//search variables
	$scope.songNameSearch = "";
	$scope.songStartDate = "";
	$scope.songEndDate = "";
	$scope.songArtistSearch = "";
	$scope.songAlbumSearch = "";
	$scope.songGenreSearch = "";
	$scope.songUrlSearch = "";
	$scope.advSearch = function(force=false) {
		// $scope.songDatashare.songIndices = [];
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
		var sortByDate = false;
		if (!($scope.songArtistSearch == undefined || $scope.songArtistSearch == "")) {
			query["artist_names"] = $scope.songArtistSearch.split(",").map(i => i.trim()).filter(function(i) {return i != "";});
			sortByDate = true;
		}
		if (!($scope.songAlbumSearch == undefined || $scope.songAlbumSearch == "")) {
			query["album_names"] = $scope.songAlbumSearch.split(",").map(i => i.trim()).filter(function(i) {return i != "";});
			sortByDate = true;
		}
		if (!($scope.songGenreSearch == undefined || $scope.songGenreSearch == "")) {
			query["genre_names"] = $scope.songGenreSearch.split(",").map(i => i.trim()).filter(function(i) {return i != "";});
			sortByDate = true;
		}
		if (!($scope.songUrlSearch == undefined || $scope.songUrlSearch == "")) {
			query["url"] = $scope.songUrlSearch.split(",").map(i => i.trim()).filter(function(i) {return i != "";});
			sortByDate = true;
		}
		console.log("query:", query)
		if (sortByDate) {
			songDatashare.getSongData(query, "date", true, force);
		}
		else {
			songDatashare.getSongData(query, undefined, undefined, force);
		}
	};

	$scope.advSearch();

	$scope.changeSort = function(sortBy) {
		if (sortBy == songDatashare.orderVar) {
			songDatashare.reverse = !songDatashare.reverse;
		}
		else {
			songDatashare.orderVar = sortBy;
		}
		songDatashare.getSongData(undefined, undefined, undefined, true);
	}

	$rootScope.$on("clearSongSearch", function() {
		$scope.clearSearch();
	});

	$scope.clearSearch = function() {
		console.log("CLEARING SONG SEARCH");
		songDatashare.allSelect = false;
		$scope.songNameSearch = "";
		$scope.songStartDate = "";
		$scope.songEndDate = "";
		$scope.songArtistSearch = "";
		$scope.songAlbumSearch = "";
		$scope.songGenreSearch = "";
		$scope.songUrlSearch = "";
		$scope.advSearch(true);
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
			songDatashare.loadEditTemplate("#addNewSong", $scope);
		}
		else if (targetTab == "#existingSongSearch") {
			songDatashare.stopPlayem();
		}
		if (!$scope.$$phase) {
			$scope.$apply();
		}
		console.log(songDatashare);
		e.preventDefault();
		$(".tab-pane").removeClass("show active");
		$(targetTab).addClass("show active");
	};

	var expandFunc = function(e) {
		e.preventDefault();
		if ($("#editSongAdvSearchContainer").hasClass("show")) {
			$scope.clearSearch();
		}
	};

	$scope.initializeJQ = function() {
	// $(function() {
		console.log("dom ready in list template");
		console.log($("#listEditSongDiv .nav-link").length);
		// $timeout(function() {
		// 	$(function() {
				console.log("attached tab events");
				//handle subtab click
				$("#listEditSongDiv .nav-link").on("click", tabFunc);

				//handle advanced search expand
				$("#editCollapse").on("click", expandFunc);

				//prepare datepicker
				$('#songStartDate, #songEndDate').datepicker({
					todayBtn: "linked",
					clearBtn: true,
					autoclose: true,
					todayHighlight: true
				});
				$('#songStartDate, #songEndDate').datepicker("clearDates");
		// 	});
		// }, 200);
	// });
	};

	$(function() {
		console.log("attaching tab events");
		$scope.initializeJQ();
	});

	$scope.getThumbnail = youtubeFuncs.getThumbnail;

	$scope.submitDblClk = function() {
		//switch on the source that loaded this template
		console.log("dbl click from list edit");
		console.log($scope["listTemplateDiv"]);
		console.log($scope);
		switch($scope["listTemplateDiv"]) {
			case "#playlistSongEditDiv":
				$rootScope.$emit("playlistAddSubmit");
				break;
			case "#songEditDiv":
				$rootScope.$emit("songEditTrigger");
				break;
			default:
				console.log("mismatch");
		}
	};

	$rootScope.$on("listTemplateUpdateSource", function(event, newSource) {
		console.log(newSource);
		$scope["listTemplateDiv"] = newSource;
	});

	$scope.addSelectClass = function() {
		if (songDatashare.allSelect) {
			$("#editSongSelect > .songItem").addClass("ui-sortable-selected");
		}
	};

	console.log("edit controller exec");

	$scope.$on("$destroy", function() {
		console.log("list template destroy");
		$("#editSongSelect").off('ui-sortable-selectionschanged', updateSortable);
		$(".song-search").off("keypress", searchFunc);
		$("#listEditSongDiv .nav-link").off("click", tabFunc);
		$("#editCollapse").off("click", expandFunc);
	});
	
}]);
console.log("edit exec");
