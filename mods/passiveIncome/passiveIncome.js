const fs = require('fs');
const path= require('path'); // This is needed to make paths friendly across OS's
const configFile=path.join(__dirname,"config.json");
const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
const stationsFolder = path.join(__dirname,"stations"); // __dirname = a variable available in node.js that resolves to the current directory your script is in.  path.join puts them together to make the full path needed.

if (!global.passiveIncomeTicked){
    global.passiveIncomeTicked=false; // This is to ensure the loop works properly even if the script is reloaded.
}
const miscHelpers=global.miscHelpers; // Some random, but very useful helper functions I added.
miscHelpers.ensureFolderExists(stationsFolder);
const objectHelper=global.objectHelper;

global.event.on("init", init); 
function init(){ // This is where we register commands and do other prep.  This happens after all other mods are loaded in.  "Commands" are actually a mod I wrote for the wrapper.
    console.log("@#$#@$@# registering station command!");
    global.regCommand("station","Station Stuff",false,true); // command, category, adminOnly, displayInHelp
    if (!global.passiveIncomeTicked){ // We only want to start the loop if it wasn't already started.
        console.log("Resource ticker for passiveIncome mod commencing..");    
        incomeTick();
    }
}

function i(input,input2){ // I use this to do easy case insensitive matching for commands since javascript is case sensitive 
    if (typeof input == "string" && typeof input2 == "string"){
        return input.toLowerCase() === input2.toLowerCase();
    } else {
        throw new Error("Invalid input given to 'i' function!  Needs two strings!");
    }
}

