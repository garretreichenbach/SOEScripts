const stationsFolder = path.join(__dirname, "stations");
const configFile = path.join(__dirname,"config.json");
const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));

exports.refill = function(player) {
    return player.isAdmin("", function(err, result){
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

function modifyStationValues(filePath) {
    let resourceConfig = config.resourcesOnTick;
    return fs.readFile(filePath,"utf8", function(err, result){
        if (err){
            console.log("Error reading file (skipping!): " + filePath);
            console.dir(err);
            return err;
        } else {
            let stuffToAdd = {};
            for (let i = 0; i < resourceConfig.length; i ++) {
                if (stuffToAdd.hasOwnProperty(resourceConfig[i].item)) { // If the item has duplicates, add the number counts together.
                    stuffToAdd[resourceConfig[i].item] = Number(stuffToAdd[resourceConfig[i].item]) + Number(resourceConfig[i].count);
                } else {
                    stuffToAdd[resourceConfig[i].item] = resourceConfig[i].count;
                }
            }
            let fileContents = JSON.parse(result);
            let resourceList = fileContents.storage;
            let resourcesAdded = [];
            for (let i = 0; i < resourceList.length; i ++){
                for (let key in stuffToAdd){
                    if (stuffToAdd.hasOwnProperty(key)){ // Only act on elements I added, not javascript protype functions
                        if (resourceList[i].item == key) {
                            if(resourceList[i].count < 5000000) {
                                resourceList[i].count = Number(stuffToAdd[key]) + Number(resourceList[i].count);
                                resourcesAdded.push(key);
                            } else if(resourceList[i].count >= 5000000) {
                                resourceList[i].count = 5000000;
                                console.log("Tried to add to a station's storage but the storage was already full! Skipping...");
                            }
                        }
                    }
                }
            }
            // Now that we've gone through the array, we need to remove the items already added, and add new values for anything that wasn't.
            
            for (let i = 0; i < resourcesAdded.length; i ++){
                Reflect.deleteProperty(stuffToAdd, resourcesAdded[i]); // Delete the element since it was already added.
            }
            for (let key in stuffToAdd){ // Go back over the rest of the stuff to add, adding new values to the file object..
                if (stuffToAdd.hasOwnProperty(key)){
                    resourceList.push({"item":key,"count":stuffToAdd[key]});
                }
            }
            // All done modifying the fileContents, so let's write them
            return fs.writeFile(filePath, JSON.stringify(fileContents, null, 4), function(err){
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

exports.addResources = function() {
    let fileList = miscHelpers.getFiles(stationsFolder);
    for (let i = 0; i  <fileList.length; i ++){
        modifyStationValues(fileList[i]);
    }
}