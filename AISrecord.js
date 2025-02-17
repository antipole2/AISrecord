// record AIS targets to files for VDR replay

const frequency = 30;	// how often to look at AIS targets (seconds)
const range = 5.0;	// only record targets within this distance (nm)  (0 for all)
const minDistance = 0.001;	// distance in nm to have moved before new record
const ghost = 30;	// time in seconds before ghost target removed
const adviseTime = 5; // seconds to display notifications.  Set to 0 to supress

scriptName = "AISrecord";
scriptVersion = 0.2;

require("pluginVersion")("3.1.1");
consoleName(scriptName);

require("checkForUpdate")(scriptName,  scriptVersion, 5, "https://raw.githubusercontent.com/antipole2/AISrecord/main/version.JSON");
sender = "JS";	//NMEA sender to use
trace = false;

targets = {};	// will be targets we are tracking

File = require("File");
Position = require("Position");

onExit(report);
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

function report(){
	targetCount = Object.keys(targets).length;
	if (targetCount > 0) scriptResult(targetCount, " target(s) seen and files written");
	else scriptResult("No targets seen");
	}