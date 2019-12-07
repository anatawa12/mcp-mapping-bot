import {getVersions, MCPVersions} from "./mcpMappingManager";
import Conf from "conf";
import {BotMain} from "./BotMain";
import {Future} from "./Future";

//main
(async () => {
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
        });

    const getter = new ChannelBotGetter(versions);

})();

class ChannelBotGetter {
    versions: MCPVersions;
    private cache: { [index: string]: Future<BotMain> | undefined } = {}

    constructor(versions: MCPVersions) {
        this.versions = versions
    }

    async get(version: string): Promise<BotMain> {
        if (this.cache[version]) {
            return await this.cache[version]!.promise()
        } else {
            const bot = new BotMain(version);
            const future = this.cache[version] = new Future();
            bot.init(this.versions)
                .then(() => future.resolve(bot), e => future.reject(e));

            return await future.promise();
        }
    }
}

interface ConfigFile {
    "version-channels": { [mc: string]: string[] }
    "discord-token"?: string
}
