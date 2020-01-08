app.controller('listEditSongCtrl', ['$scope', '$http', '$location', '$timeout', 'dispatcher', 'uiSortableMultiSelectionMethods', 'sortingFuncs', 'songDatashare',
		function($scope, $http, $location, $timeout, dispatcher, uiSortableMultiSelectionMethods, sortingFuncs, songDatashare) {
	//data model
	$scope.songs = songDatashare;

	//order vars
	$scope.orderVar = "date";
	$scope.reverse = true;
	//sorting funcs
	$scope.sortBy = function(propertyName, preserveOrder=false) {
		var res = sortingFuncs.sortBy($scope.songs.songData, $scope.reverse, $scope.orderVar, propertyName, preserveOrder);
		$scope.reverse = res["reverse"];
		$scope.orderVar = res["orderVar"];
		$scope.songs.songData = res["data"];
	}

	$scope.sortGlyph = function(type) {
		return sortingFuncs.sortGlyph($scope.reverse, $scope.orderVar, type);
	}

	$scope.sortableSongs = uiSortableMultiSelectionMethods.extendOptions({
		refreshPositions: true
	});

	$("#editSongSelect").on('ui-sortable-selectionschanged', function (e, args) {
		console.log("song select changed");
		$scope.songs.songIndices = $(this).find('.ui-sortable-selected').map(function(i, element){
			return $(this).index();
		}).toArray();
		$scope.$apply();
	});

	$scope.getSongData = function(query={}, sortVar="date", sortRev=true) {
		$http.post("/findMusic", query).then(function(resp) {
			console.log("edit music query success");
			$scope.songs.songData = resp.data;
			console.log("songs returned: ", $scope.songs.songData);
			//sort data
			$scope.sortBy(sortVar, sortRev);
		}, function(error) {
			console.log(error);
		});
	};

	$scope.getSongData();

	$scope.songNameSearch = "";
	$scope.advSearch = function() {
		$scope.songs.songIndices = [];
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
		//prepare datepicker
		$('#songStartDate, #songEndDate').datepicker({
			todayBtn: "linked",
			clearBtn: true,
			autoclose: true,
			todayHighlight: true
		});
		$('#songStartDate, #songEndDate').datepicker("clearDates");
	})

	console.log("edit controller exec");
	
}]);
console.log("edit exec");
