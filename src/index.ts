import {getVersions} from "./mcpMappingManager";
import * as discord from "discord.js";
import Conf from "conf";

//main
(async ()=>{
    const configFile = new Conf<ConfigFile>({
        defaults: {
            "version-channels": {},
        }
    });
    const versions = await getVersions();

    Object.keys(configFile.get("version-channels"))
        .filter((mc) => versions.getMCVersions().indexOf(mc) == -1)
        .forEach((mc) => {
            console.warn(`mc(${mc}) is not found from mcp versions`)
        })
    discord.Client
})();

interface ConfigFile {
    "version-channels": { [mc: string]: string[] }
    "discord-token"?: string
}
