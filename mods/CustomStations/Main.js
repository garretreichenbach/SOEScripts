const fs = require('fs');
const path= require('path'); // This is needed to make paths friendly across OS's
const configFile=path.join(__dirname,"config.json");
const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));

const modName = "CustomStations";
const modVersion = "0.2.1";
const modAuthor = "TheDerpGamer";

function i(input,input2){ // I use this to do easy case insensitive matching for commands since javascript is case sensitive 
    if (typeof input == "string" && typeof input2 == "string") {
        return input.toLowerCase() === input2.toLowerCase();
    } else {
        throw new Error("Invalid input given to 'i' function!  Needs two strings!");
    }
}

global.event.on("init", init); // Initialization
function init() { 
    console.log("Loading " + modName + "v" + modVersion + "!");

    registerCommands();
}

global.event.on('command', command); // Command Handler
async function command (player, command, args, messageObj) {
    if(i(command,"station")) { // station
        if(i(args[0],"set")) { // station set
            if(i(args[1],"mining")) { // station set mining
                if(stationCheck(player) == true) {

                }
            } else if(i(args[1], "outpost")) { // station set outpost
                if(stationCheck(player) == true) {
                    
                }
            }
        }
    }
}

function registerCommands() {
    global.regCommand("station", "CustomStations", false, true); // <command>, <category>, <adminOnly>, <displayInHelp>
}