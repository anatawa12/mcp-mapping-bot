import {getVersions, MCPVersions} from "./mcpMappingManager";
import Conf from "conf";
import {BotMain} from "./BotMain";
import {Future} from "./Future";
import {Client} from "discord.js";

//main
(async () => {
    const configFile = new Conf<ConfigFile>({
        defaults: {
            "version-channels": {},
        },
        cwd: "."
    });
    const versions = await getVersions();

    const channelMap: { [mc: string]: string | undefined } = {};

    Object.keys(configFile.get("version-channels"))
        .filter((mc) => versions.getMCVersions().indexOf(mc) == -1)
        .forEach((mc) => {
            console.warn(`mc(${mc}) is not found from mcp versions`)
        });

    const getter = new ChannelBotGetter(versions);
    const channels = configFile.get("version-channels");
    const bot = new Client();

    bot.on("message", async (message) => {
        if (message.author.bot) return;
        if (message.content.startsWith("!mcp")) {
            const [mcp, register, version] = message.content.split(' ');
            if (mcp != "!mcp") return
            if (!register) {
                await message.channel.send("!mcp register <minecraft version>" +
                    "!mcp unregister");
                return
            }
            switch (register) {
                case "register": {
                    if (!version) {
                        await message.channel.send("!mcp register <minecraft version>\n\n" +
                            "!mcp unregister");
                        return
                    }
                    if (channelMap[message.channel.id]) {
                        await message.channel.send(`this channel is already registered for some version.`);
                        return
                    }
                    if (versions.getMCVersions().indexOf(version) == -1) {
                        await message.channel.send(`version ${version} not found from mcp.`);
                        return
                    }
                    channels[version] = [...channels[version] ?? [], message.channel.id];
                    configFile.set("version-channels", channels);
                    channelMap[message.channel.id] = version;
                    await getter.get(version);
                    await message.channel.send(`register successful`);
                    break
                }
                case "unregister": {
                    const version = channelMap[message.channel.id];
                    if (!version) {
                        await message.channel.send(`this channel is not registered.`);
                        return
                    }
                    channels[version] = channels[version] && channels[version].filter(it => it != message.channel.id);
                    configFile.set("version-channels", channels);
                    channelMap[message.channel.id] = undefined;
                    await message.channel.send(`unregister successful`);
                    break
                }
                default:
                    await message.channel.send("!mcp register <minecraft version>" +
                        "!mcp unregister");
                    return
            }
        } else {
            const version = channelMap[message.channel.id];
            if (version) {
                (await getter.get(version)).onMessage(message);
            }
        }
    });

    await bot.login(configFile.get("discord-token"));
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
