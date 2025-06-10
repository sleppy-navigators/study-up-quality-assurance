import {faker} from '@faker-js/faker';
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
import {calculateProgress, closeStream, ensureDirectory, removeFileIfExists} from './util.js';

// Get current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration for ChatMessage dummy data
const CONFIG = {
    TOTAL_GROUPS: 10000,
    MESSAGES_PER_GROUP: 1500,
    SENDER_TYPE: "BOT",
    LOG_INTERVAL: 100, // Log output interval (in groups)
    OUTPUT_DIR: path.join(__dirname, '..', 'out'),
    OUTPUT_FILE: 'chatMessages.json'
};

// Message generation function
function generateMessage(groupId, index) {
    // Time calculation logic explanation:
    // 1. Date.now(): Returns current time in milliseconds (e.g., 1710921600000)
    // 2. (1500 - index): 
    //    - index increases from 0 to 1499
    //    - therefore (1500 - index) decreases from 1500 to 1
    //    - this ensures messages are created in chronological order
    // 3. 1000 * 60 * 60: Converts 1 hour to milliseconds
    //    - 1000: 1 second = 1000 milliseconds
    //    - 60: 1 minute = 60 seconds
    //    - 60: 1 hour = 60 minutes
    //    - result: 3,600,000 milliseconds = 1 hour
    //
    // Example:
    // - when index=0: 1500 hours ago from now
    // - when index=1499: 1 hour ago from now
    // - results in 1500 messages with 1-hour intervals
    const createdAt = new Date(Date.now() - (CONFIG.MESSAGES_PER_GROUP - index) * 1000 * 60 * 60).toISOString();

    return {
        senderId: groupId,
        groupId: groupId,
        content: faker.lorem.sentence(),
        senderType: CONFIG.SENDER_TYPE,
        actionList: [],
        createdAt: {$date: createdAt},
        updatedAt: {$date: createdAt}
    };
}

// Main execution function for ChatMessage dummy data generation
async function generateChatMessageDummyData() {
    console.log('Starting ChatMessage dummy data generation...');
    console.log(`Total groups: ${CONFIG.TOTAL_GROUPS}`);
    console.log(`Messages per group: ${CONFIG.MESSAGES_PER_GROUP}`);
    console.log(`Expected total messages: ${CONFIG.TOTAL_GROUPS * CONFIG.MESSAGES_PER_GROUP}`);

    // Check and create output directory
    const outputDir = ensureDirectory(CONFIG.OUTPUT_DIR);
    const outputPath = path.join(outputDir, CONFIG.OUTPUT_FILE);

    // Remove existing file if it exists
    removeFileIfExists(outputPath);

    const writeStream = fs.createWriteStream(outputPath);
    let totalMessages = 0;

    try {
        for (let groupId = 1; groupId <= CONFIG.TOTAL_GROUPS; groupId++) {
            for (let i = 0; i < CONFIG.MESSAGES_PER_GROUP; i++) {
                const message = generateMessage(groupId, i);
                writeStream.write(JSON.stringify(message) + '\n');
                totalMessages++;
            }

            // Progress logging
            if (groupId % CONFIG.LOG_INTERVAL === 0) {
                const progress = calculateProgress(groupId, CONFIG.TOTAL_GROUPS);
                console.log(`Progress: ${progress}% (${groupId}/${CONFIG.TOTAL_GROUPS} groups processed)`);
            }
        }

        // Close stream
        await closeStream(writeStream);
        console.log('\nChatMessage dummy data generation completed!');
        console.log(`Total messages generated: ${totalMessages}`);
        console.log(`Output file location: ${outputPath}`);

    } catch (error) {
        console.error('Error occurred:', error);
        process.exit(1);
    }
}

// Execute ChatMessage dummy data generation
generateChatMessageDummyData().catch(error => {
    console.error('Fatal error occurred:', error);
    process.exit(1);
});
