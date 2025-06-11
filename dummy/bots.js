import fs from 'fs';
import path from 'path';
import {calculateProgress, closeStream, ensureDirectory, removeFileIfExists} from './util.js';
import {CONFIG} from './config.js';

// Output file configuration
const OUTPUT_FILE = 'bots.csv';

// Bot generation function
function generateBot(groupId) {
    const now = new Date().toISOString();
    return {
        id: groupId, // bot_id is the same as group_id
        group_id: groupId,
        name: `Bot ${groupId}`, // Add bot name
        deleted: false,
        created_at: now,
        updated_at: now
    };
}

// Main execution function
async function generateBotDummyData() {
    console.log('Starting bot dummy data generation...');
    console.log(`Total groups: ${CONFIG.TOTAL_GROUPS}`);

    // Check and create output directory
    const outputDir = ensureDirectory(CONFIG.OUTPUT_DIR);
    const outputPath = path.join(outputDir, OUTPUT_FILE);

    // Remove existing file if it exists
    removeFileIfExists(outputPath);

    const writeStream = fs.createWriteStream(outputPath);
    let totalBots = 0;

    try {
        // Write CSV header
        writeStream.write('id,group_id,name,deleted,created_at,updated_at\n');

        for (let groupId = 1; groupId <= CONFIG.TOTAL_GROUPS; groupId++) {
            const bot = generateBot(groupId);
            const csvLine = [
                bot.id,
                bot.group_id,
                `"${bot.name}"`,
                bot.deleted ? 1 : 0,
                `"${bot.created_at}"`,
                `"${bot.updated_at}"`
            ].join(',') + '\n';

            writeStream.write(csvLine);
            totalBots++;

            // Progress logging
            if (groupId % CONFIG.LOG_INTERVAL === 0) {
                const progress = calculateProgress(groupId, CONFIG.TOTAL_GROUPS);
                console.log(`Progress: ${progress}% (${groupId}/${CONFIG.TOTAL_GROUPS} bots generated)`);
            }
        }

        // Close stream
        await closeStream(writeStream);
        console.log('\nBot dummy data generation completed!');
        console.log(`Total bots generated: ${totalBots}`);
        console.log(`Output file location: ${outputPath}`);

    } catch (error) {
        console.error('Error occurred:', error);
        process.exit(1);
    }
}

// Execute script
generateBotDummyData().catch(error => {
    console.error('Fatal error occurred:', error);
    process.exit(1);
}); 
