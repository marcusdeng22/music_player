// import {Spinner} from "spin.js";

var app = angular.module('MusicApp', ['ui.sortable', 'ui.sortable.multiselection', 'infinite-scroll', 'darthwade.loading', 'angularLazyImg']);

app.factory("authIntercept", ["$q", "$window", function($q, $window) {
	var handled = false;
	var responseError = function(err) {
		if (handled) {
			return $q.resolve();
		}
		if (err.status == 403) {
			//set location
			$window.location.href = "/";
			handled = true;
			alert("Session timed out");
			return $q.resolve();
		}
		return $q.reject(err);
	};

	return {
		responseError: responseError
	};
}]);

app.config(["$httpProvider", function($httpProvider) {
	$httpProvider.interceptors.push("authIntercept");
}]);

app.directive("ngEnter", function() {
	return {
		restrict: "A",
		link: function(scope, element, attrs) {
			var f = function(e) {
				if (e.which === 13) {
					scope.$apply(function() {
						scope.$eval(attrs.ngEnter);
					});
					e.preventDefault();
				}
			}

			element.on("keyup", f);

			scope.$on("$destroy", function() {
				element.off("keyup", f);
			});
		}
	}
});

//https://stackoverflow.com/questions/152975/how-do-i-detect-a-click-outside-an-element
app.directive("ngOffClose", function() {
	return {
		restrict: "A",
		link: function(scope, element, attrs) {
			var f = function(e) {
				if ((e.which === 27 || e.which === 1) && !$(e.target).closest(element).length && element.is(":visible")) {
					scope.$apply(function() {
						scope.$eval(attrs.ngOffClose);
					});
				}
			};

			var g = function(e) {
				if (e.which === 27 && element.is(":visible")) {
					scope.$apply(function() {
						scope.$eval(attrs.ngOffClose);
					});
				}
			};

			$("body").on("mousedown", f).on("keydown", f);
			element.on("keydown", "input", g);

			scope.$on("$destroy", function() {
				$("body").off("mousedown", f).off("keydown", f);
				$(element + " input").off("keydown", "input", g);
			});
		}
	}
});

