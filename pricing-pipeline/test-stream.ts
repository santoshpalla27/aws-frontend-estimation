/**
 * Test streaming parser to debug why it's not working
 */

import * as fs from "fs";
import * as path from "path";
import Chain from "stream-chain";
import Parser from "stream-json";
import StreamObject from "stream-json/streamers/StreamObject.js";

const RAW_FILE = path.join(process.cwd(), "raw", "ec2.json");

async function testStreaming() {
    console.log("Testing streaming parser...");
    console.log(`File: ${RAW_FILE}`);
    console.log(`File exists: ${fs.existsSync(RAW_FILE)}`);

    if (!fs.existsSync(RAW_FILE)) {
        console.error("File does not exist!");
        return;
    }

    const stats = fs.statSync(RAW_FILE);
    console.log(`File size: ${(stats.size / 1024 / 1024 / 1024).toFixed(2)} GB\n`);

    let eventCount = 0;
    let productCount = 0;

    const pipeline = new Chain([
        fs.createReadStream(RAW_FILE),
        Parser(),
        new StreamObject()
    ]);

    pipeline.on('data', (data: any) => {
        eventCount++;

        if (eventCount <= 10) {
            console.log(`Event ${eventCount}:`, {
                key: data.key,
                valueType: typeof data.value,
                hasAttributes: !!data.value?.attributes
            });
        }

        if (data.key?.startsWith('products.')) {
            productCount++;
            if (productCount <= 5) {
                console.log(`\nProduct ${productCount}:`, {
                    key: data.key,
                    instanceType: data.value?.attributes?.instanceType,
                    location: data.value?.attributes?.location
                });
            }
        }

        if (eventCount % 100000 === 0) {
            console.log(`Processed ${eventCount.toLocaleString()} events, ${productCount} products...`);
        }
    });

    pipeline.on('end', () => {
        console.log(`\n✓ Stream complete!`);
        console.log(`Total events: ${eventCount.toLocaleString()}`);
        console.log(`Total products: ${productCount.toLocaleString()}`);
    });

    pipeline.on('error', (err) => {
        console.error('Stream error:', err);
    });

    await new Promise<void>((resolve) => {
        pipeline.on('end', resolve);
    });
}

testStreaming().catch(console.error);
