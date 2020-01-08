// var app = angular.module('MusicApp', []);
var app = angular.module('MusicApp', ['ui.sortable', 'ui.sortable.multiselection']);
// app.config(["$controllerProvider", function($controllerProvider) {
// 	app.register = {
// 		controller: $controllerProvider.register
// 	};
// }]);
app.value('dispatcher', {

	callbacks: {},
	emit: function(event, data) {
		if (this.callbacks[event]) {
			this.callbacks[event].forEach(function (callback) {
				callback(data);
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

app.factory("songDatashare", ["$timeout", "$compile", function($timeout, $compile) {
	var data = {};
	//song data below
	data.songData = [];
	data.songIndices = [];
	//edit data below
	data.editTemplateId = "";
	data.editData = {};	//store the song info here
	data.playem = undefined;	//store the preview player info here
	data.loadEditTemplate = function(targetId, $scope) {
		console.log("loading edit template");
		//unload playem
		data.stopPlayem();
		if (data.editTemplateId != "") {
			//unload template
			$(data.editTemplateId).empty();
		}
		//load template
		data.editTemplateId = targetId;
		$(targetId).load("/shared/editSong.html");
		//clear old data
		data.editData = {};
		$timeout(function() {
			//build playem object
			console.log("adding playem");
			data.playem = new Playem();
			var config = {
				playerContainer: document.getElementById("previewDisplay")
			};
			data.playem.addPlayer(YoutubePlayer, config);	//ADD MORE PLAYERS HERE
			console.log("compiling edit template");
			$compile(angular.element(document.querySelector(targetId)).contents())($scope);
		}, 1000);
	};
	data.stopPlayem = function() {
		$("#previewDisplay").empty();	//stops loading of video if stopping early
		if (data.playem != undefined) {
			data.playem.stop();
			data.playem.clearQueue();
			delete data.playem;
		}
	}
	data.setEditData = function(dataToCopy) {
		data.editData = angular.copy(dataToCopy);
	}
	data.checkSongFields = function() {	//check fields of editted data before pushing; returns true if a field is bad
		console.log("checking edit song fields");
		console.log(data.editData);
		var reqKeys = ["url", "type", "name", "artist"];
		var mediaTypes = ["youtube"];
		for (var i = 0; i < reqKeys.length; i ++) {
			var key = reqKeys[i];
			if (data.editData[key] == undefined || data.editData[key] == "") {
				console.log(key + " is bad");
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
					data.editData[key] = data.editData[key].split(",").filter(function(el) {return el;});
				}
			}
		}
		//unrequired keys
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
	}
	return data;
}]);
// console.log("hi");
// angular.element('[ui-sortable]').on('ui-sortable-selectionschanged', function (e, args) {
//     console.log("selection changed");
// //     var $this = $(this);
// //     console.log($this);
// //     var selectedItemIndexes = $this.find('.ui-sortable-selected')//, .' + $this[0]["id"])
// //     .map(function(i, element){
// //       return $(this).index();
// //     })
// //     .toArray();
// //     console.log(selectedItemIndexes);

// //     //this gets the actual objects stored in elements
// //     // var selectedItems = $.map(selectedItemIndexes, function(i) {
// //     //   return $scope.list[i]
// //     // });
// //     // console.log(selectedItems);
// });