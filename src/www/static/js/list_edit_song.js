app.controller('listEditSongCtrl', ['$scope', '$rootScope', '$http', '$location', '$window', '$timeout', 'uiSortableMultiSelectionMethods', 'sortingFuncs', 'songDatashare', 'youtubeFuncs',
		function($scope, $rootScope, $http, $location, $window, $timeout, uiSortableMultiSelectionMethods, sortingFuncs, songDatashare, youtubeFuncs) {
	//data model
	$scope.songDatashare = songDatashare;

	$scope.$parent["childScope"] = $scope;

	//order vars
	$scope.orderVar = "date";
	$scope.reverse = true;
	//sorting funcs
	// $scope.sortBy = function(propertyName, preserveOrder=false) {
	// 	songDatashare.sortBy(propertyName, preserveOrder);
	// };

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
		// $scope.songDatashare.songIndices = $(this).find('.ui-sortable-selected').map(function(i, element){
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
	$scope.advSearch = function(sortBy="date", descending=true, page=0) {
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
		if (!($scope.songUrlSearch == undefined || $scope.songUrlSearch == "")) {
			query["url"] = $scope.songUrlSearch.split(",").map(i => i.trim()).filter(function(i) {return i != "";});
			sortByRelev = true;
		}
		console.log("query:", query)
		if (sortByRelev) {
			// $scope.getSongData(query, "relev");
			songDatashare.curPage = 0;
			songDatashare.getSongData(query, "relev")
		}
		else {
			// $scope.getSongData(query);
			songDatashare.curPage = 0;
			songDatashare.getSongData(query);
		}
	};

	$scope.changeSort = function(sortBy) {
		if (sortBy == songDatashare.orderVar) {
			songDatashare.reverse = !songDatashare.reverse;
		}
		else {
			songDatashare.orderVar = sortBy;
		}
		songDatashare.curPage = 0;
		songDatashare.getSongData();
	}

	$rootScope.$on("clearSongSearch", function() {
		$scope.songNameSearch = "";
		$scope.songStartDate = "";
		$scope.songEndDate = "";
		$scope.songArtistSearch = "";
		$scope.songAlbumSearch = "";
		$scope.songGenreSearch = "";
		$scope.songUrlSearch = "";
		// $scope.getSongData();
		$scope.advSearch();
	});

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

	$scope.submitDblClk = function() {
		//switch on the source that loaded this template
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
	}

	console.log("edit controller exec");

	$scope.$on("$destroy", function() {
		console.log("list template destroy");
		$("#editSongSelect").off('ui-sortable-selectionschanged', updateSortable);
		$(".song-search").off("keypress", searchFunc);
		$("#listEditSongDiv .nav-link").off("click", tabFunc);
	});
	
}]);
console.log("edit exec");
