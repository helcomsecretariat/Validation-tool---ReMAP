define([
	"dojo/_base/unload",
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/array",
	"dojo/on",
	"dojo/dom",
	"dojo/cookie",
	"dojo/json",
	"esri/IdentityManager",
	"esri/tasks/query", "esri/tasks/QueryTask",
	"widgets/dataSection",
	"dojo/domReady!"
], function(
	baseUnload, declare, lang, array, on, dom, cookie, JSON,
	esriId,
	Query, QueryTask,
	dataSection
) {
	return declare(null, {
		services: {},
		study_areas: null,
		dataset_categories: null,
		token: null,
		constructor: function() {
			var cred = "esri_jsapi_id_manager_data";
			//baseUnload.addOnUnload(storeCredentials);
			//loadCredentials();
			
			/*on(dojo.byId("logoutButton"), "click", function() {
				console.log("logout");
				esriId.destroyCredentials();
			});*/
			
			/*function loadCredentials() {
				var idJson, idObject;

				if (supports_local_storage()) {
					// read from local storage
					idJson = window.localStorage.getItem(cred);
					console.log("idJson localStorage ", idJson);
				}
				else {
					// read from a cookie
					idJson = cookie(cred);
					console.log("idJson cookie ", idJson);
				}

				if (idJson && idJson != "null" && idJson.length > 4) {
					idObject = JSON.parse(idJson);
					esriId.initialize(idObject);
					console.log("init");
				}
				else {
					console.log("didn't find anything to loadĄ");
				}
			}

			function storeCredentials() {
				// make sure there are some credentials to persist
				if (esriId.credentials.length === 0) {
					return;
				}

				// serialize the ID manager state to a string
				var idString = JSON.stringify(esriId.toJson());
				// store it client side
				if (supports_local_storage()) {
					// use local storage
					window.localStorage.setItem(cred, idString);
					//console.log("wrote to local storage");
				}
				else {
					// use a cookie
					cookie(cred, idString, {expires: 1});
					//console.log("wrote a cookie :-/");
				}
			}

			function supports_local_storage(){
				try {
					return "localStorage" in window && window["localStorage"] !== null;
				} catch (e) {
					return false;
				}
			}*/
			
			fetch(windowUrl + appVersion + "/config/config.json")
				.then(lang.hitch(this, function(response) {
					return response.text();
				}))
				.then(lang.hitch(this, function(text) {
					let resp = JSON.parse(text);
					if (resp.hasOwnProperty("services")) {
						this.services = resp["services"];
						/*if (this.services.hasOwnProperty("get_datasets")) {
							//this.getDatasets(this.services.get_datasets);
						}
						else {
							alert("get_datasets service does exist in config file. Try to reload page and run the tool again. Contact administrator at data@helcom.fi if the alert appears again.");
						}*/
					}
					else {
						alert("services does exist in config file. Try to reload page and run the tool again. Contact administrator at data@helcom.fi if the alert appears again.");
					}
					if (resp.hasOwnProperty("study_areas")) {
						this.study_areas = resp["study_areas"];
					}
					else {
						alert("study_areas does exist in config file. Try to reload page and run the tool again. Contact administrator at data@helcom.fi if the alert appears again.");
					}
					if (resp.hasOwnProperty("dataset_categories")) {
						this.dataset_categories = resp["dataset_categories"];
					}
					else {
						alert("dataset_categories does exist in config file. Try to reload page and run the tool again. Contact administrator at data@helcom.fi if the alert appears again.");
					}
					if ((this.services != null) && (this.study_areas != null)) {
						//this.getDatasets(this.services.get_datasets);
						new dataSection({services: this.services, study_areas: this.study_areas, dataset_categories: this.dataset_categories});
						document.getElementById("loadingCover").style.display = "none";
					}	
					
				}));
		},
		
		/*getDatasets: function(url) {
			let queryTask = new QueryTask(url);
			let query = new Query();
			query.returnGeometry = false;
			query.outFields = ["*"];
			query.where = "category_id=2";
			query.orderByFields = ["name"];
			queryTask.execute(query, 
				lang.hitch(this, function (recordSet) {
					let datasets = [];
					array.forEach(recordSet.features, lang.hitch(this, function(feature) {
						datasets.push({id: feature.attributes.id, name: feature.attributes.name, description: feature.attributes.description, code: feature.attributes.code});
					}));
					document.getElementById("loadingCover").style.display = "none";
					if (this.token != null) {
						new dataSection({services: this.services, study_areas: this.study_areas, dataset_categories: this.dataset_categories, token: this.token, datasets: datasets});
					}
				}),
				lang.hitch(this, function (error) {
					console.log(error);
					this.setErrorMessage("ERROR: Server error (get_datasets). Reason: " + error + " <br/>Try to reload the page.");
					document.getElementById("loadingCover").style.display = "none";
				})
			);

			this.getToken();
		},
		
		getToken: function() {
			if (esriId.hasOwnProperty("credentials")) {
				array.forEach(esriId.credentials, lang.hitch(this, function(cred) {
					if ((cred.hasOwnProperty("scope")) && (cred.hasOwnProperty("token"))) {
						if (cred.scope == "server") {
							this.token = cred.token;
							console.log(esriId.credentials);
						}	
					}	
				}));
			}
		},*/
		
		setErrorMessage(message) {
			document.getElementById("errorMessage").innerHTML = message;
		}
	});
});
