import {Message} from "discord.js";
import {generateMappingUrl, MCPVersions} from "./mcpMappingManager";
import * as unzipper from "unzipper";
import * as readline from "readline";
import {Future} from "./Future";
import {Readable} from "stream";
import request = require("request");

export class BotMain {
    readonly version: string;

    constructor(version: string) {
        this.version = version;
    }

    private params: CsvMap = null!;
    private methods: CsvMap = null!;
    private fields: CsvMap = null!;

    async init(versions: MCPVersions) {
        console.log(`initializing for ${this.version}`);

        const stables = Array.from(versions.getByMCVersionAndChannel(this.version, "stable"));

        let zipUrl: string;
        if (stables.length != 0) {
            const mcp = stables[stables.length - 1][1];
            console.log(`found stable version: ${mcp}`);
            zipUrl = generateMappingUrl("stable", this.version, mcp);
        } else {
            console.log(`stable version not found.`);
            const snapshot = Array.from(versions.getByMCVersionAndChannel(this.version, "stable")).pop()![1];
            console.log(`found snapshot at: ${snapshot}`);
            zipUrl = generateMappingUrl("snapshot", this.version, snapshot);
        }

        const [paramsCsv, methodsCsv, fieldsCsv] = await getCsvs(zipUrl);

        this.params = csv2Map(paramsCsv);
        this.methods = csv2Map(methodsCsv);
        this.fields = csv2Map(fieldsCsv);

        console.log(`initialized for ${this.version}`);
    }

    async onMessage(message: Message) {
        if (message.author.bot) return;
        if (!message.content.startsWith("!")) return;

        const parts = message.content.split(' ');
        switch (parts[0]) {
            case "!unmap": {
                const mcpName = parts[1];
                if (mcpName == null) {
                    await message.channel.send("!unmap <mcp name of field or method>")
                    return
                }

                const unmapped = this.unmap(mcpName);
                if (unmapped == undefined) {
                    await message.channel.send(`srg: '${mcpName}' not found`);
                    return
                }
                if (unmapped?.length == 1) {
                    await message.channel.send(`'${mcpName}' is not a valid srg name`);
                    return
                }
                await message.channel.send(unmapped.join(' '));
                break;
            }
        }
    }

    unmap(srg: string): string[] | undefined {
        if (srg.startsWith("field_")) {
            return this.fields[srg]
        } else if (srg.startsWith("func_")) {
            return this.methods[srg]
        } else if (srg.startsWith("p_")) {
            return this.params[srg]
        } else {
            return ["not srg"]
        }
    }
}

type CsvMap = { readonly [index: string]: string[] };

function csv2Map(csv: string[][]): CsvMap {
    const result = {} as { [index: string]: string[] };

    for (let csvElement of csv) {
        result[csvElement[0]] = csvElement
    }

    return result
}

async function getCsvs(zipUrl: string) {
    const params = new Future<Promise<string[][]>>();
    const methods = new Future<Promise<string[][]>>();
    const fields = new Future<Promise<string[][]>>();

    function readCsv(stream: Readable) {
        return new Promise<string[][]>((resolve, reject) => {
            const rl = readline.createInterface(stream);
            const lines = [] as string[][];

            rl.on('line', function (line) {
                lines.push(line.split(','))
            });

            rl.on("close", () => {
                resolve(lines);
            });
        });
    }

    request({
        url: zipUrl,
        encoding: null
    })
        .pipe(unzipper.Parse())
        .on('entry', function (entry) {
            const fileName = entry.path;
            if (fileName === "params.csv") {
                params.resolve(readCsv(entry));
            } else if (fileName === "methods.csv") {
                methods.resolve(readCsv(entry));
            } else if (fileName === "fields.csv") {
                fields.resolve(readCsv(entry));
            } else {
                entry.autodrain();
            }
        })
        .on("error", (err) => {
            if (!params.resolved()) params.reject(err);
            if (!methods.resolved()) methods.reject(err);
            if (!fields.resolved()) fields.reject(err);
        })
        .on("end", () => {
            if (!params.resolved()) params.reject(new Error("not found"));
            if (!methods.resolved()) methods.reject(new Error("not found"));
            if (!fields.resolved()) fields.reject(new Error("not found"));
        });

    const promises = await Promise.all([params.promise(), methods.promise(), fields.promise()]);

    return await Promise.all(promises);
}
