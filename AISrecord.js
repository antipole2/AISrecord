// record AIS targets to files for VDR replay

const frequency = 30;	// how often to look at AIS targets (seconds)
const range = 5.0;	// only record targets within this distance (nm)  (0 for all)
const minDistance = 0.001;	// distance in nm to have moved before new record
const ghost = 30;	// time in seconds before ghost target removed
const adviseTime = 5; // seconds to display notifications.  Set to 0 to supress

scriptName = "AISrecord";
scriptVersion = 0.1;

// need plugin v3.0.6 or later
	{
	v = OCPNgetPluginConfig();
	version = v.PluginVersionMajor + (v.PluginVersionMinor/10);
	if ((version < 3) || (version == 3) && (v.patch < 6)) throw(scriptName + " requires plugin v3.0.6 or later.");
	}
consoleName(scriptName);
sender = "JS";	//NMEA sender to use
trace = false;
checkForUpdates();

targets = {};	// will be targets we are tracking

File = require("File");
Position = require("Position");

onAllSeconds(look, frequency);
onAllSeconds(pruneGhosts, 30);
consolePark();

function look(){
	thisMoment = new Date;
	myPosition = OCPNgetNavigation().position;
	nowSeconds = thisMoment.getTime()/1000;	//seconds since 1 Jan 1970
	if (trace) print("nowSeconds ", nowSeconds, "\n");
	momentString = thisMoment.toTimeString();
	UTC = momentString.slice(0,2) + momentString.slice(3,5) + momentString.slice(6,12);	// in GLL format
	seen = OCPNgetAISTargets();
	if (trace) print(seen.length, " targets at ", thisMoment, "\n");
	for (var s = 0; s < seen.length; s++){
		thisOne = seen[s];
		if ((range > 0) && (OCPNgetVectorPP(thisOne.position, myPosition).distance > range)) continue; // skip if too far away
		mmsi = thisOne.MMSI;
		thisOne.shipName = thisOne.shipName.trim();
		if (typeof targets[mmsi] == "undefined"){	//new target
			if (trace) print("New MMSI ", mmsi, "\n");
			shipName = thisOne.shipName.replace(/ /g, "_").slice(0, 10);	// sanitise and truncate
			fileName = mmsi.toString() + "-" + shipName + ".txt";
			advise("New target " + mmsi + " " + thisOne.shipName);
			file = new File(fileName, APPEND);
			targets[mmsi] = {file: file, position: thisOne.position};
			}
		else {
			if (trace) print("Known MMSI ", mmsi, "\n");
			if (OCPNgetVectorPP(thisOne.position, targets[mmsi].position).distance < minDistance){
				// has not moved enough
				targets[mmsi].seconds = nowSeconds;
				continue;	// nothing else
				}
			targets[mmsi].position = thisOne.position;
			advise(mmsi + " " + thisOne.shipName + " has moved");
			}
		targets[mmsi].seconds = nowSeconds;
		targets[mmsi].shipName = thisOne.shipName;
		file = targets[mmsi].file;	// this is the file to use
//		formattedPos = new Position(thisOne.position).formatted;
		if (trace) print("Building sentences\n");
		sentence = "$" + sender + "GLL," + new Position(thisOne.position).NMEA + "," + UTC + ",A,A";
		buffer = sentence + "*" + NMEA0183checksum (sentence) + "\n";
		sentence = "$" + sender + "VTG," + thisOne.COG + ",T,,M," + thisOne.SOG + ",N,,K,A";
		buffer += sentence + "*" + NMEA0183checksum (sentence) + "\n";
		sentence = "$" + sender +"HDT," + thisOne.HDG + ",T";
		buffer += sentence + "*" + NMEA0183checksum (sentence) + "\n";
		file.writeText(buffer);
		if (trace) print("Buffer written\n");
		}
	}
function pruneGhosts(){
	nowSeconds = new Date().getTime()/1000;	//seconds since 1 Jan 1970
	const keys = Object.keys(targets);
	if (trace) print("Checking ", keys.length, " for ghosts at ", nowSeconds, " seconds\n");
	for (var k = 0; k < keys.length; k++){
		target = targets[keys[k]];
		if (trace) print("Key ", k, " target.seconds ", target.seconds, "\n");
		if ((nowSeconds - target.seconds) > ghost){
			if (trace) print("Key ", k, "\t", target.mmsi, " ghosted\n");
			advise(keys[k] + " ghosted");
			delete targets[keys[k]];
			}
		}
	}
var adviseTimer = 0;

function advise(text){
	if (adviseTime == 0) return;
	alert(text);
	if (adviseTimer != 0) onSeconds(adviseTimer);	// cancel existing timer, if any
	adviseTimer = onSeconds(clearAdvise, adviseTime);
	}

function clearAdvise(){
	alert(false);
	}

function checkForUpdates(){
	if (!OCPNisOnline()) return;
	now = new Date().getTime();
	checkDays = 5;	// how often to check
	if (_remember.hasOwnProperty("versionControl")){
		if (trace) print("_remember: ", JSON.stringify(_remember), "\n");
		lastCheck = _remember.versionControl.lastCheck;
		nextCheck = lastCheck + checkDays*24*60*60*1000;
		if (trace) print("now: ", now, "\tversionControl.lastCheck was ", lastCheck, "\tnext due ", nextCheck, "\n");
		if (now < nextCheck){
			_remember.versionControl.lastCheck = now;
			return;
			}
		}
	choice = messageBox("Are you truely on-line to the internet?", "YesNo", "checkVersion");
	if (choice == 3){
		_remember.versionControl.lastCheck = now;
		return;
		}
	choice = messageBox("Are you truely on-line to the internet?", "YesNo", "checkVersion");
	if (choice == 3) return;
	check = require("https://raw.githubusercontent.com/antipole2/JavaScript_pi/master/onlineIncludes/checkForUpdates.js");
	check(scriptVersion, checkDays,
		"https://raw.githubusercontent.com/antipole2/AISrecord/main/AISrecord.js",	// url of script
		"https://raw.githubusercontent.com/antipole2/AISrecord/main/version.JSON"// url of version JSON
		);
	}