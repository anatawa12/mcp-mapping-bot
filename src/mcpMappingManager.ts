import fetch from "node-fetch";

const mappingUrl = "http://export.mcpbot.bspk.rs/mcp_{channel}/{map_ver}-{mc_ver}/mcp_{channel}-{map_ver}-{mc_ver}.zip";
const srgUrl = "http://export.mcpbot.bspk.rs/mcp/{mc_ver}/mcp-{mc_ver}-srg.zip";
const jsonUrl = "http://export.mcpbot.bspk.rs/versions.json";

interface MCPVersion {
    readonly mc: string
    readonly channel: string
    readonly name: string
}

type VersionJson = { [mc: string]: { [channel: string]: string[] } }

export class MCPVersions {
    private json: VersionJson;

    constructor(json: VersionJson) {
        this.json = json
    }

    *getAllVersions() {
        for (const [mc, channels] of Object.entries(this.json)) {
            for (const [channel, versions] of Object.entries(channels)) {
                for (let version of versions) {
                    yield version
                }
            }
        }
    }

    *getByMCVersion(mcVersion: string) {
        for (const [channel, versions] of Object.entries(this.json[mcVersion])) {
            for (let version of versions) {
                yield version
            }
        }
    }

    *getByMCVersionAndChannel(mcVersion: string, channel: string) {
        for (const version of Object.entries(this.json[mcVersion][channel])) {
            yield version
        }
    }

    getMCVersions(): string[] {
        return Object.keys(this.json)
    }
}

export async function getVersions(): Promise<MCPVersions> {
    return new MCPVersions(await (await fetch(jsonUrl)).json());
}
