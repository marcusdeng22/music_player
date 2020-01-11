app.controller('listEditSongCtrl', ['$scope', '$http', '$location', '$timeout', 'dispatcher', 'uiSortableMultiSelectionMethods', 'sortingFuncs', 'songDatashare',
		function($scope, $http, $location, $timeout, dispatcher, uiSortableMultiSelectionMethods, sortingFuncs, songDatashare) {
	//data model
	$scope.songDatashare = songDatashare;

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

	$("#editSongSelect").on('ui-sortable-selectionschanged', function (e, args) {
		console.log("song select changed");
		console.log(e);
		console.log(args);
		$scope.songDatashare.songIndices = $(this).find('.ui-sortable-selected').map(function(i, element){
		// songDatashare.songIndices = $(this).find('.ui-sortable-selected').map(function(i, element){
			return $(this).index();
		}).toArray();
		$scope.$apply();
	});

	$scope.getSongData = function(query={}, sortVar="date", sortRev=true) {
		$http.post("/findMusic", query).then(function(resp) {
			console.log("edit music query success");
			$scope.songDatashare.songData = resp.data;
			console.log("songs returned: ", $scope.songDatashare.songData);
			//sort data
			$scope.sortBy(sortVar, sortRev);
		}, function(error) {
			console.log(error);
		});
	};

	$scope.getSongData();

	$scope.songNameSearch = "";
	$scope.advSearch = function() {
		$scope.songDatashare.songIndices = [];
		// create query
		// available keys: "name", "start_date", "end_date", "artist_names" "_id"
		var query = {};
		if ($scope.songNameSearch != "") {
			query["name"] = $scope.songNameSearch;
		}
		if (!($scope.songStartDate == undefined || $scope.songStartDate == "")) {
			query["start_date"] = $scope.songStartDate;
		}
		if (!($scope.songEndDate == undefined || $scope.songEndDate == "")) {
			query["end_date"] = $scope.songEndDate;
		}
		var sortByRelev = false;
		if (!($scope.songArtistSearch == undefined || $scope.songArtistSearch == "")) {
			query["artist_names"] = $scope.songArtistSearch.split(";").map(i => i.trim()).filter(function(i) {return i != "";});
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

	$(function() {
		//handle subtab click
		$("#listEditSongDiv .nav-link").on("click", function(e) {
			console.log("subtab clicked");
			console.log($(this)[0]);
			songDatashare.tab = $(this)[0]["dataset"]["target"];
			$scope.$apply();
			console.log(songDatashare);
			e.preventDefault();
			$(".tab-pane").removeClass("show active");
			$($(this)[0]["dataset"]["target"]).addClass("show active");
		});

		//prepare datepicker
		$('#songStartDate, #songEndDate').datepicker({
			todayBtn: "linked",
			clearBtn: true,
			autoclose: true,
			todayHighlight: true
		});
		$('#songStartDate, #songEndDate').datepicker("clearDates");
	});

	console.log("edit controller exec");
	
}]);
console.log("edit exec");
