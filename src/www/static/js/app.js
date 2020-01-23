// import {Spinner} from "spin.js";

var app = angular.module('MusicApp', ['ui.sortable', 'ui.sortable.multiselection', 'infinite-scroll', 'darthwade.loading']);

app.value('dispatcher', {

	callbacks: {},
	emit: function(event, data, f=null) {
		if (this.callbacks[event]) {
			this.callbacks[event].forEach(function (callback) {
				callback(data, f);
			})
		}
	},

	on: function(event, callback) {
		if (!this.callbacks[event]) {
			this.callbacks[event] = [];
		}

		this.callbacks[event].push(callback);
	}

});

app.factory("youtubeFuncs", ["$http", function($http) {
	var data = {};
	data.cleanUrl = function(id){
		// return /([a-zA-Z0-9_\-]+)/.test(id) && RegExp.lastParen;
		return id.match(/^.*(?:(?:youtu\.be\/|v\/|vi\/|u\/\w\/|embed\/)|(?:(?:watch)?\?v(?:i)?=|\&v(?:i)?=))([^#\&\?]*).*/)[1];
	};

	data.getThumbnail = function(item) {
		// console.log("THUMBNAIL");
		// console.log(item);
		if (item.url) {
			return "https://img.youtube.com/vi/" + data.cleanUrl(item.url) + "/0.jpg";
		}
	}

	// data.download = function(query) {
	// 	console.log("DOWNLOAD");
	// 	$http.post("/download", {"name": query.name, "songs": query.songs, "type": query.format}).then(function(resp) {
	// 		console.log(resp);
	// 	}, function(err) {
	// 		console.log(err);
	// 	});
	// }
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

	//ordering function
	//TODO: make this a stable sort? https://stackoverflow.com/questions/24678527/is-backbonejs-and-angularjs-sorting-stable
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

app.factory("songDatashare", ["$compile", "$timeout", "$http", "sortingFuncs", "dispatcher", function($compile, $timeout, $http, sortingFuncs, dispatcher) {
	var VARIES = "<varies>";
	var data = {};
	//tab info
	data.tab = "#existingSongSearch";	//#existingSongSearch or #addNewSong
	data.listTemplateId = "";
	data.loadListTemplate = function(targetId, $scope) {
		if (data.listTemplateId != "" && data.listTemplateId != targetId){
		// if (data.listTemplateId != "") {
			$(data.listTemplateId).empty();
		}
		if (data.listTemplateId != targetId) {		//or should it always recompile?
			//load template
			data.listTemplateId = targetId;
			data.songIndices = [];
			data.tab = "#existingSongSearch";
			$(targetId).load("/shared/list_edit_song.html", function() {
				$compile($(targetId).contents())($scope);
			});
		}
		//$templateRequest does not work for some reason; fails to bind properly
	};
	//song data below
	data.songData = [];
	data.songIndices = [];
	data.orderVar = "date";
	data.reverse = true;
	data.sortBy = function(propertyName, preserveOrder=false) {
		var res = sortingFuncs.sortBy(data.songData, data.reverse, data.orderVar, propertyName, preserveOrder);
		data.reverse = res["reverse"];
		data.orderVar = res["orderVar"];
		data.songData = res["data"];
	};
	data.sortGlyph = function(type) {
		return sortingFuncs.sortGlyph(data.reverse, data.orderVar, type);
	};
	// data.songSortable = uiSortableMultiSelectionMethods.extendOptions({
	// 	refreshPositions: true
	// });
	data.clearSelected = function() {
		console.log("datashare clearing");
		$("#editSongSelect > .ui-sortable-selected").removeClass("ui-sortable-selected");
		data.songIndices = [];
	};
	//edit data below
	data.editTemplateId = "";
	data.editData = {};	//store the edit song info here
	data.editDataID = [];	//store the edit song IDs here
	data.origEditData = [];	//TODO: replace this with only URL instead; no need to store an entire copy
	// data.playem = null;	//store the preview player info here
	data.playem = new Playem();
	data.loadEditTemplate = function(targetId, $scope, toAdd=null, force=false, callback=null) {
		if ((data.editTemplateId != "" && data.editTemplateId != targetId) || force) {
		// if (data.editTemplateId != "") {
			$(data.editTemplateId).empty();
		}
		force = true;
		if (data.editTemplateId != targetId || force) {
			console.log("loading edit template");
			data.editTemplateId = targetId;
			//unload playem
			data.stopPlayem();
			//set new data
			if (toAdd != null) {
				data.setEditData(toAdd);
			}
			else {
				data.resetEdit();
			}
			//load and compile
			$(targetId).load("/shared/editSong.html", function() {
				//load playem
				var config = {
					playerContainer: document.getElementById("previewDisplay")
				};
				data.playem.addPlayer(YoutubePlayer, config);	//TODO: ADD MORE PLAYERS HERE
				// data.playem = new Playem();
				// data.playem.addPlayer(YoutubePlayer, {playerContainer: document.getElementById("previewDisplay")});
				$timeout(function() {
					$compile($(targetId).contents())($scope);
					if (callback != null) {
						callback();
					}
				});
			});
		}
		else {
			data.stopPlayem();
			var config = {
				playerContainer: document.getElementById("previewDisplay")
			};
			data.playem.addPlayer(YoutubePlayer, config);
			//set new data
			if (toAdd != null) {
				data.setEditData(toAdd);
			}
			else {
				data.resetEdit();
			}
			if (callback != null) {
				console.log("callback");
				callback();
			}
		}
	};
	data.stopPlayem = function() {
		$("#previewDisplay").empty();	//stops loading of video if stopping early
		if (data.playem != null) {
			data.playem.stop();
			data.playem.clearQueue();
			data.playem.clearPlayers();
			console.log(data.playem.getPlayers());
			// delete data.playem;
		}
	};
	data.resetEdit = function() {
		data.editData = {"url": "", "type": "youtube", "name": "", "artist": [], "album": "", "genre": "", "vol": 100, "start": 0, "end": 0};
		data.editDataID = [];
		data.origEditData = [{"url": "", "type": "youtube", "name": "", "artist": [], "album": "", "genre": "", "vol": 100, "start": 0, "end": 0}];
	};
	data.setEditData = function(dataToCopy) {
		if (dataToCopy.length == 1) {
			data.editData = angular.copy(dataToCopy[0]);
			if ("_id" in data.editData) {
				data.editDataID = [data.editData["_id"]];
			}
			data.origEditData = [angular.copy(dataToCopy[0])];
		}
		else {
			data.editDataID = [];
			data.origEditData = [];
			// data.editData = {"url": "", "type": "youtube", "name": "", "artist": [], "album": "", "genre": "", "vol": 100, "start": 0, "end": 0};
			data.editData = {};
			var keys = ["url", "type", "name", "artist", "album", "genre", "vol", "start", "end"];
			for (var i = 0; i < dataToCopy.length; i++) {
				if ("_id" in dataToCopy[i]) {
					data.editDataID.push(dataToCopy[i]["_id"]);
				}
				data.origEditData.push(angular.copy(dataToCopy[i]));
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
					}
					else if (!(key in data.editData)) {
						data.editData[key] = dataToCopy[i][key];
					}
				}
				// for (var k in keys) {
				// 	if (data.editData[key] == VARIES) {
				// 		continue;
				// 	}
				// 	else if (data.editData[key] == "") {
				// 		data.editData[key] = dataToCopy[i][key];
				// 	}
				// 	else if (data.editData[key] != dataToCopy[i][key]) {
				// 		data.editData[key] = VARIES;
				// 	}
				// }
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
					data.editData[key] = data.editData[key].split(";").filter(function(el) {return el;});
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
		console.log("edit data ok");
		return false;
	};
	data.addSong = function(toCall=null) {
		if (data.checkSongFields() || data.editDataID.length > 0) {
			return;
		}
		$http.post("/addMusic", data.editData).then(function(resp) {
			console.log("add music ok");
			console.log(resp);
			data.songData.push(resp["data"]);
			data.sortBy(data.orderVar, true);

			if (toCall != null) {
				toCall(resp["data"]);
			}
			data.resetEdit();
		}, function(err) {
			console.log(err);
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
		var toAddToOrigMapping = {};
		if (toAddList.length == 1 && data.origEditData.length == 1) {
			if (toAddList[0]["url"] != data.origEditData[0]["url"]) {
				return;
			}
			toAddToOrigMapping[0] = 0;
		}
		else if (toAddList.length > data.origEditData.length) {
			return;	//impossible to occur
		}
		else if (data.editData["url"] != VARIES) {
			return;	//can't have duplicate urls
		}
		else {
			//multiple urls; check if all toAddList urls are present
			var matched = false;
			for (var j = 0; j < toAddList.length; j ++) {
				for (var i = 0; i < data.origEditData.length; i ++) {
					if (data.origEditData[i]["url"] == toAddList[j]["url"]) {
						toAddToOrigMapping[j] = i;
						matched = true;
						break;
					}
				}
				if (!matched) {
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
			//add new song data
			data.songData = data.songData.concat(resp.data);
			data.sortBy(data.orderVar, true);
			if (toCall != null) {
				toCall(resp.data);
			}
			//don't reset data: will be reset on next load
		}, function(err) {
			console.log(err);
		});
	};
	data.editSong = function(toCall=null, fromList=false) {
		if (data.checkSongFields() || data.editDataID.length == 0) {
			return;
		}
		var editSubm = {}
		//decompose edit data for submission
		for (var key in data.editData) {
			if (data.editData[key] != VARIES) {
				editSubm[key] = data.editData[key];
			}
		}
		editSubm["_id"] = data.editDataID;
		console.log("EDIT SUBMISSION");
		console.log(editSubm);
		$http.post("/editMusic", editSubm).then(function(resp) {
			console.log("edit request ok");
			//only modify local data if editing song from the list view
			if (fromList) {
				// data.songData[data.songIndices] = resp["data"];
				// data.sortBy(data.orderVar, true);
				// //now select it
				// data.songIndices = [data.songData.findIndex(function(p) { return p["_id"] == resp["data"]["_id"]; })];
				// $("#editSongSelect > .songItem").eq(data.songIndices).click();
				// dispatcher.emit("songChanged", resp["data"]);
				var idIndices= {};
				for (var i = 0; i < resp.data.length; i ++) {
					idIndices[resp.data[i]["_id"]] = i;
				}
				//update local data
				for (var i = 0; i < data.songIndices.length; i ++) {
					data.songData[data.songIndices[i]] = resp.data[idIndices[data.songData[data.songIndices[i]]["_id"]]];
				}
				//sort
				data.sortBy(data.orderVar, true);
				//select the original indices
				data.songIndices = [];
				$("#editSongSelect > .songItem").removeClass("ui-sortable-selected");
				for (var i = 0; i < resp.data.length; i ++) {
					var newIndex = data.songData.findIndex(function(p) { return p["_id"] == resp.data[i]["_id"]; })
					data.songIndices.push(newIndex);
					$("#editSongSelect > .songItem").eq(newIndex).addClass("ui-sortable-selected");
				}
				$("#editSongSelect").trigger('ui-sortable-selectionschanged');
				dispatcher.emit("songChanged", resp.data);
			}
			//now do callback
			if (toCall != null) {
				console.log("callback");
				toCall(resp["data"]);
			}
		}, function(err) {
			console.log(err);
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
			dispatcher.emit("songsRemoved", idList);
			for (var i = data.songIndices.length - 1; i >= 0; i--) {
				data.songData.splice(data.songIndices[i], 1);
			}
			data.clearSelected();
		}, function(err) {
			console.log(err);
		});
	}
	return data;
}]);