global.event.on('command', command);
async function command (player,command,args,messageObj) {
    if (i(command,"station")) { //station
        if (i(args[0],"set")) { //station set
            if (i(args[1],"mining")){ //station set mining
                await player.msg("Adding a mining station..");
                try {
                    let playerEntity=await player.currentEntity();
                    if (playerEntity) {
                        var entityType=await playerEntity.type();
                        if (entityType == "station"){
                            let playerFaction=await player.faction();
                            if (playerFaction){ // If the player is not in a faction, this will return null
                                await addMiningStation(playerEntity, playerFaction,function(err,result){
                                    if (err){
                                        console.log("There was an error adding the station: ",err);
                                        return player.msg("There was an error adding the station!  Please try again!");
                                    } else {
                                       return player.msg("Added the station as a mining rig!") 
                                    }
                                }); 
                            } else {
                                await player.msg("You must be in a faction to designate a station as a mining facility!  Please join a faction first!");
                            }
                        } else {
                            await player.msg(`Error:  You may only designate a station as a mining facility!  You are in a ${entityType} not a station!`);
                            await player.msg("Please enter a build block for the station you would like to designate.");    
                        }
                    } else {
                        await player.msg("To designate a station as a mining facility, you must be in control of the station.  Please enter a build block for the station you would like to designate.");
                    }
                } catch (err) {
                    console.log("An error happened when attempting to set the mining area for player: " + player.toString(),err);
                    console.dir(err);
                }
            }
        } else if (i(args[0],"extract")) {
            let playerFactionObj = await player.faction();
            let playerCurrentEntity=await player.currentEntity();
            let playerCurrentEntityType;
            if (playerCurrentEntity){
                playerCurrentEntityType=await playerCurrentEntity.type();
                if (playerCurrentEntityType=="station"){
                    var stationFile=path.join(stationsFolder,playerCurrentEntity.toString() + ".json"); // For an EntityObj, using ".toString()" on it returns the UID of the entity.
                    // To extract, there must have been a file written.  Let's check for that file.
                    console.log("Checking to see if the file exists: " + stationFile);
                    if (miscHelpers.existsAndIsFile(stationFile)){
                        // Now let's read that file to ensure the player is in the faction the station is registered under.
                        fs.readFile(stationFile,'utf8',function(err,result){
                            if (err){
                                throw err;
                            }
                            let registeredStationObj=JSON.parse(result);
                            console.log("registeredStationObj:",registeredStationObj);
                                let storageList = registeredStationObj.storage;
                                let storageListCopy = objectHelper.copyArray(storageList);
                                console.log("storageList:",storageList);
                                if (storageList){ // This needs to be here since you've decided to use "null" as a temporary value rather than an empty array
                                    // for (i in storageList) { // This isn't doing what you think it's doing.  This cycles through the keys of the object, which includes methods added by javascript and node.js.
                                    var itemNumber; // Don't declare a new variable for each for loop, reuse the same one.
                                    var itemCount;
                                    var promiseArray=[];
                                    for (let i=0;i<storageList.length;i++) { // When cycling through an array, use this kind of "for loop", so it's only checking individual values stored in the array, not the keys of the object.
                                        itemNumber=storageList[i].item; // <-- I'm guessing this is going to be the item number, right?
                                        itemCount=Number(storageList[i].count);
                                        // runSimpleCommand("/give " + player.name + " " + item + " " + count); // Use the player object to give them the item
                                        if (itemCount > 0){
                                            promiseArray.push(player.giveId(itemNumber,itemCount).catch((err) => err)); // This makes each promise return the ErrorObj as the result when using Promise.all to resolve all the promises.
                                        }
                                    }
                                    console.log("promiseArray.length: " + promiseArray.length);
                                    // player.giveId returned a bunch of promise objects, so now we need to resolve them all now and handle any errors that may have happened.
                                    Promise.all(promiseArray).then(function(values) { // This will wait till all PlayerObj.giveId methods have finished.
                                        console.log("values.length: " + values);
                                        let failure=false;
                                        let success=false;
                                        for (let i=0;i<values.length;i++) {
                                            // cycle through the list of promises and check each one to see that each command was errored, successful, or not successful
                                            if (values[i]){ // This will be a true value or error object, which will be truthy.
                                                if (values[i] instanceof Error){ // Since we had each promise return an Error object as it's return value, we need to check each result
                                                    console.log("Error giving player item: " + storageListCopy[i] + " -- Skipping..");
                                                    failure=true;
                                                } else {
                                                    // this one succeeded! Queue this number in the array to be removed.
                                                    console.log("Successfully gave item: " + storageListCopy[i].item + "  Count: " + storageListCopy[i].count);
                                                    storageList.splice(storageList.indexOf(storageListCopy[i]), 1); // Removes 1 value in the Array at the location specified.  This will also make changes to the registeredStationObj object
                                                    success=true;
                                                }
                                            } else {
                                                failure=true; // The command went through, but it failed, probably because the player went offline or maybe the item id was invalid or something.
                                            }
                                        }
                                        // We wait before removing the values, because we need to array of attempts to be exactly equal to the number of items attempted to be given
                                        if (success && !failure){
                                            player.msg("Succeeded in giving you " + values.length + " items! Yay!").catch((err) => console.error(err));
                                        } else if (!success && !failure){
                                            player.msg("There were items to give at this time!  Please try again later!").catch((err) => console.error(err));
                                        } else if (success){
                                            player.msg("Succeeded in giving you somes items! Yay!  But one or more items failed.. Try again to collect the rest!").catch((err) => console.error(err));
                                        } else if (failure){
                                            player.msg("One or more items failed to be given! Please try again!").catch((err) => console.error(err));
                                        }
                                        if (success){ // Only overwrite to the file if any values were changed.
                                            console.log("Overwriting mining station file: " + stationFile);
                                            fs.writeFile(stationFile, JSON.stringify(registeredStationObj, null, 4),function(err){
                                                if (err){ // Hopefully there is never a problem over-writing the file.. but in case there is, we should handle the problem.
                                                    global.log("[passiveIncome] ERROR during '!station extract' command!  Could not overwrite file: " + stationFile + " Player: " + player.toString());
                                                    console.log("ERROR: Could not overwrite file: " + stationFile,err);
                                                } else {
                                                    console.log("Write succeeded!");
                                                }
                                            });
                                        }
                                    });
                                }  
                            //} else {
                               // player.msg("Cannot collect from this station! Your faction did not register this station!").catch((err) => console.error(err));
                          //  }
                        });
                    } else {
                        await player.msg("Sorry, but that station is not a registered mining rig!  Cannot harvest resources from it!");
                    }

                } else {
                    await player.msg("You must be in a registered station mining station to collect it's resources!  You are in a " + playerCurrentEntityType + "!");
                }


            } else { // The player was not in an entity
                await player.msg("How can you extract from that which does not exist?  Please enter a station entity that has been registered as a mining factility to collect!");
            }
        } else if (i(args[0],"refill")) {
            return player.isAdmin("",function(err,result){
                if (err){
                    console.log("Error seeing if player was an admin!").catch((err) => console.error(err));
                } else if (result == true){
                    player.msg("Refilling this station's resources!").catch((err) => console.error(err));
                    addResources();
                } else {
                    player.msg("Sorry, only admins can refill a station!").catch((err) => console.error(err));
                }
            });
        }
    }
    return true; // added to make ESLint happy.
}

