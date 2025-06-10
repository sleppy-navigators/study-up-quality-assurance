import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
import {calculateProgress, closeStream, ensureDirectory, removeFileIfExists} from './util.js';

// Get current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
    TOTAL_USERS: 10000,
    TOTAL_GROUPS: 10000,
    GROUPS_PER_USER: 5, // Average number of groups per user
    MEMBERS_PER_GROUP: 5, // Average number of members per group
    LOG_INTERVAL: 10000, // Log output interval
    OUTPUT_DIR: path.join(__dirname, '..', 'out'),
    OUTPUT_FILE: 'group_members.csv'
};

// Group member generation function
function generateGroupMembers() {
    const now = new Date().toISOString();
    const members = [];

    // For each group, assign members
    for (let groupId = 1; groupId <= CONFIG.TOTAL_GROUPS; groupId++) {
        // Calculate the base user ID for this group
        const baseUserId = Math.floor((groupId - 1) / CONFIG.MEMBERS_PER_GROUP) * CONFIG.MEMBERS_PER_GROUP + 1;

        // Assign members to this group
        for (let i = 0; i < CONFIG.MEMBERS_PER_GROUP; i++) {
            const userId = baseUserId + i;
            if (userId <= CONFIG.TOTAL_USERS) {
                members.push({
                    id: members.length + 1,
                    user_id: userId,
                    group_id: groupId,
                    deleted: false,
                    created_at: now,
                    updated_at: now
                });
            }
        }
    }

    return members;
}

// Main execution function
async function generateGroupMemberDummyData() {
    console.log('Starting group member dummy data generation...');
    console.log(`Total users: ${CONFIG.TOTAL_USERS}`);
    console.log(`Total groups: ${CONFIG.TOTAL_GROUPS}`);
    console.log(`Groups per user: ${CONFIG.GROUPS_PER_USER}`);
    console.log(`Members per group: ${CONFIG.MEMBERS_PER_GROUP}`);

    // Check and create output directory
    const outputDir = ensureDirectory(CONFIG.OUTPUT_DIR);
    const outputPath = path.join(outputDir, CONFIG.OUTPUT_FILE);

    // Remove existing file if it exists
    removeFileIfExists(outputPath);

    const writeStream = fs.createWriteStream(outputPath);
    let totalMembers = 0;

    try {
        // Write CSV header
        writeStream.write('id,user_id,group_id,deleted,created_at,updated_at\n');

        // Generate all members
        const members = generateGroupMembers();

        // Write members to CSV
        for (const member of members) {
            const csvLine = [
                member.id,
                member.user_id,
                member.group_id,
                member.deleted ? 1 : 0,
                `"${member.created_at}"`,
                `"${member.updated_at}"`
            ].join(',') + '\n';

            writeStream.write(csvLine);
            totalMembers++;

            // Progress logging
            if (totalMembers % CONFIG.LOG_INTERVAL === 0) {
                const progress = calculateProgress(totalMembers, members.length);
                console.log(`Progress: ${progress}% (${totalMembers}/${members.length} members generated)`);
            }
        }

        // Close stream
        await closeStream(writeStream);
        console.log('\nGroup member dummy data generation completed!');
        console.log(`Total members generated: ${totalMembers}`);
        console.log(`Output file location: ${outputPath}`);

    } catch (error) {
        console.error('Error occurred:', error);
        process.exit(1);
    }
}

// Execute script
generateGroupMemberDummyData().catch(error => {
    console.error('Fatal error occurred:', error);
    process.exit(1);
}); 
