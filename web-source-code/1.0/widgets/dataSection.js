define([
	"dojo/_base/declare",
	"dojo/_base/lang", "dojo/on", "dojo/_base/array", "dojo/dom-construct", "dojo/dom-style",
	"dijit/Dialog", "dijit/form/Select", "dojo/data/ObjectStore", "dojo/store/Memory",
	"esri/tasks/Geoprocessor", "esri/request",
	"esri/tasks/query", "esri/tasks/QueryTask",
	"dojo/cookie",
	"dojo/json",
	"esri/IdentityManager",
	"dojo/domReady!"
], function(
	declare,
	lang, on, array, domConstruct, domStyle,
	Dialog, Select, ObjectStore, Memory,
	Geoprocessor, esriRequest,
	Query, QueryTask,
	cookie, JSON,
	esriId
){
	return declare(null, {
		token: null,
		userId: null,
		services: null,
		study_areas: null,
		dataset_categories: null,
		datasets_ids_for_area: [],
		datasets: [],
		categories: [],
		dataset_to_validate: {},
		input_dataset_path: null,
		area_select: null,
		selected_area: null,
		selected_area_name: null,
		category_select: null,
		selected_category: null,
		selected_category_name: null,
		output_folder: null,
		output_gdb: null,
		output_dataset_path: null,

		selected_file: null,
		featuretype_select: null,
		selected_wfs: null,
		selected_featuretype: null,

		upload_input_table: null,
		upload_output_table: null,
		upload_min_id: null,
		upload_max_id: null,
		spatial_type: null,
		out_fields: null,
		out_rows: null,

		constructor: function(params) {
			//this.datasets = params.datasets;
			this.services = params.services;
			this.study_areas = params.study_areas;
			this.dataset_categories = params.dataset_categories;
			//this.token = params.token;
			
			var cred = "esri_jsapi_id_manager_data";
			loadCredentials();
			
			on(dojo.byId("logout_menu"), "click", lang.hitch(this, function() {
				this.logout();
			}));
			
			on(dojo.byId("restart_menu"), "click", lang.hitch(this, function() {
				this.restartValidation();
			}));
			
			on(dojo.byId("back_button_up"), "click", lang.hitch(this, function() {
				this.newValidation();
			}));
			
			on(dojo.byId("new_validation_success_button"), "click", lang.hitch(this, function() {
				this.newValidation();
			}));
			
			on(dojo.byId("start_upload_button"), "click", lang.hitch(this, function() {
				dojo.byId("upload_container").style.display = "block";
				dojo.byId("start_upload_button").style.display = "none";
				dojo.byId("upload_title").innerHTML = "Provide a <strong>" + this.dataset_to_validate.name + " (" + this.dataset_to_validate.geometry + ")</strong> dataset for validation.";
				if (this.dataset_to_validate.geometry == "raster") {
					dojo.byId("upload_shp_button").style.display = "none";
					dojo.byId("upload_wfs_button").style.display = "none";
					dojo.byId("upload_tif_button").style.display = "block";
				}
				else {
					dojo.byId("upload_shp_button").style.display = "block";
					dojo.byId("upload_wfs_button").style.display = "block";
					dojo.byId("upload_tif_button").style.display = "none";
				}
				document.getElementById("errorMessage").scrollIntoView({ behavior: "smooth" });
			}));
			
			on(dojo.byId("upload_shp_button"), "click", lang.hitch(this, function() {
				this.resetUploadShpWfs();
				dojo.byId("wfs_container").style.display = "none";
				dojo.byId("tif_container").style.display = "none";
				dojo.byId("select_tif_input").value = "";
				dojo.byId("select_shp_input").value = "";
				dojo.byId("featuretype_select_container").style.display = "none";
				dojo.byId("select_wfs_input").value = "";
				dojo.byId("shp_container").style.display = "block";
			}));
			
			on(dojo.byId("upload_wfs_button"), "click", lang.hitch(this, function() {
				this.resetUploadShpWfs();
				dojo.byId("shp_container").style.display = "none";
				dojo.byId("tif_container").style.display = "none";
				dojo.byId("select_tif_input").value = "";
				dojo.byId("select_shp_input").value = "";
				dojo.byId("featuretype_select_container").style.display = "none";
				dojo.byId("select_wfs_input").value = "";
				dojo.byId("wfs_container").style.display = "block";
			}));
			
			on(dojo.byId("upload_tif_button"), "click", lang.hitch(this, function() {
				this.resetUploadShpWfs();
				dojo.byId("wfs_container").style.display = "none";
				dojo.byId("shp_container").style.display = "none";
				dojo.byId("select_tif_input").value = "";
				dojo.byId("select_shp_input").value = "";
				dojo.byId("featuretype_select_container").style.display = "none";
				dojo.byId("select_wfs_input").value = "";
				dojo.byId("tif_container").style.display = "block";
			}));
			
			on(dojo.byId("select_shp_input"), "change", lang.hitch(this, function() {
				this.resetUploadShpWfs();
				this.readSelectedZip();
			}));
			
			on(dojo.byId("select_tif_input"), "change", lang.hitch(this, function() {
				this.resetUploadShpWfs();
				this.readSelectedTif();
			}));
			
			on(dojo.byId("upload_shp_for_validation_button"), "click", lang.hitch(this, function() {
				dojo.byId("report_error_container").style.display = "none";
				this.uploadShpForValidation();
			}));
			
			on(dojo.byId("upload_tif_for_validation_button"), "click", lang.hitch(this, function() {
				dojo.byId("report_error_container").style.display = "none";
				this.uploadTifForValidation();
			}));
			
			on(dojo.byId("get_featuretypes_button"), "click", lang.hitch(this, function() {
				dojo.byId("report_error_container").style.display = "none";
				this.getWfsFeatureTypes();
			}));
			
			on(dojo.byId("upload_wfs_for_validation_button"), "click", lang.hitch(this, function() {
				if ((this.selected_wfs != null) && (this.selected_featuretype != null)) {
					this.getAttributesWfs();
				}
				else {
					this.showErrorMessage("WFS feature type is not selected.");	
				}	
			}));
			
			on(dojo.byId("validate_button"), "click", lang.hitch(this, function() {
				this.checkMandatoryFieldsMapping();
			}));
			
			function loadCredentials() {
				var idJson, idObject;

				if (supports_local_storage()) {
					// read from local storage
					idJson = window.localStorage.getItem(cred);
					//console.log("idJson localStorage ", idJson);
				}
				else {
					// read from a cookie
					idJson = cookie(cred);
					//console.log("idJson cookie ", idJson);
				}

				if (idJson && idJson != "null" && idJson.length > 4) {
					idObject = JSON.parse(idJson);
					esriId.initialize(idObject);
					//console.log("init");
				}
				/*else {
					console.log("didn't find anything to loadĄ");
				}*/
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
				/*else {
					// use a cookie
					cookie(cred, idString, {expires: 1});
					//console.log("wrote a cookie :-/");
				}*/
			}

			function supports_local_storage(){
				try {
					return "localStorage" in window && window["localStorage"] !== null;
				} catch (e) {
					return false;
				}
			}
			
			this.getCategories(this.services.get_categories_info);
			this.setupWfsFeaturetypesSelectList();
		},
		
		getCategories: function(url) {
			let queryTask = new QueryTask(url);
			let query = new Query();
			query.returnGeometry = false;
			query.outFields = ["*"];
			query.where = "1=1";
			query.orderByFields = ["name"];
			queryTask.execute(query, 
				lang.hitch(this, function (recordSet) {
					array.forEach(recordSet.features, lang.hitch(this, function(feature) {
						this.categories.push({id: feature.attributes.id, label: feature.attributes.name});
					}));
					document.getElementById("loadingCover").style.display = "none";
					this.getToken();
					this.setupAreaSelectList();
					this.setupCategorySelectList();
				}),
				lang.hitch(this, function (error) {
					console.log(error);
					this.setErrorMessage("ERROR: Server error (get_categories). Reason: " + error + " <br/>Try to reload the page.");
					document.getElementById("loadingCover").style.display = "none";
				})
			);

			
		},
		
		getToken: function() {
			if (esriId.hasOwnProperty("credentials")) {
				array.forEach(esriId.credentials, lang.hitch(this, function(cred) {
					if ((cred.hasOwnProperty("scope")) && (cred.hasOwnProperty("token"))) {
						if (cred.scope == "server") {
							this.token = cred.token;
							this.userId = cred.userId;
							dojo.byId("logged_menu").innerHTML = "Logged in user: " + cred.userId;
							dojo.byId("logout_menu").style.display = "inline";
							console.log("getToken", esriId.credentials);
						}	
					}	
				}));
			}
		},
		
		logout: function() {
			esriId.destroyCredentials();
			location.reload();
		},
		
		linkify: function(text) {
			if (text) {
				let urlRegex =/(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
				return text.replace(urlRegex, function(url) {
	      	return '<a href="' + url + '" target="_blank">' + url + '</a>';
	    	});
			}
			else {
				return text;
			}
		},
		
		setErrorMessage: function(message) {
			document.getElementById("errorMessage").innerHTML = message;
		},
		
		showErrorMessage: function(message) {
			let div = dojo.byId("report_error_container");
			domConstruct.empty(div);
			domConstruct.create("div", {"style": "color: red;", "innerHTML": message}, div, "last");
			div.style.display = "block";
		},
		
		restartValidation: function() {
			this.newValidation();
			this.datasets = [];
			domConstruct.empty(dojo.byId("dataset_list"));
			dojo.byId("dataset_select_container").style.display = "none";
			dojo.byId("category_container").style.display = "none";
			dojo.byId("area_container").style.display = "block";
			this.area_select.set("value", "No");
			this.category_select.set("value", "No");
		},
		
		resetUploadShpWfs: function() {
			dojo.byId("report_error_container").style.display = "none";
			domConstruct.empty(dojo.byId("report_error_container"));
			dojo.byId("upload_shp_for_validation_button").style.display = "none";
			dojo.byId("upload_tif_for_validation_button").style.display = "none";
			domConstruct.empty(dojo.byId("upload_report_container"));
			domConstruct.empty(dojo.byId("validate_report_container"));
			domConstruct.empty(dojo.byId("dataset_report_container"));
			domConstruct.empty(dojo.byId("save_report_container"));
			domConstruct.empty(dojo.byId("fields_container"));
			dojo.byId("upload_report_container").style.display = "none";
			dojo.byId("validate_report_container").style.display = "none";
			dojo.byId("dataset_report_container").style.display = "none";
			dojo.byId("save_report_container").style.display = "none";
			dojo.byId("filtering_container").style.display = "none";
			dojo.byId("query_input").value = "";
			dojo.byId("filtering_settings_container").style.display = "none";
			dojo.byId("fields_container").style.display = "none";
			dojo.byId("validate_button").style.display = "none";
			this.input_dataset_path = null;
		},
		
		resetValidation: function() {
			dojo.byId("filtering_container").style.display = "none";
			dojo.byId("query_input").value = "";
			dojo.byId("fields_container").style.display = "none";
			dojo.byId("validate_button").style.display = "none";
			dojo.byId("select_shp_input").value = "";
			dojo.byId("upload_shp_for_validation_button").style.display = "none";
			dojo.byId("upload_tif_for_validation_button").style.display = "none";
			dojo.byId("featuretype_select_container").style.display = "none";
			dojo.byId("select_wfs_input").value = "";
			for (const [name, props] of Object.entries(this.dataset_to_validate.fields)) {
				if (props.hasOwnProperty('mapped_attribute_name')) {
					delete this.dataset_to_validate.fields[name]['mapped_attribute_name'];
				}
				if (props.hasOwnProperty('mapped_domains')) {
					delete this.dataset_to_validate.fields[name]['mapped_domains'];
				}
			}
		},
		
		newValidation: function() {
			dojo.byId("dataset_select_container").style.display = "block";
			dojo.byId("dataset_container").style.display = "none";
			dojo.byId("validation_container").style.display = "none";
			dojo.byId("back_button_up").style.display = "none";
			dojo.byId("start_upload_button").style.display = "none";
			dojo.byId("upload_container").style.display = "none";
			dojo.byId("upload_title").innerHTML = "";
			dojo.byId("wfs_container").style.display = "none";
			dojo.byId("shp_container").style.display = "none";
			dojo.byId("tif_container").style.display = "none";
			dojo.byId("select_shp_input").value = "";
			dojo.byId("featuretype_select_container").style.display = "none";
			dojo.byId("select_wfs_input").value = "";
			this.resetUploadShpWfs();
			this.dataset_to_validate = {};
			this.output_dataset_path = null;
			dojo.byId("new_validation_success_button").style.display = "none";
		},
		
		setupAreaSelectList: function() {
			this.area_select = new Select({
				id: "areaSelect",
				class: "selectWidget"
			});
			this.area_select.placeAt(dojo.byId("area_select"));
			this.area_select.startup();
			
			let store = new Memory({
				data: [{id: "No", label: "-- Select an area"}]
			});
			for (const [key, value] of Object.entries(this.study_areas)) {
				store.data.push({id: key, label:  value["title"]});
			}
			let os = new ObjectStore({objectStore: store});
			this.area_select.setStore(os);
			
			on(this.area_select, "change", lang.hitch(this, function(val) {
				if (val != "No") {
					this.selected_area = val;
					this.selected_area_name = this.study_areas[val]["title"];
					this.output_folder = this.study_areas[val]["output_folder"];
				}
				else {
					this.selected_area = null;
					this.output_folder = null;
				}
			}));
			
			on(dojo.byId("confirm_area_button"), "click", lang.hitch(this, function() {
				if (this.selected_area != null) {
					dojo.byId("area_container").style.display = "none";
					dojo.byId("category_container").style.display = "block";
				}
			}));
			
			dojo.byId("area_container").style.display = "block";
		},
		
		setupCategorySelectList: function() {
			this.category_select = new Select({
				id: "categorySelect",
				class: "selectWidget"
			});
			this.category_select.placeAt(dojo.byId("category_select"));
			this.category_select.startup();
			
			let store = new Memory({
				data: [{id: "No", label: "-- Select a dataset category"}]
			});
			for (const [key, value] of Object.entries(this.dataset_categories)) {
				store.data.push({id: key, label:  value["title"]});
			}
			let os = new ObjectStore({objectStore: store});
			this.category_select.setStore(os);
			
			on(this.category_select, "change", lang.hitch(this, function(val) {
				if (val != "No") {
					this.selected_category = val;
					this.selected_category_name = this.dataset_categories[val]["title"];
					this.output_gdb = this.output_folder + "\\" + this.dataset_categories[val]["output_gdb"];
				}
				else {
					this.selected_category = null;
					this.output_gdb = null;
				}
			}));
			
			on(dojo.byId("confirm_category_button"), "click", lang.hitch(this, function() {
				if (this.selected_category != null) {
					dojo.byId("category_container").style.display = "none";
					this.getDatasetsForArea(this.selected_area);
					//this.getDatasets(this.selected_category);
				}
			}));
			
		},
		
		setupWfsFeaturetypesSelectList: function() {
			this.featuretype_select = new Select({
				id: "featuretypeSelect",
				class: "selectWidget"
			});
			this.featuretype_select.placeAt(dojo.byId("featuretype_select"));
			this.featuretype_select.startup();
			
			on(this.featuretype_select, "change", lang.hitch(this, function(val) {
				if (val != "No") {
					this.selected_featuretype = val;
				}
				else {
					this.selected_featuretype = null;
				}
			}));
		},
		
		getDatasetsForArea: function(study_area) {
			document.getElementById("loadingCover").style.display = "block";
			let queryTask = new QueryTask(this.services.get_datasets_for_areas);
			let query = new Query();
			query.returnGeometry = false;
			query.outFields = ["dataset_id"];
			query.where = "study_area_id="+study_area;
			queryTask.execute(query, 
				lang.hitch(this, function (recordSet) {
					let datasets_ids_for_area = [];
					array.forEach(recordSet.features, lang.hitch(this, function(feature) {
						datasets_ids_for_area.push(feature.attributes.dataset_id);
					}));
					this.getDatasets(this.selected_category, datasets_ids_for_area);
					//this.createDatasetList();
					
				}),
				lang.hitch(this, function (error) {
					console.log(error);
					this.setErrorMessage("ERROR: Server error (get_datasets_for_areas). Reason: " + error + " <br/>Try to reload the page.");
					document.getElementById("loadingCover").style.display = "none";
				})
			);

			
		},
		
		getDatasets: function(category, ids_for_area) {
			let queryTask = new QueryTask(this.services.get_datasets);
			let query = new Query();
			query.returnGeometry = false;
			query.outFields = ["*"];
			query.where = "category_id="+category;
			query.orderByFields = ["name"];
			queryTask.execute(query, 
				lang.hitch(this, function (recordSet) {
					array.forEach(recordSet.features, lang.hitch(this, function(feature) {
						if (ids_for_area.includes(feature.attributes.id)) {
							this.datasets.push({id: feature.attributes.id, name: feature.attributes.name, description: feature.attributes.description, code: feature.attributes.code});
						}	
						
					}));
					this.createDatasetList();
				}),
				lang.hitch(this, function (error) {
					console.log(error);
					this.setErrorMessage("ERROR: Server error (get_datasets). Reason: " + error + " <br/>Try to reload the page.");
					document.getElementById("loadingCover").style.display = "none";
				})
			);

			
		},
		
		createDatasetList: function() {
			let div_dataset_list = dojo.byId("dataset_list");
			dojo.byId("dataset_list_message").innerHTML = "These " + this.selected_category_name + " datasets are reported for " + this.selected_area_name + ". Select a dataset to validate.";
			array.forEach(this.datasets, lang.hitch(this, function(dataset) {
				let div_frame = domConstruct.create("div", {"style": "border: 1px dashed #cccccc; margin: 3px 0px 3px 20px; padding: 3px;"}, div_dataset_list, "last");
				domConstruct.create("div", {"style": "font-size: 14px; font-weight: bold", "innerHTML": dataset.name}, div_frame, "last");
				domConstruct.create("div", {"innerHTML": this.linkify(dataset.description)}, div_frame, "last");
				let div_select_dataset_button = domConstruct.create("div", {"style": "margin-top: 5px", "class": "mainLink", "innerHTML": "Validate"}, div_frame, "last");
				on(div_select_dataset_button, "click", lang.hitch(this, function() {
					document.getElementById("errorMessage").scrollIntoView({ behavior: "smooth" });
					this.dataset_to_validate.userId = this.userId;
					this.dataset_to_validate.name = dataset.name;
					this.createGeometrySelectContainer(dataset);
				}));
			}));
			dojo.byId("dataset_select_container").style.display = "block";
			document.getElementById("loadingCover").style.display = "none";
		},
		
		createGeometrySelectContainer: function(dataset) {
			let queryTask = new QueryTask(this.services.get_geometries);
			let query = new Query();
			query.returnGeometry = false;
			query.outFields = ["*"];
			query.where = "dataset_id=" + dataset.id;
			document.getElementById("loadingCover").style.display = "block";
			queryTask.execute(query, 
				lang.hitch(this, function (recordSet) {
					//console.log(recordSet);
					let geometries = [];
					dojo.byId("dataset_select_container").style.display = "none";
					dojo.byId("back_button_up").style.display = "block";
					let div_dataset_container = dojo.byId("dataset_container");
					domConstruct.empty(div_dataset_container);
					
					domConstruct.create("div", {"style": "font-size: 14px; font-weight: bold;", "innerHTML": dataset.name}, div_dataset_container, "last");
					domConstruct.create("div", {"innerHTML": this.linkify(dataset.description)}, div_dataset_container, "last");
					let div_geometry_select = domConstruct.create("div", {}, div_dataset_container, "last");
					
					if (recordSet.features.length > 0) {
						domConstruct.create("div", {"style": "margin-top: 10px; color: rgb(128, 0, 0);", "innerHTML": "Select dataset geometry to validate:"}, div_geometry_select, "last");
					
						array.forEach(recordSet.features, lang.hitch(this, function(feature) {
							let div_geometry_button = domConstruct.create("span", {"style": "margin-top: 5px; margin-right: 10px;", "class": "mainLink", "innerHTML": feature.attributes.geometry}, div_geometry_select, "last");
							on(div_geometry_button, "click", lang.hitch(this, function() {
								
								this.dataset_to_validate.geometry = feature.attributes.geometry;
								div_geometry_select.style.display = "none";
								if (feature.attributes.geometry != "raster") {
									this.output_dataset_path = this.output_gdb + "\\" + dataset.code + "_" + feature.attributes.geometry;
									this.getAttributesForDataset(dataset.name, feature.attributes);
								}
								else {
									this.output_dataset_path = this.output_gdb + "\\" + dataset.code + "_" + feature.attributes.geometry + "_" + this.userId;
									dojo.byId("start_upload_button").style.display = "block";
									domConstruct.create("div", {"style": "margin-top: 10px; color: rgb(128, 0, 0);", "innerHTML": "Click button below to start validation."}, dojo.byId("dataset_container"), "last");
								}
							}));
						}));
					}
					else {
						domConstruct.create("div", {"style": "margin-top: 10px; color: rgb(128, 0, 0);", "innerHTML": "Dataset not possible to validate."}, div_geometry_select, "last");
					}
					div_dataset_container.style.display = "block";
					dojo.byId("validation_container").style.display = "block";
					document.getElementById("loadingCover").style.display = "none";
					
				}),
				lang.hitch(this, function (error) {
					console.log(error);
					this.setErrorMessage("ERROR: Server error (get_geometries). Reason: " + error + " <br/>Try to reload the page.");
					document.getElementById("loadingCover").style.display = "none";
				})
			);
			
		},
		
		getAttributesForDataset: function(dataset_name, dataset_geometry) {
			let queryTask = new QueryTask(this.services.get_attributes);
			let query = new Query();
			query.returnGeometry = false;
			query.outFields = ["*"];
			query.where = "dataset_geometry_id=" + dataset_geometry.id;
			document.getElementById("loadingCover").style.display = "block";
			queryTask.execute(query, 
				lang.hitch(this, function (recordSet) {
					//console.log(recordSet);
					let div_dataset_container = dojo.byId("dataset_container");
					//let div_attributes_container = domConstruct.create("div", {}, div_dataset_container, "last");
										
					if (recordSet.features.length > 0) {
						this.dataset_to_validate.fields = {};
						domConstruct.create("div", {"style": "margin-top: 10px; color: rgb(128, 0, 0);", "innerHTML": "Following attributes will be validated for <strong>" + dataset_name + " (" + dataset_geometry.geometry + ")</strong> dataset."}, div_dataset_container, "last");
						array.forEach(recordSet.features, lang.hitch(this, function(feature) {
							//let div_geometry_button = domConstruct.create("span", {"style": "margin-top: 5px; margin-right: 10px;", "class": "mainLink", "innerHTML": feature.attributes.geometry}, div_geometry_select, "last");
							//console.log(feature);
							this.getAttributeInfo(feature.attributes);
						}));
					}
					else {
						domConstruct.create("div", {"style": "margin-top: 10px; color: rgb(128, 0, 0);", "innerHTML": "No attributes required for <strong>" + dataset_name + " (" + dataset_geometry.geometry + ")</strong> dataset."}, div_dataset_container, "last");
					}
					
					document.getElementById("loadingCover").style.display = "none";
					dojo.byId("start_upload_button").style.display = "block";
				}),
				lang.hitch(this, function (error) {
					console.log(error);
					this.setErrorMessage("ERROR: Server error (get_geometries). Reason: " + error + " <br/>Try to reload the page.");
					document.getElementById("loadingCover").style.display = "none";
				})
			);
		},
		
		getAttributeInfo: function(dataset_geometry_attribute) {
			//console.log(dataset_geometry_attribute);
			let queryTask = new QueryTask(this.services.get_attribute_info);
			let query = new Query();
			query.returnGeometry = false;
			query.outFields = ["*"];
			query.where = "id=" + dataset_geometry_attribute.attribute_id;
			document.getElementById("loadingCover").style.display = "block";
			queryTask.execute(query, 
				lang.hitch(this, function (recordSet) {
					//console.log(recordSet);
					if (recordSet.features.length > 0) {
						//domConstruct.create("div", {"style": "margin-top: 10px; color: rgb(128, 0, 0);", "innerHTML": "Following attributes will be validated for <strong>" + dataset_name + " (" + dataset_geometry.geometry + ")</strong> dataset."}, div_dataset_container, "last");
						let div_dataset_container = dojo.byId("dataset_container");
						let div_attributes_container = domConstruct.create("div", {"style": "margin-left: 10px;"}, div_dataset_container, "last");
						array.forEach(recordSet.features, lang.hitch(this, function(feature) {
							//console.log(feature);
							let name = feature.attributes.name;
							this.dataset_to_validate.fields[name] = {};
							let div_attribute_container = domConstruct.create("div", {"style": "border: 1px dashed #cccccc; margin: 3px 0px 3px 10px; padding: 3px;"}, div_attributes_container, "last");
							domConstruct.create("div", {"style": "font-size: 14px; font-weight: bold", "innerHTML": name}, div_attribute_container, "last");
							domConstruct.create("div", {"innerHTML": "description: " + feature.attributes.description}, div_attribute_container, "last");
							this.dataset_to_validate.fields[name]["mandatory"] = dataset_geometry_attribute.attribute_required;
							domConstruct.create("div", {"style": "margin-top: 5px", "innerHTML": "value is mandatory: <strong>" + dataset_geometry_attribute.attribute_required + "</strong>"}, div_attribute_container, "last");
							this.dataset_to_validate.fields[name]["type"] = feature.attributes.type;
							domConstruct.create("div", {"innerHTML": "data type: " + feature.attributes.type}, div_attribute_container, "last");
							if ((feature.attributes.type == "integer") || (feature.attributes.type == "float")) {
								this.dataset_to_validate.fields[name]["range"] = {
									"min": "-inf",
									"max": "inf"
								};
								//if ((feature.attributes.min != null) && (feature.attributes.min != "")) {
								if ((feature.attributes.min) || (feature.attributes.min === 0)) {
									//console.log("min if", feature.attributes.name, feature.attributes.min);
									this.dataset_to_validate.fields[name]["range"]["min"] = feature.attributes.min;
									domConstruct.create("div", {"innerHTML": "min value: " + feature.attributes.min}, div_attribute_container, "last");
								}
								//else {
								//	console.log("min else", feature.attributes.name, feature.attributes.min);
								//}
								if ((feature.attributes.max) || (feature.attributes.max === 0)) {
								//if ((feature.attributes.max != null) && (feature.attributes.max != "")) {
									this.dataset_to_validate.fields[name]["range"]["max"] = feature.attributes.max;
									domConstruct.create("div", {"innerHTML": "max value: " + feature.attributes.max}, div_attribute_container, "last");
								}
							}
							if ((feature.attributes.length != null) && (feature.attributes.length != "")) {
								this.dataset_to_validate.fields[name]["length"] = feature.attributes.length;
								domConstruct.create("div", {"innerHTML": "max length in characters: " + feature.attributes.length}, div_attribute_container, "last");
							}
							this.getCodesForAttribute(dataset_geometry_attribute.id, div_attribute_container, name);
						}));
					}
					else {
						domConstruct.create("div", {"style": "margin-top: 10px; color: rgb(128, 0, 0);", "innerHTML": "No attributes required for <strong>" + dataset_name + " (" + dataset_geometry.geometry + ")</strong> dataset."}, div_dataset_container, "last");
					}
					document.getElementById("loadingCover").style.display = "none";
					
				}),
				lang.hitch(this, function (error) {
					console.log(error);
					this.setErrorMessage("ERROR: Server error (get_geometries). Reason: " + error + " <br/>Try to reload the page.");
					dojo.byId("start_upload_button").style.display = "none";
					document.getElementById("loadingCover").style.display = "none";
				})
			);
		},
		
		getCodesForAttribute: function(dataset_geometry_attribute_id, div_attribute_container, dataset_name) {
			//console.log(dataset_geometry_attribute_id);
			let queryTask = new QueryTask(this.services.get_codes);
			let query = new Query();
			query.returnGeometry = false;
			query.outFields = ["*"];
			query.where = "dataset_geometry_attribute_id=" + dataset_geometry_attribute_id;
			document.getElementById("loadingCover").style.display = "block";
			queryTask.execute(query, 
				lang.hitch(this, function (recordSet) {
					if (recordSet.features.length > 0) {
						this.dataset_to_validate.fields[dataset_name]["domain"] = [];
						domConstruct.create("div", {"style": "color: rgb(128, 0, 0);", "innerHTML": "Possible attribute values for all sea areas:"}, div_attribute_container, "last");
						array.forEach(recordSet.features, lang.hitch(this, function(feature) {
							this.getCodeInfo(feature.attributes.code_id, div_attribute_container, dataset_name);
						}));
					}
					document.getElementById("loadingCover").style.display = "none";
					
				}),
				lang.hitch(this, function (error) {
					console.log(error);
					this.setErrorMessage("ERROR: Server error (get_geometries). Reason: " + error + " <br/>Try to reload the page.");
					dojo.byId("start_upload_button").style.display = "none";
					document.getElementById("loadingCover").style.display = "none";
				})
			);
		},
		
		getCodeInfo: function(id, div_attribute_container, dataset_name) {
			let queryTask = new QueryTask(this.services.get_code_info);
			let query = new Query();
			query.returnGeometry = false;
			query.outFields = ["*"];
			query.where = "id=" + id;
			document.getElementById("loadingCover").style.display = "block";
			queryTask.execute(query, 
				lang.hitch(this, function (recordSet) {
					//console.log(recordSet);
					if (recordSet.features.length > 0) {
						array.forEach(recordSet.features, lang.hitch(this, function(feature) {
							this.dataset_to_validate.fields[dataset_name]["domain"].push(feature.attributes.name);
							/*let div_code_container = domConstruct.create("div", {"style": "border: 1px dashed #cccccc; margin: 3px 0px 3px 10px; padding: 3px;"}, div_attribute_container, "last");
							domConstruct.create("div", {"style": "font-size: 14px; font-weight: bold", "innerHTML": feature.attributes.name}, div_code_container, "last");
							domConstruct.create("div", {"innerHTML": "description: " + feature.attributes.description}, div_code_container, "last");
							domConstruct.create("div", {"innerHTML": "vocabulary info: " + feature.attributes.URL}, div_code_container, "last");*/
							domConstruct.create("div", {"style": "font-size: 12px; font-weight: bold; margin-left: 5px;", "innerHTML": feature.attributes.name}, div_attribute_container, "last");
						}));
					}
					else {
						//domConstruct.create("div", {"style": "margin-top: 10px; color: rgb(128, 0, 0);", "innerHTML": "No attributes required for <strong>" + dataset_name + " (" + dataset_geometry.geometry + ")</strong> dataset."}, div_dataset_container, "last");
					}
					document.getElementById("loadingCover").style.display = "none";
				}),
				lang.hitch(this, function (error) {
					console.log(error);
					this.setErrorMessage("ERROR: Server error (get_geometries). Reason: " + error + " <br/>Try to reload the page.");
					dojo.byId("start_upload_button").style.display = "none";
					document.getElementById("loadingCover").style.display = "none";
				})
			);
		},
		
		readSelectedZip: function() {
			let input_file = dojo.byId("select_shp_input");
			if (input_file.files.length) {
				let selected_file = input_file.files[0];
				let ext = selected_file.name.split('.').at(-1);
				if (ext.toLowerCase() == "zip") {
					let zip = new JSZip();
					zip.loadAsync(selected_file).then(lang.hitch(this, function(zip) {
						let shpCount = 0;
						let dbfCount = 0;
						let shxCount = 0;
						for (let filename of Object.keys(zip.files)) {
							const ld = filename.lastIndexOf('.');
							const ext = filename.substring(ld + 1);
							if (ext == "shp") {
								shpCount += 1;
							}
							if (ext == "shx") {
								shxCount += 1;
							}
							if (ext == "dbf") {
								dbfCount += 1;
							}
						}
						if ((shpCount == 1) && (shxCount == 1) && (dbfCount == 1)) {
							dojo.byId("upload_shp_for_validation_button").style.display = "block";
						}
						else {
							this.showErrorMessage("ERROR: There is more than one Shapefile in the uploaded ZIP or there are missing required shp, shx or dbf files in uploaded ZIP. Please, select a ZIP archive with 1 Shapefile.");
						}	
					}), lang.hitch(this, function(error) {
						console.log(error);
						this.showErrorMessage("ERROR: Not a valid ZIP archive. Please, select a ZIP archive with 1 Shapefile.");
					}));
				}
				else {
					this.showErrorMessage("ERROR: Not a ZIP archive selected. Please, select a ZIP archive with 1 Shapefile.");
				}
			}
			else {
				this.showErrorMessage("ERROR. Can't read uploaded file.");
				dojo.byId("report_error_container").style.display = "block";
			}
		},
		
		uploadShpForValidation: function() {
			let selected_file = dojo.byId("select_shp_input").files[0];
			document.getElementById("loadingCover").style.display = "block";
			const formData = new FormData();
			formData.append("file", selected_file);
			formData.append("f", "json");
			formData.append("token", this.token);
			const options = {
				method: 'POST',
				body: formData
			};

			fetch(this.services.upload_file, options)
				.then(lang.hitch(this, function(response) {
					return response.text();
				}))
				.then(lang.hitch(this, function(text) {
					let resp = JSON.parse(text);
					if (resp.error) {
						this.showErrorMessage("ERROR. Selected file was not uploaded to the server. Something went wrong. " + resp.error.message + " Please report it to data@helcom.fi.");
						document.getElementById("loadingCover").style.display = "none";
					}
					else {
						if (resp.hasOwnProperty("item")) {
							if (resp.item.hasOwnProperty("itemName")) {
								if (resp.item.hasOwnProperty("itemID")) {
									this.getAttributesShp(resp.item.itemID);
								}
								else {
									this.showErrorMessage("ERROR. Upload didn't succeed (item.itemID error). Please report it to data@helcom.fi.");
									document.getElementById("loadingCover").style.display = "none";
								}
							}
							else {
								this.showErrorMessage("ERROR. Upload didn't succeed (item.itemName error). Please report it to data@helcom.fi.");
								document.getElementById("loadingCover").style.display = "none";
							}
						}
						else {
							this.showErrorMessage("ERROR. Upload didn't succeed (item error). Please report it to data@helcom.fi.");
							document.getElementById("loadingCover").style.display = "none";
						}
					}
				}));
		},
		
		readSelectedTif: function() {
			let input_file = dojo.byId("select_tif_input");
			if (input_file.files.length) {
				let selected_file = input_file.files[0];
				let ext = selected_file.name.split('.').at(-1);
				if (ext.toLowerCase() == "zip") {
					let zip = new JSZip();
					zip.loadAsync(selected_file).then(lang.hitch(this, function(zip) {
						let tifCount = 0;
						for (let filename of Object.keys(zip.files)) {
							const ld = filename.lastIndexOf('.');
							const ext = filename.substring(ld + 1);
							if (ext == "tif") {
								tifCount += 1;
							}
						}
						if (tifCount == 1) {
							dojo.byId("upload_tif_for_validation_button").style.display = "block";
						}
						else {
							this.showErrorMessage("ERROR: Possible reasons: 1) TIF file is in the folder. 2) There is no TIF file in uploaded ZIP. 3) More than one TIF file in the uploaded ZIP. Please, select a ZIP archive with 1 TIF file.");
						}	
					}), lang.hitch(this, function(error) {
						console.log(error);
						this.showErrorMessage("ERROR: Not a valid ZIP archive. Please, select a ZIP archive with 1 TIF file.");
					}));
				}
				else {
					this.showErrorMessage("ERROR: Not a ZIP archive selected. Please, select a ZIP archive with 1 Shapefile.");
				}
			}
			else {
				this.showErrorMessage("ERROR. Can't read uploaded file.");
				dojo.byId("report_error_container").style.display = "block";
			}
		},
		
		uploadTifForValidation: function() {
			let selected_file = dojo.byId("select_tif_input").files[0];
			document.getElementById("loadingCover").style.display = "block";
			const formData = new FormData();
			formData.append("file", selected_file);
			formData.append("f", "json");
			formData.append("token", this.token);
			const options = {
				method: 'POST',
				body: formData
			};

			fetch(this.services.upload_file, options)
				.then(lang.hitch(this, function(response) {
					return response.text();
				}))
				.then(lang.hitch(this, function(text) {
					let resp = JSON.parse(text);
					if (resp.error) {
						this.showErrorMessage("ERROR. Selected file was not uploaded to the server. Something went wrong. " + resp.error.message + " Please report it to data@helcom.fi.");
						document.getElementById("loadingCover").style.display = "none";
					}
					else {
						if (resp.hasOwnProperty("item")) {
							if (resp.item.hasOwnProperty("itemName")) {
								if (resp.item.hasOwnProperty("itemID")) {
									this.validateTif(resp.item.itemID);
								}
								else {
									this.showErrorMessage("ERROR. Upload didn't succeed (item.itemID error). Please report it to data@helcom.fi.");
									document.getElementById("loadingCover").style.display = "none";
								}
							}
							else {
								this.showErrorMessage("ERROR. Upload didn't succeed (item.itemName error). Please report it to data@helcom.fi.");
								document.getElementById("loadingCover").style.display = "none";
							}
						}
						else {
							this.showErrorMessage("ERROR. Upload didn't succeed (item error). Please report it to data@helcom.fi.");
							document.getElementById("loadingCover").style.display = "none";
						}
					}
				}));
		},
		
		getWfsFeatureTypes: function() {
			this.selected_wfs = dojo.byId("select_wfs_input").value.trim();
			if (this.selected_wfs.includes('?')) {
				this.selected_wfs = this.selected_wfs.substr(0, this.selected_wfs.indexOf('?'));
			}
			document.getElementById("loadingCover").style.display = "block";
			console.log(this.selected_wfs);
			let gp = new Geoprocessor(this.services.get_featuretypes_wfs);
			let params = {
				"wfsurl": this.selected_wfs
			};
			gp.execute(params, lang.hitch(this, function(results, messages) {
				if (results && results != "null" && results.length == 2) {
					let general_report = null;
					let featuretypes = null;
					array.forEach(results, lang.hitch(this, function(res) {
						if (res.hasOwnProperty("paramName")) {
							
							if (res.paramName == "generalreport") {
								if (res.hasOwnProperty("value")) {
									general_report = res.value;
								}
							}
							if (res.paramName == "featuretypes") {
								if (res.hasOwnProperty("value")) {
									featuretypes = res.value;
								}
							}
						}
					}));
					if (general_report != null) {
						if (!general_report.error) {
							this.setWfsFeaturetypesForSelect(featuretypes);
						}
						else {
							if (general_report.infoMessages.length > 0) {
								this.displayReportMessages(general_report, dojo.byId("upload_report_container"));
							}
						}
					}
					else {
						this.showErrorMessage("ERROR. Get WFS feature types didn't succeed (results params error). Please report it to data@helcom.fi.");
					}
				}
				else {
					this.showErrorMessage("ERROR. Get WFS feature types didn't succeed (results length error). Please report it to data@helcom.fi.");
				}
				document.getElementById("loadingCover").style.display = "none";
			}),
			lang.hitch(this, function(error) {
				this.showErrorMessage("ERROR. Something went wrong when Get WFS feature types. " + error + " Please report it to data@helcom.fi.");
				document.getElementById("loadingCover").style.display = "none";
			}));
		},
		
		setWfsFeaturetypesForSelect: function(list) {
			let store = new Memory({
				data: [{id: "No", label: "-- Select a feature type"}]
			});
			array.forEach(list, lang.hitch(this, function(item) {
				store.data.push({id: item, label:  item});
			}));
			let os = new ObjectStore({objectStore: store});
			this.featuretype_select.setStore(os);
			dojo.byId("featuretype_select_container").style.display = "block";
		},
		
		getAttributesShp: function(id) {
			let gp = new Geoprocessor(this.services.get_attributes_shp);
			let params = {
				"shpzip": "{'itemID':'" + id + "'}",
				"geometry": this.dataset_to_validate.geometry
			};
			gp.execute(params, lang.hitch(this, function(results, messages) {
				if (results && results != "null" && results.length == 3) {
					let general_report = null;
					let fields = null;
					array.forEach(results, lang.hitch(this, function(res) {
						if (res.hasOwnProperty("paramName")) {
							
							if (res.paramName == "generalreport") {
								if (res.hasOwnProperty("value")) {
									general_report = res.value;
								}
							}
							if (res.paramName == "fields") {
								if (res.hasOwnProperty("value")) {
									fields = res.value;
								}
							}
							if (res.paramName == "datasetpath") {
								if (res.hasOwnProperty("value")) {
									this.input_dataset_path = res.value;
								}
							}
						}
					}));
					if (general_report != null) {
						if (!general_report.error) {
							this.displayFilteringSettings(fields, dojo.byId("filtering_container"));
						}
						else {
							if (general_report.infoMessages.length > 0) {
								this.displayReportMessages(general_report, dojo.byId("upload_report_container"));
							}
						}
					}
					else {
						this.showErrorMessage("ERROR. Get Shapefile attributes didn't succeed (results params error). Please report it to data@helcom.fi.");
					}
				}
				else {
					this.showErrorMessage("ERROR. Get Shapefile attributes didn't succeed (results length error). Please report it to data@helcom.fi.");
				}
				document.getElementById("loadingCover").style.display = "none";
			}),
			lang.hitch(this, function(error) {
				this.showErrorMessage("ERROR. Something went wrong when Get Shapefile attributes. " + error + " Please report it to data@helcom.fi.");
				document.getElementById("loadingCover").style.display = "none";
			}));
		},
		
		validateTif: function(id) {
			
			let gp = new Geoprocessor(this.services.validate_raster);
			let params = {
				"tifzip": "{'itemID':'" + id + "'}"
			};
			gp.execute(params, lang.hitch(this, function(results, messages) {
				if (results && results != "null" && results.length == 2) {
					let general_report = null;
					let intermediate_raster = null;
					array.forEach(results, lang.hitch(this, function(res) {
						if (res.hasOwnProperty("paramName")) {
							
							if (res.paramName == "generalreport") {
								if (res.hasOwnProperty("value")) {
									general_report = res.value;
								}
							}
							if (res.paramName == "datasetpath") {
								if (res.hasOwnProperty("value")) {
									intermediate_raster = res.value;
								}
							}
						}
					}));
					if (general_report != null) {
						if (!general_report.error) {
							//this.displayFilteringSettings(fields, dojo.byId("filtering_container"));
							this.displayRasterReport(intermediate_raster, dojo.byId("dataset_report_container"));
							//console.log(general_report);
							//console.log(this.input_dataset_path);
						}
						else {
							if (general_report.infoMessages.length > 0) {
								this.displayReportMessages(general_report, dojo.byId("upload_report_container"));
							}
						}
					}
					else {
						this.showErrorMessage("ERROR. Validate TIF didn't succeed (results params error). Please report it to data@helcom.fi.");
					}
				}
				else {
					this.showErrorMessage("ERROR. Validate TIF didn't succeed (results length error). Please report it to data@helcom.fi.");
				}
				document.getElementById("loadingCover").style.display = "none";
			}),
			lang.hitch(this, function(error) {
				this.showErrorMessage("ERROR. Something went wrong when Validate TIF. " + error + " Please report it to data@helcom.fi.");
				document.getElementById("loadingCover").style.display = "none";
			}));
		},
		
		getAttributesWfs: function() {
			document.getElementById("loadingCover").style.display = "block";
			let gp = new Geoprocessor(this.services.get_attributes_wfs);
			let params = {
				"wfsurl": this.selected_wfs,
				"featuretype": this.selected_featuretype,
				"geometry": this.dataset_to_validate.geometry
			};
			gp.execute(params, lang.hitch(this, function(results, messages) {
				if (results && results != "null" && results.length == 3) {
					let general_report = null;
					let fields = null;
					array.forEach(results, lang.hitch(this, function(res) {
						if (res.hasOwnProperty("paramName")) {
							
							if (res.paramName == "generalreport") {
								if (res.hasOwnProperty("value")) {
									general_report = res.value;
								}
							}
							if (res.paramName == "fields") {
								if (res.hasOwnProperty("value")) {
									fields = res.value;
								}
							}
							if (res.paramName == "datasetpath") {
								if (res.hasOwnProperty("value")) {
									this.input_dataset_path = res.value;
								}
							}
						}
					}));
					if (general_report != null) {
						if (!general_report.error) {
							this.displayFilteringSettings(fields, dojo.byId("filtering_container"));
						}
						else {
							if (general_report.infoMessages.length > 0) {
								this.displayReportMessages(general_report, dojo.byId("upload_report_container"));
							}
						}
					}
					else {
						this.showErrorMessage("ERROR. Get WFS attributes didn't succeed (results params error). Please report it to data@helcom.fi.");
					}
				}
				else {
					this.showErrorMessage("ERROR. Get WFS attributes didn't succeed (results length error). Please report it to data@helcom.fi.");
				}
				document.getElementById("loadingCover").style.display = "none";
			}),
			lang.hitch(this, function(error) {
				this.showErrorMessage("ERROR. Something went wrong when Get WFS attributes. " + error + ". WFS feature type maybe too big to process. Consider exporting features to Shapefile and validate Shapefile instead.");
				document.getElementById("loadingCover").style.display = "none";
			}));
		},
		
		displayReportMessages: function(report, container) {
			domConstruct.create("div", {"style": "color: rgb(128, 0, 0);", "innerHTML": "Messages, warnings, errors."}, container, "last");
			
			let close_button = domConstruct.create("div", {"style": "margin-left: 5px", "class": "mainLink", "innerHTML": "Close"}, container, "last");
			on(close_button, "click", lang.hitch(this, function() {
				container.style.display = "none";
				domConstruct.empty(container);
			}));
			
			array.forEach(report.infoMessages, lang.hitch(this, function(infoMessage) {
				if (infoMessage.hasOwnProperty('message')) {
					domConstruct.create("div", {"style": "margin-left: 10px", "innerHTML": infoMessage.message}, container, "last");
				}
				if (infoMessage.hasOwnProperty('error')) {
					domConstruct.create("div", {"style": "margin-left: 10px; color: red;", "innerHTML": "ERROR: " + infoMessage.error}, container, "last");
				}
				if (infoMessage.hasOwnProperty('warning')) {
					domConstruct.create("div", {"style": "margin-left: 10px; color: blue;", "innerHTML": "WARNING: " + infoMessage.warning}, container, "last");
				}
			}));
			
			let close_button_down = domConstruct.create("div", {"style": "margin-left: 5px", "class": "mainLink", "innerHTML": "Close"}, container, "last");
			on(close_button_down, "click", lang.hitch(this, function() {
				container.style.display = "none";
				domConstruct.empty(container);
			}));
				
			container.style.display = "block";
		},
		
		displayFilteringSettings: function(fields, container) {
			container.style.display = "block";
			on(dojo.byId("filtering_no_button"), "click", lang.hitch(this, function() {
				this.displayFieldsMapping(fields, dojo.byId("fields_container"));
				dojo.byId("validate_button").style.display = "block";
			}));
			on(dojo.byId("filtering_yes_button"), "click", lang.hitch(this, function() {
				dojo.byId("filtering_settings_container").style.display = "block";
				this.displayFieldsMapping(fields, dojo.byId("fields_container"));
				dojo.byId("validate_button").style.display = "block";
			}));			
		},
		
		displayFieldsMapping: function(fields, container) {
			domConstruct.empty(container);
			container.style.display = "block";
			if (Object.hasOwn(this.dataset_to_validate, "fields")) {
				domConstruct.create("div", {"style": "margin-top: 10px; color: rgb(128, 0, 0);", "innerHTML": "Map attributes for validation"}, container, "last");
				for (const [name, props] of Object.entries(this.dataset_to_validate.fields)) {
					let codesContainer = null;
					let fieldsLine = domConstruct.create("div", {"style": "margin-left: 10px; margin-top: 7px;"}, container, "last");
					domConstruct.create("span", {"style": "width: 120px; font-size: 14px; display: inline-block;", "innerHTML": name}, fieldsLine, "last");
					let attributeSelectContainer = domConstruct.create("div", {"style": "width: 200px; display: inline-block;  border: 1px solid #00497F; padding-right: 1px;"}, fieldsLine, "last");
					if (Object.hasOwn(props, "domain")) {
						codesContainer = domConstruct.create("div", {"style": "margin-left: 10px; display: none;"}, container, "last");
					}
					
					let attributeSelect = new Select({
						class: "selectWidget"
					});
					attributeSelect.placeAt(attributeSelectContainer);
					attributeSelect.startup();
					let selectAttributeData = [{id: "No", label: "-- No matched attribute"}];
					for (const [key, type] of Object.entries(fields)) {
						if ((props.type == "text") && (type.startsWith("text"))) {
							let selectRecord = {id: key, label: key + " - " + type}
							selectAttributeData.push(selectRecord);
						}
						if (((props.type == "integer") || (props.type == "float")) && ((type == "integer") || (type == "float"))) {
							let selectRecord = {id: key, label: key + " - " + type}
							selectAttributeData.push(selectRecord);
						}
					}
					let store = new Memory({
						data: selectAttributeData
					});
			
					let os = new ObjectStore({objectStore: store});
					attributeSelect.setStore(os);
					
					on(attributeSelect, "change", lang.hitch(this, function(val) {
						if (val != "No") {
							this.dataset_to_validate.fields[name]["mapped_attribute_name"] = val;
							if (Object.hasOwn(props, "domain")) {
								domConstruct.empty(codesContainer);
								this.getUniqueValuesForDomain(codesContainer, val, name, props.domain);
								//codesContainer.style.display = "block";
							}
						}
						else {
							this.dataset_to_validate.fields[name]["mapped_attribute_name"] = null;
						}
					}));
				}
			}
			else {
				console.log("no attributes to map");
			}	
		},
		
		getUniqueValuesForDomain: function(codesContainer, mapped_field_name, field_name, domains) {
			document.getElementById("loadingCover").style.display = "block";
			let gp = new Geoprocessor(this.services.get_unique_values);
			let params = {
				"datasetpath": this.input_dataset_path,
				"attribute": mapped_field_name
			};
			gp.execute(params, lang.hitch(this, function(results, messages) {
				if (results && results != "null" && results.length == 2) {
					let general_report = null;
					let values = null;
					array.forEach(results, lang.hitch(this, function(res) {
						if (res.hasOwnProperty("paramName")) {
							
							if (res.paramName == "generalreport") {
								if (res.hasOwnProperty("value")) {
									general_report = res.value;
								}
							}
							if (res.paramName == "values") {
								if (res.hasOwnProperty("value")) {
									values = res.value;
								}
							}
						}
					}));
					if (general_report != null) {
						if (!general_report.error) {
							this.createDomainsContainer(codesContainer, field_name, domains, values);
						}
					}
					else {
						this.showErrorMessage("ERROR. Get unique values didn't succeed (results params error). Please report it to data@helcom.fi.");
					}
				}
				else {
					this.showErrorMessage("ERROR. Get unique values didn't succeed (results length error). Please report it to data@helcom.fi.");
				}
				document.getElementById("loadingCover").style.display = "none";
			}),
			lang.hitch(this, function(error) {
				this.showErrorMessage("ERROR. Something went wrong when getting unique values. " + error + " Please report it to data@helcom.fi.");
				document.getElementById("loadingCover").style.display = "none";
			}));
		},
		
		createDomainsContainer: function(codesContainer, name, domains, valueList) {
			this.dataset_to_validate.fields[name]["mapped_domains"] = {};
			
			let selectCodeData = [{id: "No", label: "-- No matched value"}];
			array.forEach(valueList, lang.hitch(this, function(value) {
				let selectRecord = {id: value, label: value};
				selectCodeData.push(selectRecord);
			}));
						
			domConstruct.create("div", {"style": "margin-top: 5px; color: rgb(128, 0, 0);", "innerHTML": "Map codes for <strong>" + name + "</strong> attribute for validation. Please, notice that not all values are mandatory, as they are compiled for different sea areas."}, codesContainer, "last");
			array.forEach(domains, lang.hitch(this, function(domain) {
				let codesLine = domConstruct.create("div", {"style": "margin-top: 7px; margin-left: 20px;"}, codesContainer, "last");
				domConstruct.create("div", {"style": "width: 120px; font-size: 14px; display: inline-block;", "innerHTML": domain}, codesLine, "last");
				let codeSelectContainer = domConstruct.create("div", {"style": "width: 200px; display: inline-block;  border: 1px solid #00497F; padding-right: 1px;"}, codesLine, "last");
				let codeSelect = new Select({
					class: "selectWidget"
				});
				codeSelect.placeAt(codeSelectContainer);
				codeSelect.startup();
				
				let store = new Memory({
					data: selectCodeData
				});
		
				let os = new ObjectStore({objectStore: store});
				codeSelect.setStore(os);
				
				on(codeSelect, "change", lang.hitch(this, function(val) {
					if (val != "No") {
						this.dataset_to_validate.fields[name]["mapped_domains"][domain] = val;
					}
					else {
						this.dataset_to_validate.fields[name]["mapped_domains"][domain] = null;
					}
				}));
			}));
			codesContainer.style.display = "block";
		},
		
		checkMandatoryFieldsMapping: function() {
			dojo.byId("report_error_container").style.display = "none";
			let not_mapped_attributes = [];
			for (const [name, props] of Object.entries(this.dataset_to_validate.fields)) {
				if ((props.mandatory == "yes") && (!props.hasOwnProperty('mapped_attribute_name'))) {
					not_mapped_attributes.push(name);
				}
			}
			
			if (not_mapped_attributes.length > 0) {
				this.showErrorMessage("ERROR. One or more mandatory attributes are not mapped. Please, map them above.");
			}
			else {
				this.validateDataset();
			}
		},
		
		validateDataset: function() {
			//console.log(JSON.stringify(this.dataset_to_validate));
			//console.log(this.output_dataset_path);
			document.getElementById("loadingCover").style.display = "block";
			let gp = new Geoprocessor(this.services.validate_dataset);
			let params = {
				"inputdatasetpath": this.input_dataset_path,
				"rules": JSON.stringify(this.dataset_to_validate),
				"outputdatasetpath": this.output_dataset_path
			};
			gp.execute(params, lang.hitch(this, function(results, messages) {
				if (results && results != "null" && results.length == 2) {
					let general_report = null;
					let dataset_report = null;
					array.forEach(results, lang.hitch(this, function(res) {
						if (res.hasOwnProperty("paramName")) {
							
							if (res.paramName == "generalreport") {
								if (res.hasOwnProperty("value")) {
									general_report = res.value;
								}
							}
							if (res.paramName == "datasetreport") {
								if (res.hasOwnProperty("value")) {
									dataset_report = res.value;
								}
							}
						}
					}));
					if (general_report != null) {
						if (!general_report.error) {
							if (dataset_report != null) {
								this.displayDatasetReport(dataset_report, dojo.byId("dataset_report_container"));
							}
							else {
								this.resetValidation();
								this.showErrorMessage("ERROR. Validation didn't succeed (results params dataset report error). Try again or report it to data@helcom.fi.");
							}
						}
						else {
							if (general_report.infoMessages.length > 0) {
								this.displayReportMessages(general_report, dojo.byId("validate_report_container"));
							}
							this.resetValidation();
						}
					}
					else {
						this.resetValidation();
						this.showErrorMessage("ERROR. Validation didn't succeed (results params general report error). Try again or report it to data@helcom.fi.");
					}					
				}
				else {
					this.resetValidation();
					this.showErrorMessage("ERROR. Validation didn't succeed (results length error). Try again or report it to data@helcom.fi.");
				}
				document.getElementById("loadingCover").style.display = "none";
			}),
			lang.hitch(this, function(error) {
				console.log(error);
				this.resetValidation();
				this.showErrorMessage("ERROR. Something went wrong when validating dataset. " + error + " Try again or report it to data@helcom.fi.");
				document.getElementById("loadingCover").style.display = "none";
			}));
		},
		
		displayDatasetReport: function(report, container) {
			domConstruct.create("div", {"style": "color: rgb(128, 0, 0);", "innerHTML": "Dataset validation report for <strong>" + report.inputDataset + "(" + report.geometry + ")</strong>:"}, container, "last");
			domConstruct.create("div", {"style": "", "innerHTML": "Dataset contains " + report.featureCount + " features."}, container, "last");
			if (report.datasetError) {
				domConstruct.create("div", {"style": "", "innerHTML": "There are " + report.datasetErrorCount + " error(s) found:"}, container, "last");
				array.forEach(report.infoMessages, lang.hitch(this, function(infoMessage) {
					if (infoMessage.hasOwnProperty('error')) {
						domConstruct.create("div", {"style": "margin-left: 10px;", "innerHTML": infoMessage.error}, container, "last");
					}
					if (infoMessage.hasOwnProperty('error_summary')) {
						domConstruct.create("div", {"style": "margin-left: 10px; color: red", "innerHTML": infoMessage.error_summary}, container, "last");
					}
				}));
				this.resetValidation();
				domConstruct.create("div", {"style": "color: rgb(128, 0, 0);", "innerHTML": "Dataset which doesn't pass validation can't be further processed."}, container, "last");
				let new_validation_button = domConstruct.create("div", {"style": "margin-left: 5px", "class": "mainLink", "innerHTML": "New validation"}, container, "last");
				on(new_validation_button, "click", lang.hitch(this, function() {
					this.newValidation();
				}));
				
			}
			else {
				domConstruct.create("div", {"style": "", "innerHTML": "No errors found. Dataset can be uploaded for further processing."}, container, "last");
				let save_button = domConstruct.create("div", {"style": "margin-left: 5px", "class": "mainLink", "innerHTML": "Save dataset"}, container, "last");
				on(save_button, "click", lang.hitch(this, function() {
					this.saveDataset(report.intermediateDataset);
				}));
			}
			
			container.style.display = "block";
		},
		
		displayRasterReport: function(intermediate_raster, container) {
			domConstruct.create("div", {"style": "", "innerHTML": "No errors found. Raster can be uploaded for further processing."}, container, "last");
			let save_button = domConstruct.create("div", {"style": "margin-left: 5px", "class": "mainLink", "innerHTML": "Save dataset"}, container, "last");
			on(save_button, "click", lang.hitch(this, function() {
				this.saveRaster(intermediate_raster);
			}));
			
			container.style.display = "block";
		},
		
		saveDataset: function(input_dataset) {
			document.getElementById("loadingCover").style.display = "block";
			let gp = new Geoprocessor(this.services.upload_dataset);
			let params = {
				"inputdatasetpath": input_dataset,
				"outputdatasetpath": this.output_dataset_path
			};
			gp.execute(params, lang.hitch(this, function(results, messages) {
				if (results && results != "null" && results.length == 1) {
					let general_report = null;
					let dataset_report = null;
					array.forEach(results, lang.hitch(this, function(res) {
						if (res.hasOwnProperty("paramName")) {
							
							if (res.paramName == "generalreport") {
								if (res.hasOwnProperty("value")) {
									general_report = res.value;
								}
							}
						}
					}));
					if (general_report != null) {
						if (general_report.infoMessages.length > 0) {
							this.displayReportMessages(general_report, dojo.byId("save_report_container"));
						}	
						dojo.byId("new_validation_success_button").style.display = "block";
					}
					else {
						this.resetValidation();
						this.showErrorMessage("ERROR. Save didn't succeed (results params general report error). Try again or report it to data@helcom.fi.");
					}					
				}
				else {
					this.resetValidation();
					this.showErrorMessage("ERROR. Save didn't succeed (results length error). Try again or report it to data@helcom.fi.");
				}
				document.getElementById("loadingCover").style.display = "none";
			}),
			lang.hitch(this, function(error) {
				console.log(error);
				this.resetValidation();
				this.showErrorMessage("ERROR. Something went wrong when saving dataset. " + error + " Try again or report it to data@helcom.fi.");
				document.getElementById("loadingCover").style.display = "none";
			}));
		},
		
		saveRaster: function(input_dataset) {
			document.getElementById("loadingCover").style.display = "block";
			let gp = new Geoprocessor(this.services.upload_raster);
			let params = {
				"inputdatasetpath": input_dataset,
				"outputdatasetpath": this.output_dataset_path
			};
			gp.execute(params, lang.hitch(this, function(results, messages) {
				if (results && results != "null" && results.length == 1) {
					let general_report = null;
					let dataset_report = null;
					array.forEach(results, lang.hitch(this, function(res) {
						if (res.hasOwnProperty("paramName")) {
							
							if (res.paramName == "generalreport") {
								if (res.hasOwnProperty("value")) {
									general_report = res.value;
								}
							}
						}
					}));
					if (general_report != null) {
						if (general_report.infoMessages.length > 0) {
							this.displayReportMessages(general_report, dojo.byId("save_report_container"));
						}	
						dojo.byId("new_validation_success_button").style.display = "block";
					}
					else {
						this.resetValidation();
						this.showErrorMessage("ERROR. Save didn't succeed (results params general report error). Try again or report it to data@helcom.fi.");
					}					
				}
				else {
					this.resetValidation();
					this.showErrorMessage("ERROR. Save didn't succeed (results length error). Try again or report it to data@helcom.fi.");
				}
				document.getElementById("loadingCover").style.display = "none";
			}),
			lang.hitch(this, function(error) {
				console.log(error);
				this.resetValidation();
				this.showErrorMessage("ERROR. Something went wrong when saving dataset. " + error + " Try again or report it to data@helcom.fi.");
				document.getElementById("loadingCover").style.display = "none";
			}));
		},

		clearOnNewSelection: function() {
			dojo.byId("mandatory_fields_container").style.display = "none";
			dojo.byId("select_file_container").style.display = "none";
			dojo.byId("select_file_message").style.display = "none";
			dojo.byId("select_file_input").value = "";
			this.selected_file = null;
			dojo.byId("validate_button").style.display = "none";
			dojo.byId("upload_file_message").style.display = "none";
			dojo.byId("upload_file_error_message").style.display = "none";
			dojo.byId("validation_results_section").style.display = "none";
			domConstruct.empty(dojo.byId("validation_report_section"));
			dojo.byId("upload_button").style.display = "none";
			dojo.byId("upload_data_message").style.display = "none";
			dojo.byId("upload_data_error_message").style.display = "none";
			dojo.byId("upload_results_section").style.display = "none";
			domConstruct.empty(dojo.byId("upload_report_section"));
			this.upload_input_table = null,
			this.upload_output_table = null,
			this.out_fields = null;
			this.out_rows = null;
			this.upload_min_id = null;
			this.upload_max_id = null;
			this.spatial_type = null;
		},
		
		setupDatabaseSelectList: function() {
			let store = new Memory({
				data: [
					{id: "No", label: "-- Select a database"},
					{id: "public", label: "Public"},
					{id: "private", label: "Private"},
					{id: "habitat", label: "Habitat"}
				]
			});
			
			let os = new ObjectStore({objectStore: store});
			this.database_select.setStore(os);
		},

		setupDatasetSelectList: function() {
			let store = new Memory({
				data: [{id: "No", label: "-- Select a dataset"}]
			});
			array.forEach(this.datasets, lang.hitch(this, function(dataset) {
				store.data.push({id: dataset, label:  dataset});
			}));
			let os = new ObjectStore({objectStore: store});
			this.dataset_select.setStore(os);
		},

		setupDatasetTypeSelectList: function(types) {
			let store = new Memory({
				data: [{id: "No", label: "-- Select a dataset type"}]
			});
			array.forEach(types, lang.hitch(this, function(type) {
    		store.data.push({id: type, label:  type});
			}));
			let os = new ObjectStore({objectStore: store});
			this.dataset_type_select.setStore(os);
			dojo.byId("dataset_type_select_container").style.display = "block";
		},

		setupMandatoryFields: function(fields) {
			let mfc = dojo.byId("mandatory_fields_container");
			domConstruct.empty(mfc);
			let mfm = "";
			if (this.selected_dataset_type == null) {
				mfm = "Mandatory fields for " + this.selected_dataset + " are: ";
			}
			else {
				mfm = "Mandatory fields for " + this.selected_dataset + " (" + this.selected_dataset_type + ") are: ";
			}

			array.forEach(fields, lang.hitch(this, function(field) {
				mfm += "<br/><strong>" + field + "</strong>";
			}));
			mfc.innerHTML = mfm;
			mfc.style.display = "block";
			dojo.byId("select_file_container").style.display = "block";
		},

		getDatasetTypes: function(dataset) {
			domStyle.set(dojo.byId("loadingCover"), {"display": "block"});
			let url = this.services.get_dataset_types;
			let gp = new Geoprocessor(url);
			let params = {
				"dataset": dataset
			};
			gp.execute(params, lang.hitch(this, function(results, messages) {
				let result = null;
				let message = null;
				let dataset_types = null;
				if (results && results != "null" && results.length > 0) {
					
					array.forEach(results, lang.hitch(this, function(res) {
						if (res.hasOwnProperty("paramName")) {
							if (res.paramName == "dataset_types") {
								if (res.hasOwnProperty("value")) {
									dataset_types = res.value;
								}
							}
							else if (res.paramName == "result") {
								if (res.hasOwnProperty("value")) {
									result = res.value;
								}
							}
							else if (res.paramName == "message") {
								if (res.hasOwnProperty("value")) {
									message = res.value;
								}
							}
						}
					}));
					
					if (result == '1') {
						if (dataset_types.length > 0) {
							this.setupDatasetTypeSelectList(dataset_types);
						}
						else {
							this.getMandatoryFields(this.selected_dataset, "No");
						}
						document.getElementById("loadingCover").style.display = "none";
					}
					else {
						document.getElementById("action_error_message").innerHTML = "ERROR in 'get_dataset_types' service response ('results' = 0). Please report it to data@helcom.fi.";
						document.getElementById("action_error_message").style.display = "block";
					}
					document.getElementById("loadingCover").style.display = "none";
				}
				else {
					document.getElementById("action_error_message").innerHTML = "Unable to get datasets from the service 'get_dataset_types' (no 'results' in response). Try to reload page and run the tool again. Contact administrator at data@helcom.fi if alert appears again.";
					document.getElementById("action_error_message").style.display = "block";
				}
			
			}),
			lang.hitch(this, function(error) {
				document.getElementById("action_error_message").innerHTML = "ERROR in 'get_dataset_types' service response " + error + " Please report it to data@helcom.fi.";
				document.getElementById("action_error_message").style.display = "block";
				document.getElementById("loadingCover").style.display = "none";
			}));
		},
		
		getMandatoryFields: function(dataset, type) {
			domStyle.set(dojo.byId("loadingCover"), {"display": "block"});
			let url = this.services.get_mandatory_fields;
			let gp = new Geoprocessor(url);
			let params = {
				"dataset": dataset,
				"dataset_type": type
			};
			gp.execute(params, lang.hitch(this, function(results, messages) {
				let result = null;
				let message = null;
				let mandatory_fields = null;
				if (results && results != "null" && results.length > 0) {
					
					array.forEach(results, lang.hitch(this, function(res) {
						if (res.hasOwnProperty("paramName")) {
							if (res.paramName == "mandatory_fields") {
								if (res.hasOwnProperty("value")) {
									mandatory_fields = res.value;
								}
							}
							else if (res.paramName == "result") {
								if (res.hasOwnProperty("value")) {
									result = res.value;
								}
							}
							else if (res.paramName == "message") {
								if (res.hasOwnProperty("value")) {
									message = res.value;
								}
							}
						}
					}));
					
					if (result == '1') {
						this.setupMandatoryFields(mandatory_fields);
						document.getElementById("loadingCover").style.display = "none";
					}
					else {
						document.getElementById("action_error_message").innerHTML = "ERROR in 'get_mandatory_fields' service response ('results' = 0). Please report it to data@helcom.fi.";
						document.getElementById("action_error_message").style.display = "block";
					}
					document.getElementById("loadingCover").style.display = "none";
				}
				else {
					document.getElementById("action_error_message").innerHTML = "Unable to get datasets from the service 'get_mandatory_fields' (no 'results' in response). Try to reload page and run the tool again. Contact administrator at data@helcom.fi if alert appears again.";
					document.getElementById("action_error_message").style.display = "block";
				}
			
			}),
			lang.hitch(this, function(error) {
				document.getElementById("action_error_message").innerHTML = "ERROR in 'get_mandatory_fields' service response " + error + " Please report it to data@helcom.fi.";
				document.getElementById("action_error_message").style.display = "block";
				document.getElementById("loadingCover").style.display = "none";
			}));
		},

		validateXLSX: function(file_upload) {
			if (file_upload.files.length) {
				this.selected_file = file_upload.files[0];
				let ext = this.selected_file.name.split('.').at(-1);
				if (ext.toLowerCase() == "xlsx") {
					dojo.byId("validate_button").style.display = "block";
				}
				else {
					dojo.byId("select_file_message").innerHTML = "ERROR. Uploaded file is not an XSLX.";
					dojo.byId("select_file_message").style.display = "block";
				}
			}
			else {
				dojo.byId("select_file_message").innerHTML = "ERROR. Can't read uploaded file.";
				dojo.byId("select_file_message").style.display = "block";
			}
		},
		
		/*uploadFileForValidation: function() {
			domStyle.set(dojo.byId("loadingCover"), {"display": "block"});
			//let url = this.services.upload;
			let req = {
				"url": this.services.upload,
				"form": document.getElementById("select_file_input_form"),
				"content": { 
					"f": "json",
					"token":"xkA_v5pHZbQ79puPqa70DGjacBU3-VV5RBXAAmEGoqOeVU3vv_6vsc3rm7AWcXp-Y0E-gCsfsi_XTdxgabVxPCUbH0xljSa51k62FYG1fCREva9q4g9BMsSga4BAnB3Uq7Fi0a-1gHnqYOcOzrzW3w.."
				},
				"handleAs": "json"
			};
			let opts = {
				"usePost": true,
				"useProxy" :false
			};	
			let er = esriRequest(req, opts);
				
			er.then(requestSucceeded, requestFailed);
			
            function requestSucceeded(result){
				console.log("Success");
				console.log(result);
			}
			function requestFailed (result){
				console.log("Failed");
				console.log(result);
			}
		},*/

		uploadFileForValidation: function() {
			domStyle.set(dojo.byId("loadingCover"), {"display": "block"});
			const formData = new FormData();
			formData.append("file", this.selected_file);
			formData.append("f", "json");
			formData.append("token", this.token);
			const options = {
				method: 'POST',
				body: formData
			};

			fetch(this.services.upload, options)
				.then(lang.hitch(this, function(response) {
					return response.text();
				}))
				.then(lang.hitch(this, function(text) {
					let resp = JSON.parse(text);
					if (resp.error) {
						dojo.byId("upload_file_error_message").innerHTML = "ERROR. Selected file was not uploaded to the server. Something went wrong. " + resp.error.message + " Please report it to data@helcom.fi.";
						dojo.byId("upload_file_error_message").style.display = "block";
						domStyle.set(dojo.byId("loadingCover"), {"display": "none"});
					}
					else {
						if (resp.hasOwnProperty("item")) {
							if (resp.item.hasOwnProperty("itemName")) {
								dojo.byId("upload_file_message").innerHTML = resp.item.itemName + " was uploaded to the server for processing.";
								dojo.byId("upload_file_message").style.display = "block";
								if (resp.item.hasOwnProperty("itemID")) {
									this.validateDataset(resp.item.itemID);
								}
								else {
									dojo.byId("upload_file_error_message").innerHTML = "ERROR. Upload didn't succeed (item.itemID error). Please report it to data@helcom.fi.";
									dojo.byId("upload_file_error_message").style.display = "block";
									domStyle.set(dojo.byId("loadingCover"), {"display": "none"});
								}
							}
							else {
								dojo.byId("upload_file_error_message").innerHTML = "ERROR. Upload didn't succeed (item.itemName error). Please report it to data@helcom.fi.";
								dojo.byId("upload_file_error_message").style.display = "block";
								domStyle.set(dojo.byId("loadingCover"), {"display": "none"});
							}
						}
						else {
							dojo.byId("upload_file_error_message").innerHTML = "ERROR. Upload didn't succeed (item error). Please report it to data@helcom.fi.";
							dojo.byId("upload_file_error_message").style.display = "block";
							domStyle.set(dojo.byId("loadingCover"), {"display": "none"});
						}
					}
				}));
		},
		
		/*validateDataset: function(id) {
			let type = "No";
			if (this.selected_dataset_type != null) {
				type = this.selected_dataset_type;
			}
			let url = this.services.validate;
			let gp = new Geoprocessor(url);
			let params = {
				"private_public": this.selected_database,
				"dataset_table": this.selected_dataset,
				"dataset_type": type,
				"input_xlsx": "{'itemID':'" + id + "'}"
			};
			gp.execute(params, lang.hitch(this, function(results, messages) {
				if (results && results != "null" && results.length == 2) {
					let dataset_report = null;
					let general_report = null;
					array.forEach(results, lang.hitch(this, function(res) {
						if (res.hasOwnProperty("paramName")) {
							if (res.paramName == "general_report") {
								if (res.hasOwnProperty("value")) {
									general_report = res.value;
								}
							}
							if (res.paramName == "dataset_report") {
								if (res.hasOwnProperty("value")) {
									dataset_report = res.value;
								}
							}
						}
					}));
					if ((general_report != null) && (dataset_report != null)) {
						this.displayValidationReport(general_report, dataset_report);
					}
					else {
						dojo.byId("upload_file_error_message").innerHTML = "ERROR. Validation didn't succeed (results params error). Please report it to data@helcom.fi.";
						dojo.byId("upload_file_error_message").style.display = "block";
					}
					document.getElementById("loadingCover").style.display = "none";
				}
				else {
					document.getElementById("upload_file_error_message").innerHTML = "ERROR. Validation didn't succeed (results length error). Please report it to data@helcom.fi.";
					document.getElementById("upload_file_error_message").style.display = "block";
				}
			
			}),
			lang.hitch(this, function(error) {
				document.getElementById("upload_file_error_message").innerHTML = "ERROR. Something went wrong when validating dataset. " + error + " Please report it to data@helcom.fi.";
				document.getElementById("upload_file_error_message").style.display = "block";
				document.getElementById("loadingCover").style.display = "none";
			}));
		},

		
		
		uploadDataset: function() {
			domStyle.set(dojo.byId("loadingCover"), {"display": "block"});
			let url = this.services.save;
			let gp = new Geoprocessor(url);
			let params = {
				"private_public": this.selected_database,
				"dataset_table": this.selected_dataset,
				"input_dataset": this.upload_input_table,
				"output_dataset": this.upload_output_table
			};
			gp.execute(params, lang.hitch(this, function(results, messages) {
				if (results && results != "null" && results.length == 1) {
					let general_report = null;
					array.forEach(results, lang.hitch(this, function(res) {
						if (res.hasOwnProperty("paramName")) {
							if (res.paramName == "general_report") {
								if (res.hasOwnProperty("value")) {
									general_report = res.value;
								}
							}
						}
					}));
					if (general_report != null) {
						if (this.spatial_type != null) {
							this.uploadDatasetProd();
						}
						else {
							this.displayUploadReport(general_report);
							document.getElementById("loadingCover").style.display = "none";
						}
					}
					else {
						dojo.byId("upload_file_error_message").innerHTML = "ERROR. upload didn't succeed (results params error). Please report it to data@helcom.fi.";
						dojo.byId("upload_file_error_message").style.display = "block";
					}
				}
				else {
					document.getElementById("upload_file_error_message").innerHTML = "ERROR. Upload didn't succeed (results length error). Please report it to data@helcom.fi.";
					document.getElementById("upload_file_error_message").style.display = "block";
				}
			
			}),
			lang.hitch(this, function(error) {
				document.getElementById("upload_data_error_message").innerHTML = "ERROR. Something went wrong when uploading dataset. " + error + " Please report it to data@helcom.fi.";
				document.getElementById("upload_data_error_message").style.display = "block";
				document.getElementById("loadingCover").style.display = "none";
			}));
		},*/

		/*uploadDataset: function() {
			domStyle.set(dojo.byId("loadingCover"), {"display": "block"});
			let url = this.services.save + "&dataset_table=" + this.selected_dataset + "&input_dataset=" + this.upload_input_table + "&output_dataset=" + this.upload_output_table;
			fetch(url)
			.then(lang.hitch(this, function(response) {
				return response.text();
			}))
			.then(lang.hitch(this, function(text) {
				let resp = JSON.parse(text);
				if (resp.error) {
					dojo.byId("upload_data_error_message").innerHTML = "ERROR. Something went wrong when uploading dataset. " + resp.error.message + " Please report it to data@helcom.fi.";
					dojo.byId("upload_data_error_message").style.display = "block";
					domStyle.set(dojo.byId("loadingCover"), {"display": "none"});
				}
				else {
					domStyle.set(dojo.byId("loadingCover"), {"display": "none"});
					if (resp.hasOwnProperty("results")) {
						if (resp.results.length == 1) {
							let general_report = null;
							array.forEach(resp.results, lang.hitch(this, function(res) {
								if (res.hasOwnProperty("paramName")) {
									if (res.paramName == "general_report") {
										if (res.hasOwnProperty("value")) {
											general_report = res.value;
										}
									}
								}
							}));
							if (general_report != null) {
								if (this.spatial_type != null) {
									this.uploadDatasetProd();
								}
								else {
									this.displayUploadReport(general_report);
								}
							}
							else {
								dojo.byId("upload_data_error_message").innerHTML = "ERROR. Upload didn't succeed (results params error). Please report it to data@helcom.fi.";
								dojo.byId("upload_data_error_message").style.display = "block";
							}
						}
						else {
							dojo.byId("upload_data_error_message").innerHTML = "ERROR. Upload didn't succeed (results length error). Please report it to data@helcom.fi.";
							dojo.byId("upload_data_error_message").style.display = "block";
						}
					}
					else {
						dojo.byId("upload_file_error_message").innerHTML = "ERROR. Upload didn't succeed (results error). Please report it to data@helcom.fi.";
						dojo.byId("upload_file_error_message").style.display = "block";
					}
				}
			}));
		},*/

		displayUploadReport: function(general_report) {
			let upload_report_section = dojo.byId("upload_report_section");
			domConstruct.empty(upload_report_section);
			upload_report_section.style.display = "block";
			if (this.selected_dataset_type == null) {
				domConstruct.create("div", {"style": "font-size: 16px; font-weight: bold; margin-top: 10px;", "innerHTML": "Data upload report for " + this.selected_dataset + " dataset."}, upload_report_section, "last");
			}
			else {
				domConstruct.create("div", {"style": "font-size: 16px; font-weight: bold; margin-top: 10px;", "innerHTML": "Data upload report for " + this.selected_dataset + " (" + this.selected_dataset_type + ") dataset."}, upload_report_section, "last");
			}
			if (general_report.error) {
				domConstruct.create("div", {"style": "font-size: 14px; color: red; margin-top: 5px;", "innerHTML": general_report.errorMessage + "."}, upload_report_section, "last");
			}
			else {
				domConstruct.create("div", {"style": "font-size: 14px; color: green; margin-top: 10px;", "innerHTML": "No upload errors."}, upload_report_section, "last");
			}
			if (general_report.warnings.length > 0) {
				array.forEach(general_report.warnings, lang.hitch(this, function(warning) {
					domConstruct.create("div", {"style": "font-size: 14px; color: blue;", "innerHTML": "Warning: " + warning}, upload_report_section, "last");
				}));
			}
			if (general_report.infoMessages.length > 0) {
				array.forEach(general_report.infoMessages, lang.hitch(this, function(infoMessage) {
					domConstruct.create("div", {"style": "font-size: 14px;", "innerHTML": infoMessage}, upload_report_section, "last");
				}));
			}
			if (!general_report.error) {
				if ((this.out_fields != null) && (this.out_rows != null)) {
					domConstruct.create("div", {"style": "font-size: 14px; margin-top: 20px;", "innerHTML": "Following data were added to the database table (Note of automatically generated IDs)."}, upload_report_section, "last");
					let table = domConstruct.create("table", {"style": "font-size: 14px; border-collapse: collapse; margin-top: 10px;"}, upload_report_section, "last");
					let header = domConstruct.create("tr", {}, table, "last");
					array.forEach(this.out_fields, lang.hitch(this, function(of) {
						domConstruct.create("th", {"style": "border: 1px solid #ddd; padding: 8px; font-weight: bold;", "innerHTML": of}, header, "last");
					}));
					array.forEach(this.out_rows, lang.hitch(this, function(or) {
						let tr = domConstruct.create("tr", {}, table, "last");
						array.forEach(or, lang.hitch(this, function(val) {
							domConstruct.create("td", {"style": "border: 1px solid #ddd; padding: 8px;", "innerHTML": val}, tr, "last");
						}));
					}));
				}
			}
		},
		
		uploadDatasetProd: function() {
			domStyle.set(dojo.byId("loadingCover"), {"display": "block"});
			let upload_report_section = dojo.byId("upload_report_section");
			domConstruct.empty(upload_report_section);
			upload_report_section.style.display = "block";
			let upload_prod_message = domConstruct.create("div", {"style": "font-size: 16px; font-weight: bold; margin-top: 10px;", "innerHTML": "Uploading data to the production database... It will take few moments."}, upload_report_section, "last");
			let url = this.services.save_prod;
			let gp = new Geoprocessor(url);
			let params = {
				"private_public": this.selected_database,
				"dataset_table": this.upload_output_table,
				"is_ra": "No",
				"spatial_type": this.spatial_type,
				"min_id": this.upload_min_id,
				"max_id": this.upload_max_id
			};
			gp.execute(params, lang.hitch(this, function(results, messages) {
				if (results && results != "null" && results.length == 1) {
					let general_report = null;
					array.forEach(results, lang.hitch(this, function(res) {
						if (res.hasOwnProperty("paramName")) {
							if (res.paramName == "general_report") {
								if (res.hasOwnProperty("value")) {
									general_report = res.value;
								}
							}
						}
					}));
					if (general_report != null) {
						this.displayUploadReport(general_report);
					}
					else {
						dojo.byId("upload_file_error_message").innerHTML = "ERROR. Upload to production database didn't succeed (results params error). Please report it to data@helcom.fi.";
						dojo.byId("upload_file_error_message").style.display = "block";
					}
					document.getElementById("loadingCover").style.display = "none";
				}
				else {
					document.getElementById("upload_file_error_message").innerHTML = "ERROR. Upload to production database didn't succeed (results length error). Please report it to data@helcom.fi.";
					document.getElementById("upload_file_error_message").style.display = "block";
				}
			
			}),
			lang.hitch(this, function(error) {
				document.getElementById("upload_data_error_message").innerHTML = "ERROR. Something went wrong when uploading dataset to production database. " + error + " Please report it to data@helcom.fi.";
				document.getElementById("upload_data_error_message").style.display = "block";
				document.getElementById("loadingCover").style.display = "none";
			}));
		}

		/*uploadDatasetProd: function() {
			domStyle.set(dojo.byId("loadingCover"), {"display": "block"});
			let upload_report_section = dojo.byId("upload_report_section");
			domConstruct.empty(upload_report_section);
			upload_report_section.style.display = "block";
			//domConstruct.create("div", {"style": "font-size: 16px; font-weight: bold; margin-top: 10px;", "innerHTML": "Data upload report for " + this.selected_dataset + " (" + this.selected_dataset_type + ") dataset."}, upload_report_section, "last");
			let upload_prod_message = domConstruct.create("div", {"style": "font-size: 16px; font-weight: bold; margin-top: 10px;", "innerHTML": "Uploading data to the production database... It will take few moments."}, upload_report_section, "last");
			let url = this.services.save_prod + "&dataset_table=" + this.upload_output_table + "&is_ra=No&spatial_type=" + this.spatial_type + "&min_id=" + this.upload_min_id + "&max_id=" + this.upload_max_id;
			fetch(url)
			.then(lang.hitch(this, function(response) {
				return response.text();
			}))
			.then(lang.hitch(this, function(text) {
				let resp = JSON.parse(text);
				if (resp.error) {
					dojo.byId("upload_data_error_message").innerHTML = "ERROR. Something went wrong when uploading dataset to production database. " + resp.error.message + " Please report it to data@helcom.fi.";
					dojo.byId("upload_data_error_message").style.display = "block";
					domStyle.set(dojo.byId("loadingCover"), {"display": "none"});
				}
				else {
					if (resp.hasOwnProperty("results")) {
						if (resp.results.length == 1) {
							let general_report = null;
							array.forEach(resp.results, lang.hitch(this, function(res) {
								if (res.hasOwnProperty("paramName")) {
									if (res.paramName == "general_report") {
										if (res.hasOwnProperty("value")) {
											general_report = res.value;
										}
									}
								}
							}));
							if (general_report != null) {
								this.displayUploadReport(general_report);
							}
							else {
								dojo.byId("upload_data_error_message").innerHTML = "ERROR. Upload to production database didn't succeed (results params error). Please report it to data@helcom.fi.";
								dojo.byId("upload_data_error_message").style.display = "block";
							}
						}
						else {
							dojo.byId("upload_data_error_message").innerHTML = "ERROR. Upload to production database didn't succeed (results length error). Please report it to data@helcom.fi.";
							dojo.byId("upload_data_error_message").style.display = "block";
						}
					}
					else {
						dojo.byId("upload_file_error_message").innerHTML = "ERROR. Upload to production database didn't succeed (results error). Please report it to data@helcom.fi.";
						dojo.byId("upload_file_error_message").style.display = "block";
					}
					domStyle.set(dojo.byId("loadingCover"), {"display": "none"});
				}
			}));
		}*/
	});
});