app.factory("youtubeFuncs", ["$http", function($http) {
	var data = {};
	data.cleanUrl = function(id){
		// return /([a-zA-Z0-9_\-]+)/.test(id) && RegExp.lastParen;
		ret = id.match(/^.*(?:(?:youtu\.be\/|v\/|vi\/|u\/\w\/|embed\/)|(?:(?:watch)?\?v(?:i)?=|\&v(?:i)?=))([^#\&\?]*).*/);
		if (ret != null) {
			return ret[1];
		}
		return
	};

	data.getThumbnail = function(item) {
		// console.log("THUMBNAIL");
		// console.log(item);
		if (item.url) {
			return "https://img.youtube.com/vi/" + data.cleanUrl(item.url) + "/default.jpg";
			// return "https://img.youtube.com/vi/" + data.cleanUrl(item.url) + "/0.jpg";
		}
	}
	return data;
}]);

app.factory("sortingFuncs", ["orderByFilter", function(orderBy) {
	var sortingFuncs = {};
	sortingFuncs.sortGlyph = function(reverse, orderVar, type) {
		ret = "icon fas fa-chevron-" + (reverse ? "down" : "up");
		if (orderVar == "date" && orderVar == type) {
			return ret;
		}
		else if (orderVar == "name" && orderVar == type) {
			return ret;
		}
		else if (orderVar == "relev" && orderVar == type) {
			return ret;
		}
		else {
			return "";
		}
	};

	//ordering function: local data only
	//TODO: make this a stable sort? https://stackoverflow.com/questions/24678527/is-backbonejs-and-angularjs-sorting-stable
	//TODO: deprecate this and use server DB sort
	sortingFuncs.sortBy = function(data, reverse, orderVar, propertyName, preserveOrder=false) {
		if (!preserveOrder) {
			reverse = (propertyName && orderVar === propertyName) ? !reverse : false;
		}
		orderVar = propertyName;
		data = orderBy(data, orderVar, reverse);
		return {
			"reverse": reverse,
			"orderVar": orderVar,
			"data": data
		}
	}
	return sortingFuncs;
}]);

app.factory("playDatashare", ["$timeout", "$rootScope", function($timeout, $rootScope) {
	var config = {
		playerContainer: document.getElementById("mainPlayerContainer"),
		playerId: "mainPlayer"
	};
	var data = {};
	data.playem = new Playem();
	data.currentState = 0;
	data.nowPlaying = null;

	data.loadPlayem = function() {
		data.playem.stop();
		data.playem.clearQueue();
		data.playem.clearPlayers();
		$("#mainPlayerContainer").empty();
		data.playem.addPlayer(YoutubePlayer, config);	//TODO: add more players here
	};
	data.previousSong = function() {
		if (data.playem != null) {
			data.playem.prev();
		}
	};

	data.nextSong = function() {
		if (data.playem != null) {
			data.playem.next();
		}
	};

	data.playPause = function() {
		if (data.playem != null) {
			if (data.currentState == 1) {
				data.playem.pause();
			}
			else if (data.currentState == 0) {
				data.playem.resume();
			}
		}
	};

	data.playem.on("onPlay", function() {
		console.log("playing!");
		data.currentState = 1;
		if (!$rootScope.$$phase) {
			$rootScope.$apply();
		}
	});

	data.playem.on("onPause", function() {
		console.log("paused!");
		data.currentState = 0;
		if (!$rootScope.$$phase) {
			$rootScope.$apply();
		}
	});

	data.playem.on("onEnd", function() {
		console.log("ended!");
		data.currentState = 0;
		if (!$rootScope.$$phase) {
			$rootScope.$apply();
		}
	});

	data.playem.on("onBuffering", function() {
		console.log("buffering!");
		data.currentState = 0;
		if (!$rootScope.$$phase) {
			$rootScope.$apply();
		}
	});
	return data;
}])

app.factory("songDatashare", ["$compile", "$timeout", "$http", "$window", "sortingFuncs", "$rootScope", function($compile, $timeout, $http, $window, sortingFuncs, $rootScope) {
	var VARIES = "<varies>";
	var data = {};
	//tab info
	data.tab = "#existingSongSearch";	//#existingSongSearch or #addNewSong
	data.listTemplateId = "";
	var oldListTemplate = null;
	data.loadListTemplate = function(targetId, $scope) {
		console.log("loading list template");
		data.listTemplateId = targetId;
		data.songIndices = [];
		$("#listEditSongDiv").detach().appendTo($(targetId));
		$rootScope.$emit("clearSongSearch");
		$rootScope.$emit("listTemplateUpdateSource", data.listTemplateId);
		$("#songListTab").click();
	};
	//song data below
	data.songData = [];
	data.totalResults = 0;
	data.songIndices = [];
	data.curQuery = null;
	data.orderVar = "date";
	data.reverse = true;
	data.curPage = 0;
	data.scrollBusy = false;

	var SONG_PAGE_SIZE = 25;
	var curIndex = 0;
	data.dataNotReady = true;
	data.allSelect = true;
	// var scrollBusy = false;
	data.getSongData = function(query=data.curQuery, sortBy=data.orderVar, descending=data.reverse, force=false) {
		console.log("getting song data");
		console.log(query);
		console.log(data.curQuery);
		data.clearSelected();
		//confirm if query is new
		if (!force) {
			var diff = false;
			if (!data.curQuery) {
				diff = true;
			}
			else {
				console.log("CHECKING");
				for (const [key, value] of Object.entries(data.curQuery)) {
					if (key == "sortby") {
						if (value != sortBy) {
							diff = true;
							break;
						}
						continue;
					}
					if (key == "descend") {
						if (value != descending) {
							diff = true;
							break;
						}
						continue;
					}
					if (key == "page") {
						continue;
					}
					if (!(key in query) || value != query[key]) {
						diff = true;
						break;
					}
				}
				if (!diff) {
					for (const [key, value] of Object.entries(query)) {
						if (!(key in data.curQuery) || value != data.curQuery[key]) {
							diff = true;
							break;
						}
					}
				}
			}
			console.log("DONE CHECKING");
			if (!diff) {
				console.log('not diff');
				return $timeout();
			}
		}
		data.dataNotReady = true;
		data.curQuery = query;
		data.orderVar = sortBy;
		data.reverse = descending;
		
		query["sortby"] = sortBy;
		query["descend"] = descending;
		// query["page"] = page;
		return $http.post("/findMusic", query).then(function(resp) {
			console.log("got song data");
			console.log(resp);
			data.songData = resp.data.results;
			data.totalResults = resp.data.count;
			curIndex = 0;
			data.displayedSongData = [];
			data.dataNotReady = false;
			$timeout(function() {
				$("#editSongSelect").scrollTop(0);
				data.loadDisplayedSongData();
			}, 20);
		}, function(err) {
			console.log(err);
			alert("Failed to get song data");
		});
	};
	data.displayedSongData = [];
	data.loadDisplayedSongData = function() {
		console.log("DISPLAYING");
		console.log(data.songData[0]);
		for (var x = 0; x < SONG_PAGE_SIZE && curIndex < data.songData.length; x ++) {
			data.displayedSongData.push(data.songData[curIndex++]);
		}
		console.log(data.displayedSongData);
		// scrollBusy = false;
	};
	data.sortGlyph = function(type) {
		return sortingFuncs.sortGlyph(data.reverse, data.orderVar, type);
	};
	data.clearSelected = function() {
		console.log("datashare clearing");
		$("#editSongSelect > .ui-sortable-selected").removeClass("ui-sortable-selected");
		$("#editSongSelect").trigger('ui-sortable-selectionschanged');
		data.songIndices = [];
	};
	data.selectAll = function() {
		data.allSelect = true;
		$("#editSongSelect > .songItem").addClass("ui-sortable-selected");
		// $("#editSongSelect").trigger('ui-sortable-selectionschanged');
		data.songIndices = Array.from(Array(data.songData.length).keys());
	};
	//edit data below
	data.editTemplateId = "";
	data.editData = {};	//store the edit song info here
	data.editDataID = new Set();	//store the edit song IDs here
	data.editDataURL = new Set();	//store the edit song URLs here
	// data.playem = null;	//store the preview player info here
	data.playem = new Playem();
	data.loadEditTemplate = function(targetId, $scope, toAdd=null, callback=null) {
		data.editTemplateId = targetId;
		if (toAdd != null) {
			data.setEditData(toAdd);
		}
		else {
			data.resetEdit();
		}
		data.reloadPlayem();
		$("#editSongDiv").detach().appendTo($(targetId));
		$rootScope.$emit("editTemplateUpdateSource", data.editTemplateId, data.listTemplateId);
		if (callback != null) {
			callback();
		}
	};
	data.stopPlayem = function() {
		console.log("STOPPING PLAYEM PREVIEWER");
		if (data.playem != null) {
			data.playem.stop();
			data.playem.clearQueue();
			data.playem.clearPlayers();
			console.log(data.playem.getPlayers());
			// delete data.playem;
		}
		$("#previewDisplay").empty();	//stops loading of video if stopping early
		console.log("DONE STOPPING PLAYEM PREVIEWER");
	};
	data.reloadPlayem = function() {
		data.stopPlayem();
		var config = {
			playerContainer: document.getElementById("previewDisplay")
		};
		data.playem.addPlayer(YoutubePlayer, config);
		console.log("DONE RELOADING PLAYEM PREVIEWER");
	};
	data.resetEdit = function() {
		data.editData = {"url": "", "type": "youtube", "name": "", "artist": [], "album": "", "genre": "", "vol": 50, "start": 0, "end": 0};
		data.editDataID.clear();
		data.editDataURL.clear();
	};
	data.setEditData = function(dataToCopy) {
		if (dataToCopy.length == 1) {
			data.editData = angular.copy(dataToCopy[0]);
			data.editDataID.clear();
			data.editDataURL.clear();
			if ("_id" in data.editData) {
				data.editDataID.add(data.editData["_id"]);
			}
			if ("url" in dataToCopy[0]) {
				data.editDataURL.add(dataToCopy[0]["url"]);
			}
		}
		else {
			data.editDataID.clear();
			data.editDataURL.clear();
			data.editData = {};
			var keys = ["url", "type", "name", "artist", "album", "genre", "vol", "start", "end"];
			for (var i = 0; i < dataToCopy.length; i++) {
				if ("_id" in dataToCopy[i]) {
					data.editDataID.add(dataToCopy[i]["_id"]);
				}
				if ("url" in dataToCopy[i]) {
					data.editDataURL.add(dataToCopy[i]["url"]);
				}
				for (var key in dataToCopy[i]) {
					if (key in data.editData) {
						if (data.editData[key] == VARIES) {
							continue;
						}
						else if (key != "artist" && data.editData[key] != dataToCopy[i][key]) {
							data.editData[key] = VARIES;
						}
						else if (key == "artist") {
							//compare arrays
							if (data.editData[key].length != dataToCopy[i][key].length) {
								data.editData[key] = VARIES;
								continue;
							}
							for (var j = 0; j < data.editData[key].length; j ++) {
								if (data.editData[key][j] != dataToCopy[i][key][j]) {
									data.editData[key] = VARIES;
									break;
								}
							}
						}
						//else everything matches, so leave as is
					}
					else if (!(key in data.editData)) {
						data.editData[key] = dataToCopy[i][key];
					}
				}
			}
		}
	};
	data.checkSongFields = function(df=data.editData) {	//check fields of editted data before pushing; returns true if a field is bad
		// console.log("checking edit song fields");
		// console.log(df);
		var reqKeys = ["url", "type", "name", "artist"];
		var mediaTypes = ["youtube"];
		for (var i = 0; i < reqKeys.length; i ++) {
			var key = reqKeys[i];
			if (df[key] == undefined || df[key] == "") {
				// console.log(key + " is bad");
				return true;
			}
			if (key == "type") {
				//force to lowercase
				df[key] = df[key].toLowerCase();
				if (!mediaTypes.includes(df[key])) {
					return true;
				}
			}
			if (key == "artist") {
				//force to array if str
				if (typeof df[key] === "string" || df[key] instanceof String) {
					var tempArtistStr = df[key].trim();
					if (tempArtistStr.charAt(tempArtistStr.length - 1) == ",") {
						return true;
					}
					df[key] = df[key].split(",").filter(function(el) {return el;});
				}
			}
		}
		//unrequired keys
		if (df["album"] != undefined) {
			df["album"] = String(df["album"]);
		}
		else {
			df["album"] = "";
		}
		if (df["genre"] != undefined) {
			df["genre"] = String(df["genre"]);
		}
		else {
			df["genre"] = "";
		}
		if (df["vol"] != undefined) {
			if (isNaN(parseInt(df["vol"]))) {
				df["vol"] = 50;
			}
			else {
				df["vol"] = parseInt(df["vol"]);
			}
			if (df["vol"] < 0) {
				df["vol"] = 0;
			}
			if (df["vol"] > 100) {
				df["vol"] = 100;
			}
		}
		else {
			df["vol"] = 50;	//default
		}
		if (df["start"] != undefined) {
			if (isNaN(parseInt(df["start"]))) {
				df["start"] = 0;
			}
			else {
				df["start"] = parseInt(df["start"]);
			}
			if (df["start"] < 0) {
				df["start"] = 0;
			}
		}
		else {
			df["start"] = 0;
		}
		if (df["end"] != undefined) {
			if (isNaN(parseInt(df["end"]))) {
				df["end"] = 0;
			}
			else {
				df["end"] = parseInt(df["end"]);
			}
			if (df["end"] < 0) {
				df["end"] = 0;
			}
		}
		else {
			df["end"] = 0;
		}
		// console.log("edit data ok");
		return false;
	};
	data.addSong = function(toCall=null) {
		if (data.checkSongFields() || data.editDataID.size > 0) {
			return;
		}
		$http.post("/addMusic", data.editData).then(function(resp) {
			console.log("add music ok");
			console.log(resp);

			if (toCall != null) {
				toCall(resp["data"]);
			}
			//clear the search
			$rootScope.$emit("clearSongSearch");
			data.resetEdit();
		}, function(err) {
			console.log(err);
			alert("Failed to add music; does it exist already?");
		});
	};
	data.addMultipleSongs = function(toAddList, editMode, toCall=null) {
		console.log("ADDING MULTIPLE SONGS");
		// data.setEditData(toAddList);	//this replaces the editted fields: not good! but still need to check if fields are valid
		if (editMode) {
			if (data.checkSongFields()) {
				alert("Invalid edit song data");
				return;
			}

			//merge data from edit fields to toAddList
			//if multiple edit urls, check if toAddList url is present
			//if single edit url, check if toAddList url is it
			//if both false, then return (can't match)
			//for all other fields, if VARIES then skip
			//else apply
			if (toAddList.length == 1 && data.editDataURL.size == 1) {
				if (!data.editDataURL.has(toAddList[0]["url"])) {
					return;
				}
			}
			else if (toAddList.length > data.editDataURL.size) {
				return;	//impossible to occur; must have duplicate urls and thus is invalid
			}
			else if (data.editData["url"] != VARIES) {
				return;	//can't have duplicate urls
			}
			else {
				//multiple urls; check if all toAddList urls are present
				for (var j = 0; j < toAddList.length; j ++) {
					if (!data.editDataURL.has(toAddList[j]["url"])) {
						return;
					}
				}
			}
			console.log("passed url check");
		}
		else {
			for (var x = 0; x < toAddList.length; x ++) {
				if (data.checkSongFields(toAddList[x])) {
					alert("Invalid song data");
					return;
				}
			}
		}
		console.log("PASSED MULT SONG FIELD CHECK");
		
		//now we have verified we have valid urls; time to collect editted fields
		var myQuery = [];
		if (editMode) {
			for (var i = 0; i < toAddList.length; i ++) {
				var mySong = {};
				mySong["url"] = toAddList[i]["url"];	//guaranteed by above check to be valid
				for (var key in data.editData) {
					if (data.editData[key] != VARIES) {
						mySong[key] = data.editData[key];
					}	
					else {
						mySong[key] = toAddList[i][key];
					}
				}
				myQuery.push(mySong);
			}
		}
		else {
			myQuery = toAddList;
		}
		console.log("ADDING MULT SONGS:");
		console.log(myQuery);
		$http.post("/addManyMusic", myQuery).then(function(resp) {
			console.log("add many music ok");
			console.log(resp.data);
			//get new song data
			// data.getSongData(undefined, undefined, undefined, true);	//force reload of song data
			$rootScope.$emit("clearSongSearch");
			if (toCall != null) {
				toCall(resp.data);
			}
			//don't reset data: will be reset on next load
		}, function(err) {
			console.log(err);
			alert("Failed to add music; perhaps it already exists?");
		});
	};
	data.editSong = function(toCall=null, fromList=false) {
		if (data.checkSongFields()) {
			console.log("EDIT FAILED: BAD DATA");
			return;
		}
		if (data.editDataID.size == 0) {
			//no data, so technically successful; do callback
			console.log("EDIT SIZE 0");
			var emptyRet = {};
			$rootScope.$emit("songChanged", emptyRet);
			if (toCall != null) {
				toCall(emptyRet);
			}
			return;
		}
		var editSubm = {}
		//decompose edit data for submission
		for (var key in data.editData) {
			if (data.editData[key] != VARIES) {
				editSubm[key] = data.editData[key];
			}
		}
		editSubm["_id"] = [...data.editDataID];
		console.log("EDIT SUBMISSION");
		console.log(editSubm);
		console.log(data.songData);
		$http.post("/editMusic", editSubm).then(function(resp) {
			console.log("edit request ok");
			var insertedData = resp.data.results;
			console.log(insertedData);
			//update local data with a search
			data.getSongData(undefined, undefined, undefined, true).then(function() {	//force update of new song data
				$timeout(function() {
					console.log("selecting old index");
					console.log($("#editSongSelect").data('uiSortableMultiSelectionState'));
					console.log(insertedData);
					console.log(insertedData.length);
					//select old updated data, if present
					$("#editSongSelect > .songItem").removeClass("ui-sortable-selected");
					for (var i = 0; i < insertedData.length; i ++) {
						var newIndex = data.songData.findIndex(function(p) { return p["_id"] == insertedData[i]["_id"]; })
						data.songIndices.push(newIndex);
						console.log(newIndex);
						$("#editSongSelect > .songItem").eq(newIndex).addClass("ui-sortable-selected");
						if (i == insertedData.length - 1) {
							$("#editSongSelect").data('uiSortableMultiSelectionState', {lastIndex: newIndex});
						}
					}
					console.log("trigger song change");
					var newSelection = $("#editSongSelect > .songItem.ui-sortable-selected");
					if (newSelection.length > 0) {
						newSelection.first()[0].scrollIntoView({	//scroll first element into view
							behavior: "smooth",
							block: "start",
							inline: "nearest"
						});
						$("#editSongSelect").trigger('ui-sortable-selectionschanged');
					}
				});
				$rootScope.$emit("songChanged", insertedData);
				//now do callback
				if (toCall != null) {
					console.log("callback");
					toCall(insertedData);
				}
			});
		}, function(err) {
			console.log(err);
			alert("Failed to edit music");
		});
	};
	data.removeSongs = function() {
		var idList = [];
		//sort selected indices in reverse, and remove
		data.songIndices.sort((a, b) => a-b);
		for (var i = data.songIndices.length - 1; i >= 0; i--) {
			idList.push(data.songData[data.songIndices[i]]["_id"]);
		}
		$http.post("/removeMusic", {"music": idList}).then(function(resp) {
			$rootScope.$emit("songsRemoved", idList);
			for (var i = data.songIndices.length - 1; i >= 0; i--) {
				var index = data.songIndices[i];
				data.songData.splice(index, 1);
				if (index < data.displayedSongData.length) {
					data.displayedSongData.splice(index, 1);
				}
			}
			data.clearSelected();
		}, function(err) {
			console.log(err);
			alert("Failed to remove music");
		});
	};
	return data;
}]);