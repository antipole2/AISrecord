# AISrecord
 
This script monitors AIS targets and records their movements into individual files for each target.
These files can be replayed using the VDR plugin.

The script starts with various options, which can be set as required
````
const frequency = 30;	// how often to look at AIS targets (seconds)
const range = 5.0;	// only record targets within this distance (nm)  (0 for all)
const minDistance = 0.001;	// distance in nm to have moved before new record
const ghost = 30;	// time in seconds before ghost target removed
const adviseTime = 5; // seconds to display notifications.  Set to 0 to suppress
````

The `minDistance` setting prevents multiple records when a target is not moving.
A small value allows for a ship swinging at anchor.

## Installing the script

This script needs JavaScript plugin v3.0.6 or later.

It creates one file for each MMSI seen.
These files are created in the plugin's _Current directory_.
You should create an empty directory and then set it as the Current directory in the Directory tab of the plugin's Tools.

The script appends data to any existing file, so you can run the script at different times and accumulate a log.
To clear a log, delete the file.

To install the script:

1. Copy this URL to your clipboard (copy link - do not follow it) `https://raw.githubusercontent.com/antipole2/AISrecord/main/AISrecord.js`
2. In a JavaScript console choose `Load` and then `URL on clipboard`.  The script should be loaded into the script pane.
3. Choose `Run` to start the script.

If you want to run the script when not online, you will need to save it to a local file.  You can tick the _Auto run_ box to have the script start automatically.

Alternatively, you can fork the repository if you want to evolve the script.

## Discussions

To discuss this script's functionality, use the Discussions button above.
