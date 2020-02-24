// import {Spinner} from "spin.js";

var app = angular.module('MusicApp', ['ui.sortable', 'ui.sortable.multiselection', 'infinite-scroll', 'darthwade.loading']);

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
		ret = "icon icon-arrow-" + (reverse ? "down" : "up");
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
			reverse = (propertyName !== null && orderVar === propertyName) ? !reverse : false;
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
		// if (oldListTemplate != null && oldListTemplate["childScope"]) {
		// 	console.log("destroying old list template");
		// 	oldListTemplate["childScope"].$destroy();
		// }
		// oldListTemplate = $scope;
		// $scope["listTemplateDiv"] = targetId;
		// console.log("LIST TEMPLATE SCOPE SET");
		// console.log($scope);
		// // if (data.listTemplateId != "" && data.listTemplateId != targetId){	//always empty
		// if (data.listTemplateId != "") {
		// 	$(data.listTemplateId).empty();
		// }
		// // if (data.listTemplateId != targetId) {		//or should it always recompile?
		// 	//load template
			data.listTemplateId = targetId;
		// 	data.songIndices = [];
		// 	data.tab = "#existingSongSearch";
		// 	$(targetId).load("/shared/list_edit_song.html", function() {
		// 		console.log("compiling template");
		// 		console.log($scope.$id);
		// 		$compile($(targetId).contents())($scope);
		// 	});
		// // }
		// //$templateRequest does not work for some reason; fails to bind properly
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
			if (data.curQuery == null) {
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
		// data.curPage = page;
		// if (data.curPage == 0) {
		// 	data.songData = [];	//clear old data, since loading page 0
		// }
		// else if (page * SONG_PAGE_SIZE > data.totalResults) {
		// 	console.log("requested page more than limit");
		// 	return;
		// }
		// if (data.scrollBusy) {
		// 	console.log("busy");
		// 	return;
		// }
		//set busy, and set the new defaults
		// data.scrollBusy = true;
		
		query["sortby"] = sortBy;
		query["descend"] = descending;
		// query["page"] = page;
		return $http.post("/findMusic", query).then(function(resp) {
			console.log("got song data");
			console.log(resp);
			// data.songData = data.songData.concat(resp.data.results);
			data.songData = resp.data.results;
			data.totalResults = resp.data.count;
			// if (data.curPage == 0) {
				// data.clearSelected();
			// }
			// data.curPage ++;
			// data.scrollBusy = false;
			curIndex = 0;
			data.displayedSongData = [];
			data.dataNotReady = false;
			$timeout(data.loadDisplayedSongData(), 20);
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
	data.displayedSongData = [];
	data.loadDisplayedSongData = function() {
		// if (scrollBusy) {
		// 	return;
		// }
		// scrollBusy = true;
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
	var oldEditTemplate = null;
	data.loadEditTemplate = function(targetId, $scope, toAdd=null, callback=null) {
		// if (oldEditTemplate != null && oldEditTemplate["childScope"]) {
		// 	console.log("destroying old edit template");
		// 	oldEditTemplate["childScope"].$destroy();
		// }
		// oldEditTemplate = $scope;
		// $scope["editTemplateDiv"] = targetId;
		// console.log("SETTING SCOPE");
		// console.log($scope);
		// // force = true;
		// // if ((data.editTemplateId != "" && data.editTemplateId != targetId) || force) {
		// if (data.editTemplateId != "") {
		// 	$(data.editTemplateId).empty();
		// }
		// // if (data.editTemplateId != targetId || force) {
		// 	console.log("loading edit template");
			data.editTemplateId = targetId;
		// 	//set new data
		// 	if (toAdd != null) {
		// 		data.setEditData(toAdd);
		// 	}
		// 	else {
		// 		data.resetEdit();
		// 	}
		// 	//load and compile
		// 	$(targetId).load("/shared/editSong.html", function() {
		// 		//stop and load playem
		// 		data.reloadPlayem();
		// 		$timeout(function() {
		// 			$compile($(targetId).contents())($scope);
		// 			if (callback != null) {
		// 				callback();
		// 			}
		// 		});
		// 	});
		// // }
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
		data.editData = {"url": "", "type": "youtube", "name": "", "artist": [], "album": "", "genre": "", "vol": 100, "start": 0, "end": 0};
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
	data.checkSongFields = function() {	//check fields of editted data before pushing; returns true if a field is bad
		// console.log("checking edit song fields");
		// console.log(data.editData);
		var reqKeys = ["url", "type", "name", "artist"];
		var mediaTypes = ["youtube"];
		for (var i = 0; i < reqKeys.length; i ++) {
			var key = reqKeys[i];
			if (data.editData[key] == undefined || data.editData[key] == "") {
				// console.log(key + " is bad");
				return true;
			}
			if (key == "type") {
				//force to lowercase
				data.editData[key] = data.editData[key].toLowerCase();
				if (!mediaTypes.includes(data.editData[key])) {
					return true;
				}
			}
			if (key == "artist") {
				//force to array if str
				if (typeof data.editData[key] === "string" || data.editData[key] instanceof String) {
					var tempArtistStr = data.editData[key].trim();
					if (tempArtistStr.charAt(tempArtistStr.length - 1) == ",") {
						return true;
					}
					data.editData[key] = data.editData[key].split(",").filter(function(el) {return el;});
				}
			}
		}
		//unrequired keys
		if (data.editData["album"] != undefined) {
			data.editData["album"] = String(data.editData["album"]);
		}
		else {
			data.editData["album"] = "";
		}
		if (data.editData["genre"] != undefined) {
			data.editData["genre"] = String(data.editData["genre"]);
		}
		else {
			data.editData["genre"] = "";
		}
		if (data.editData["vol"] != undefined) {
			if (isNaN(parseInt(data.editData["vol"]))) {
				data.editData["vol"] = 100;
			}
			else {
				data.editData["vol"] = parseInt(data.editData["vol"]);
			}
			if (data.editData["vol"] < 0) {
				data.editData["vol"] = 0;
			}
			if (data.editData["vol"] > 100) {
				data.editData["vol"] = 100;
			}
		}
		else {
			data.editData["vol"] = 100;	//default
		}
		if (data.editData["start"] != undefined) {
			if (isNaN(parseInt(data.editData["start"]))) {
				data.editData["start"] = 0;
			}
			else {
				data.editData["start"] = parseInt(data.editData["start"]);
			}
			if (data.editData["start"] < 0) {
				data.editData["start"] = 0;
			}
		}
		else {
			data.editData["start"] = 0;
		}
		if (data.editData["end"] != undefined) {
			if (isNaN(parseInt(data.editData["end"]))) {
				data.editData["end"] = 0;
			}
			else {
				data.editData["end"] = parseInt(data.editData["end"]);
			}
			if (data.editData["end"] < 0) {
				data.editData["end"] = 0;
			}
		}
		else {
			data.editData["end"] = 0;
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
			if (err.status == 403) {
				alert("Session timed out");
				$window.location.href = "/";
			}
			else {
				alert("Failed to add music; does it exist already?");
			}
		});
	};
	data.addMultipleSongs = function(toAddList, toCall=null) {
		if (data.checkSongFields()) {
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
		//now we have verified we have valid urls; time to collect editted fields
		var myQuery = [];
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
			if (err.status == 403) {
				alert("Session timed out");
				$window.location.href = "/";
			}
			else {
				alert("Failed to add music; perhaps it already exists?");
			}
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
					$("#editSongSelect > .songItem.ui-sortable-selected").first()[0].scrollIntoView({	//scroll first element into view
						behavior: "smooth",
						block: "start",
						inline: "nearest"
					});
					$("#editSongSelect").trigger('ui-sortable-selectionschanged');
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
			if (err.status == 403) {
				alert("Session timed out");
				$window.location.href = "/";
			}
			else {
				alert("Failed to edit music");
			}
		})
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
			if (err.status == 403) {
				alert("Session timed out");
				$window.location.href = "/";
			}
			else {
				alert("Failed to remove music");
			}
		});
	}
	return data;
}]);