function addMiningStation(stationObj,factionObj,cb) {
    console.log("addMiningStation function ran..");
    let stationType = "mining";
    let factionNumber = factionObj.toString();
    let storedResources = [];
    return writeStationData(stationObj.fullUID, stationType, factionNumber, storedResources, cb); // Always return your last command to allow the calling function to handle an error if one occurs
}

function writeStationData(stationUID, stationType, faction, storedResources, cb) {
    let station = {
        "UID": stationUID,
        "type": stationType,
        "faction": faction,
        "storage": storedResources
    };
    let stationFile=path.join(stationsFolder,stationUID + ".json");
    try { // This may not catch errors since we are using asyncronous functions below.
        return fs.writeFile(stationFile, JSON.stringify(station, null, 4), cb);
    } catch (err){
        return cb(err,null);
    }
}




function modifyStationValues(filePath){
    let resourceConfig = config.resourcesToAdd;
    return fs.readFile(filePath,"utf8",function(err,result){
        if (err){
            console.log("Error reading file (skipping!): " + filePath);
            console.dir(err);
            return err;
        } else {
            let stuffToAdd={};
            for (let i=0;i<resourceConfig.length;i++) {
                if (stuffToAdd.hasOwnProperty(resourceConfig[i].item)){ // If the item has duplicates, add the number counts together.
                    stuffToAdd[resourceConfig[i].item]=Number(stuffToAdd[resourceConfig[i].item]) + Number(resourceConfig[i].count);
                } else {
                    stuffToAdd[resourceConfig[i].item]=resourceConfig[i].count;
                }
            }
            let fileContents=JSON.parse(result);
            // {
            //     "UID": "ENTITY_SPACESTATION_Planet_Sol",
            //     "type": "mining",
            //     "faction": "10003",
            //     "storage": []
            // }
            let resourceList = fileContents.storage;
            let resourcesAdded=[];
            for (let i=0;i<resourceList.length;i++){
                for (let key in stuffToAdd){
                    if (stuffToAdd.hasOwnProperty(key)){ // Only act on elements I added, not javascript protype functions
                        if (resourceList[i].item == key){
                            resourceList[i].count=Number(stuffToAdd[key]) + Number(resourceList[i].count);
                            resourcesAdded.push(key);
                        }
                    }
                }
            }
            // Now that we've gone through the array, we need to remove the items already added, and add new values for anything that wasn't.
            
            for (let i=0;i<resourcesAdded.length;i++){
                Reflect.deleteProperty(stuffToAdd, resourcesAdded[i]); // Delete the element since it was already added.
            }
            for (let key in stuffToAdd){ // Go back over the rest of the stuff to add, adding new values to the file object..
                if (stuffToAdd.hasOwnProperty(key)){
                    resourceList.push({"item":key,"count":stuffToAdd[key]});
                }
            }
            // All done modifying the fileContents, so let's write them
            return fs.writeFile(filePath,JSON.stringify(fileContents, null, 4),function(err){
                if (err){ // We should never have trouble writing to hte file.. hopefully..
                    console.log("Unable to write new values to file: " + filePath);
                    console.dir(err);
                    global.log("Unable to write new values to file: " + filePath);
                    return err;
                } else {
                    return true;
                }
            });
        }
    });
}


function addResources() {
    // let config = JSON.parse(config);
    let fileList=miscHelpers.getFiles(stationsFolder);
    for (let i=0;i<fileList.length;i++){
        modifyStationValues(fileList[i]);
    }
    // fs.readdir(folderPath, (err, files) => {
    //     files.forEach(file => {
    //         for (x in files) {
    //             let stationData = JSON.parse(file);
    //             let stationUID = stationData.UID;
    //             let stationFaction = stationData.Faction;
    //             let resourceList = stationData.Storage;
    //             for(y in resourceList) {
    //                 let count = y.count;
    //                 writeStationData(stationUID, "mining", stationFaction, resourceList + addedResources);
    //             }
    //         }
    //     });
    // });
    // console.log("Resources have been added to mining stations!");
}

function sleep(ms) { // This will only work within async functions.
    return new Promise((resolve) => setTimeout(resolve, ms));
}

global.event.on("passiveIncomeTick", incomeTick); // This is the loop you want.  This ensures reloading the mod won't start more than 1 loop, since this function probably stays in memory even if the mod is reloaded.  This needs to be tested though.
async function incomeTick(){
    global.passiveIncomeTicked=true; // The clock has been started!
    await sleep(900000);
    addResources();
    tick();
    return true;
}
function tick(){ // use incomeTick to get things started, not this function.
    global.event.emit("passiveIncomeTick");
}
