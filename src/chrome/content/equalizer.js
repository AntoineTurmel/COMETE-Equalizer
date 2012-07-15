// Make a namespace.
if (typeof eqpresets == 'undefined') {
  var eqpresets = {};
}

var strings = {
        values: [],
        loadDtdInJs: function(file){
                var pattern = /<!ENTITY\s(.*?)[\s]+\"(.*?)\"[\s]*>/g;
                var URL = file;
                var req = new XMLHttpRequest();
                req.overrideMimeType('text/plain');
                req.open('GET', URL, false); 
                req.send(null);
                if(req.status == 0){
                        var result;
                        while(result = pattern.exec(req.responseText)){
                                strings.values[result[1]] = result[2];
                        }
                }
        },
        
        getFormattedString: function(name, params){
                var str = strings.values[name];
                for(var i=0; i<params.length; i++){
                        str = str.replace("BB"+i+"BB", params[i]);
                }
                return str;
        }
}

strings.loadDtdInJs("chrome://songbird/locale/songbird.dtd");

eqpresets = {
	onLoad: function() {
		var equalizer = document.getElementById("equalizer");
		equalizer.setAttribute("height","270");
		//equalizer.setAttribute("width","250");
		//Check if the XML file exists
		eqpresets.findOrCreate();
		eqpresets.loadList();
	},
	easeInOut: function(minValue,maxValue,totalSteps,actualStep,powr){
		var delta = maxValue - minValue;
		var stepp = minValue+(Math.pow(((1 / totalSteps) * actualStep), powr)
			* delta); 
		return Math.ceil(stepp * 100) / 100;
	},
	loadList: function(){

		// Reading the presets file
		var path = eqpresets.getFilePathInProfile("equalizer_presets.xml");
		var xmlDoc = eqpresets.readXMLDocument(path);
		
		//We retrieve the list of presets in the equalizer
		var list =	document.getElementById('presets');
		
		//We empty the list of presets
		while(list.firstChild)
			list.removeChild(list.firstChild);
			
		var rootNode = xmlDoc.documentElement; 
		
		//We retrieve the current preset in preferences
		var pref = Components.classes["@mozilla.org/preferences-service;1"]
                     .getService(Components.interfaces.nsIPrefBranch2);
		var preset = pref.getCharPref("songbird.eq.currentpreset");	

		var presets = rootNode.getElementsByTagName("preset");
		var selectedItem = null;
		
		//We parse every presets of the setting file
		for (var i = 0, sz = presets.length; i < sz; i++)
		{
			//New menuitem to insert
			var opt = document.createElement('menuitem');
			//Creation of the oncommand with parameters of the preset bands
			var node = presets[i];
			var value = 'eqpresets.presets("'+presets[i].getAttribute("name")+
			  '"';
			var bands = node.getElementsByTagName("band");
			for(var j = 0; j< bands.length; j++){
				var element = bands[j]; 
				value += ",'"+element.firstChild.nodeValue+"'";
			}
			value += ")";
			
			//adding attributes to the menuItem element
			opt.setAttribute("value", presets[i].getAttribute("name"));
			opt.setAttribute("oncommand", value);
			opt.setAttribute("label", presets[i].getAttribute("name"));
						
			//selected preset
			if(presets[i].getAttribute("name") == preset){
				//opt.setAttribute("selected", true);
				//alert(preset);
				selectedItem = i;
				document.getElementById("preset_name").value = presets[i].getAttribute("name");
			}
			
			//adding the item to the list of presets
			list.appendChild(opt);
			
		}
		list.parentNode.selectedIndex = selectedItem;
	
	},
	findOrCreate: function(){
		//File init
		var file = Components.classes["@mozilla.org/file/local;1"]
					.createInstance(Components.interfaces.nsILocalFile);
		var path = eqpresets.getFilePathInProfile("equalizer_presets.xml");
		file.initWithPath(path);		
		
		//Check if the file exists
		if(file.exists()){
			//alert("File exists");
		}else{
			file.create("text/XML",0777);
			
			//Writing of parameters file
			var presets = eqpresets.getDefaultPresets();
			
			// creation of DOM parser
			var parser = Components.classes["@mozilla.org/xmlextras/domparser;1"]
                         .createInstance(Components.interfaces.nsIDOMParser);
			
			// creation of file content
			var datas = eqpresets.createXMLString(presets);
			
			// Creation of the DOM document
			var DOMDoc = parser.parseFromString(datas,"text/xml");
			
			//Save in ProfD
			eqpresets.saveXMLDocument(DOMDoc,path);
			
			//flat preset choosen by default
			var pref = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch2);
			pref.setCharPref("songbird.eq.currentpreset","flat");
		}
		
	},
	readXMLDocument: function(aPath) {
		
		// object for the file to be read
		var file = Components.classes["@mozilla.org/file/local;1"]
					.createInstance(Components.interfaces.nsILocalFile);
		file.initWithPath(aPath);
		// init of stream in the file
		var stream = Components.classes["@mozilla.org/network/file-input-stream;1"]
							 .createInstance(Components.interfaces.nsIFileInputStream);
		stream.init(file, -1, -1, Components.interfaces.nsIFileInputStream.CLOSE_ON_EOF);
				
		// creation of the DOM parser
		var parser = Components.classes["@mozilla.org/xmlextras/domparser;1"]
							 .createInstance(Components.interfaces.nsIDOMParser);
		// DOM generation from the stream
		var doc = parser.parseFromStream(stream, null, file.fileSize, "text/xml");
		parser = null;
		stream = null;
		file = null;
		return doc;
	},
	getFilePathInProfile: function(aRelativePath) {
		// we retrieve the nsIFile object (profile directory of the user)
		var file = Components.classes["@mozilla.org/file/directory_service;1"]
						  .getService(Components.interfaces.nsIProperties)
						  .get("ProfD", Components.interfaces.nsIFile);
		// we add the relative path given
		var path = aRelativePath.split("/");
		for (var i = 0, sz = path.length; i < sz; i++) {
			if (path[i] != "")
				file.append(path[i]);
		}
		return file.path;
	},
	saveXMLDocument: function(aDomDoc, aPath) {
		// object for the file to be writen
		var file = Components.classes["@mozilla.org/file/local;1"]
					.createInstance(Components.interfaces.nsILocalFile);
		file.initWithPath(aPath);
		// init of the stream on the file
		var stream = Components.classes["@mozilla.org/network/file-output-stream;1"]
					.createInstance(Components.interfaces.nsIFileOutputStream);
		stream.init(file, -1, -1, 0);
		
		var serializer = new XMLSerializer();
		serializer.serializeToStream(aDomDoc,stream,"UTF-8");
		
		stream = null;
		file = null;
	},
	getDefaultPresets: function(){
		var presets = new Array();
		presets[strings.values['equalizer.preset.classical']] = ["0","0","0","0","0","0","-0.2","-0.2","-0.2","-0.4"];
		presets[strings.values['equalizer.preset.club']] = ["0","0","0.15","0.2","0.2","0.2","0.15","0","0","0"];
		presets[strings.values['equalizer.preset.dance']] = ["0.5","0.25","0.05","0","0","-0.2","-0.3","-0.3","0","0"];
		presets["flat"] = ["0","0","0","0","0","0","0","0","0","0"];
		presets[strings.values['equalizer.preset.full_bass']] = ["0.4","0.4","0.4","0.2","0","-0.2","-0.3","-0.35","-0.4","-0.4"];
		presets[strings.values['equalizer.preset.full_bass_treble']] = ["0.2","0.15","0","-0.3","-0.25","0","0.2","0.3","0.4","0.4"];
		presets[strings.values['equalizer.preset.full_treble']] = ["-0.4","-0.4","-0.4","-0.15","0.1","0.4","0.8","0.8","0.8","0.8"];
		presets[strings.values['equalizer.preset.small_speakers']] = ["0.2","0.4","0.2","-0.2","-0.15","0","0.2","0.4","0.6","0.7"];
		presets[strings.values['equalizer.preset.large_hall']] = ["0.45","0.45","0.2","0.2","0","-0.2","-0.2","-0.2","0","0"];
		presets[strings.values['equalizer.preset.live']] = ["-0.2","0","0.15","0.2","0.2","0.2","0.1","0.05","0.05","0"];
		presets[strings.values['equalizer.preset.party']] = ["0.25","0.25","0","0","0","0","0","0","0.25","0.25"];
		presets[strings.values['equalizer.preset.pop']] = ["-0.15","0.15","0.2","0.25","0.15","-0.15","-0.15","-0.15","-0.1","-0.1"];
		presets[strings.values['equalizer.preset.reggae']] = ["0","0","-0.1","-0.2","0","0.2","0.2","0","0","0"];
		presets[strings.values['equalizer.preset.rock']] = ["0.3","0.15","-0.2","-0.3","-0.1","0.15","0.3","0.35","0.35","0.35"];
		presets[strings.values['equalizer.preset.ska']] = ["-0.1","-0.15","-0.12","-0.05","0.15","0.2","0.3","0.3","0.4","0.3"];
		presets[strings.values['equalizer.preset.soft']] = ["0.2","0","-0.1","-0.15","-0.1","0.2","0.3","0.35","0.4","0.5"];
		presets[strings.values['equalizer.preset.soft_rock']] = ["0.2","0.2","0","-0.1","-0.2","-0.3","-0.2","-0.1","0.2","0.4"];
		presets[strings.values['equalizer.preset.techno']] = ["0.3","0.25","0","-0.25","-0.2","0","0.3","0.35","0.35","0.3"];
		
		return presets;
	},
	createXMLString: function(presets){
		var datas = "<presets>";
		for(preset in presets){
			datas +="<preset name='"+preset+"'>";
			var tab = presets[preset];
			for(var i = 0, sz = tab.length; i < sz; i++){
				datas +="<band>"+tab[i]+"</band>";
			}
			datas+="</preset>";
		}
		datas+="</presets>";
		return datas;
	},
	presetToXML: function(preset_name,preset){
		var data ="";
		data +="<preset name='"+preset_name+"'>\n";
		for(var i = 0, sz = preset.length; i < sz; i++){
			data +="<band>"+preset[i]+"</band>\n";
		}
		data+="</preset>\n";
		return data;
	},
	presets: function(eqpreset,band0,band1,band2,band3,band4,band5,band6,band7,band8,band9) {
		this.mm = Components.classes["@songbirdnest.com/Songbird/Mediacore/Manager;1"]
		            .getService(Components.interfaces.sbIMediacoreManager);
  	var pref = Components.classes["@mozilla.org/preferences-service;1"]
  	                .getService(Components.interfaces.nsIPrefBranch2);

	pref.setCharPref("songbird.eq.currentpreset",eqpreset);
	
	var start = new Array();
	var bands = new Array();
	var bandSet = new Array();
	
	bands[0] = band0;
	bands[1] = band1;
	bands[2] = band2;
	bands[3] = band3;
	bands[4] = band4;
	bands[5] = band5;
	bands[6] = band6;
	bands[7] = band7;
	bands[8] = band8;
	bands[9] = band9;
	
	for(i = 0; i < 10; i++)
	{
		bandSet[i] = this.mm.equalizer.getBand(""+i);
		start[i] = parseFloat(bandSet[i].gain);
		bands[i] = parseFloat(bands[i]);
	}
	
	var steps = 30;
	var currStep = 0;

	var anim = window.setInterval(
		function()
		{
			
			for(i = 0; i < 10; i++)
			{
				pref.setCharPref("songbird.eq.band." + i.toString(),eqpresets
				  .easeInOut(start[i],bands[i],steps,currStep,1.6));
			}
			
			currStep++;
			
			if(currStep > steps)
			{
				for(i = 0; i < 10; i++)
				{
				
					bandSet[i].gain = bands[i];
					this.mm.equalizer.setBand(bandSet[i])  
					pref.setCharPref("songbird.eq.band." + i.toString(),bands[i]);
				}
				window.clearInterval(anim);
			}
			
		}, 10);

		document.getElementById("preset_name").value = eqpreset;
	},
	exporteqf: function() {
	
    var file = Components.classes["@mozilla.org/file/local;1"]
	  .createInstance(Components.interfaces.nsILocalFile);
    file.initWithPath("c:\test.eqf");

    var foStream = Components.classes["@mozilla.org/network/file-output-stream;1"]
            .createInstance(Components.interfaces.nsIFileOutputStream);
    // 0x02 = PR_WRONLY (write only)
    // 0x08 = PR_CREATE_FILE (create file if the file doesn't exist)
    // 0x10 = PR_APPEND (append to file with each write)
    foStream.init(file, 0x02 | 0x08 | 0x20, 0666, 0);

    var data = "Winamp EQ library file v1.1!--Entry1";

    foStream.write(data, data.length);
    foStream.close();
	
	},		
	
	savePreset: function(){
		//retrieve the string bundle
		var strbundle = document.getElementById("messages");
		
		//retrieve xmlDoc
		var path = eqpresets.getFilePathInProfile("equalizer_presets.xml");
		var xmlDoc = eqpresets.readXMLDocument(path);
		
		//retrieve the preset name
		var preset_name = document.getElementById("preset_name").value;
		
		//retrieve the preset value
		var bandSet = new Array();
		this.mm = Components.classes["@songbirdnest.com/Songbird/Mediacore/Manager;1"]
		            .getService(Components.interfaces.sbIMediacoreManager);

		for(i = 0; i < 10; i++)
		{
			bandSet[i] = this.mm.equalizer.getBand(""+i).gain;
		}
		
		//creating DOM preset
		if(preset_name != ""){
			var oldy = null;
			var valid_name=true;
			var rootNode = xmlDoc.documentElement;
			var presets = rootNode.getElementsByTagName("preset");
			for (var i = 0, sz = presets.length; i < sz; i++)
				if(presets[i].getAttribute("name") == preset_name){
					valid_name = false;
					oldy = presets[i];
				}
			
			if(valid_name){
				//insert preset in xmlDoc
				var presetDOM = xmlDoc.createElement("preset");
				presetDOM.setAttribute("name",preset_name);
				
				for(i = 0; i < 10; i++){
					var bandDom = xmlDoc.createElement("band");
					var newtext = xmlDoc.createTextNode(bandSet[i]);
					bandDom.appendChild(newtext);
					presetDOM.appendChild(bandDom);
				}
				var find = false
				for (var i = 0, sz = presets.length; i < sz; i++){
					if(presets[i].getAttribute("name") > preset_name && !find){
						oldy = presets[i];
						find = true;
					}
				}
				rootNode.insertBefore(presetDOM,oldy);
				//rootNode.appendChild(presetDOM);
				
				alert(strbundle.getString("alertPresetSaved"));
				//alert("Preset Saved");
				
				//save file
				eqpresets.saveXMLDocument(xmlDoc,path);
				//Change the preset selected
				var pref = Components.classes["@mozilla.org/preferences-service;1"]
				  .getService(Components.interfaces.nsIPrefBranch2);
				pref.setCharPref("songbird.eq.currentpreset",preset_name);
				//reload list
				eqpresets.loadList();
			}else{
				//create a new preset
				var presetDOM = xmlDoc.createElement("preset");
				presetDOM.setAttribute("name",preset_name);
				
				for(i = 0; i < 10; i++){
					var bandDom = xmlDoc.createElement("band");
					var newtext = xmlDoc.createTextNode(bandSet[i]);
					bandDom.appendChild(newtext);
					presetDOM.appendChild(bandDom);
				}
				rootNode.replaceChild(presetDOM,oldy);
				
				alert(strbundle.getString("alertPresetModified"));
				//alert("Preset modified");
				
				//save fichier
				eqpresets.saveXMLDocument(xmlDoc,path);
				//Change the preset selected
				var pref = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch2);
				pref.setCharPref("songbird.eq.currentpreset",preset_name);
				//reload list
				eqpresets.loadList();
			}
		}else{
			alert(strbundle.getString("alertPresetNameMissing"));
			//alert("Preset Name Missing");
			
		}
	},
	deletePreset: function(){
		//retrieve the string bundle
		var strbundle = document.getElementById("messages");
		
		var preset = document.getElementById("preset_name").value;
		
		// Reading the presets file
		var path = eqpresets.getFilePathInProfile("equalizer_presets.xml");
		var xmlDoc = eqpresets.readXMLDocument(path);
		
		var rootNode = xmlDoc.documentElement;
		var node = null;
		var presets = rootNode.getElementsByTagName("preset");
		//Parsing presets from the settings file
		for (var i = 0, sz = presets.length; i < sz; i++)
			if(presets[i].getAttribute("name") == preset)
					node = presets[i];
					
		if(node != null){
			rootNode.removeChild(node);
			eqpresets.saveXMLDocument(xmlDoc,path);
			eqpresets.loadList();
			document.getElementById("preset_name").value="";
			alert(strbundle.getString("alertPresetBegin")+" "+preset+" "+strbundle.getString("alertPresetDeletedEnd"));
			//alert("Preset Deleted");
		}else{
			alert(strbundle.getString("alertPresetBegin")+" "+preset+" "+strbundle.getString("alertPresetUndeletedEnd"));
			//alert("Preset undeleted");
		}
	},
	restorePreset: function(){
		//retrieve the string bundle
		var strbundle = document.getElementById("messages");
        
		if(confirm(strbundle.getString("alertPresetRestore"))){
			var path = eqpresets.getFilePathInProfile("equalizer_presets.xml");
			
			//Write settings file
			var presets = eqpresets.getDefaultPresets();
				
			// creation of DOM parser
			var parser = Components.classes["@mozilla.org/xmlextras/domparser;1"]
						.createInstance(Components.interfaces.nsIDOMParser);
				
			// création of file content
			var datas = eqpresets.createXMLString(presets);
			
			//create DOM document
			var DOMDoc = parser.parseFromString(datas,"text/xml");
				
			//Save it in ProfD
			eqpresets.saveXMLDocument(DOMDoc,path);
			
			//reload list
			eqpresets.loadList();
		
		}
	},
};

window.addEventListener("load", function(e) { eqpresets.onLoad(e); }, false);
