import fs from 'fs';
import path from 'path';
import {calculateProgress, closeStream, ensureDirectory, removeFileIfExists} from './util.js';
import {CONFIG} from './config.js';

// Output file configuration
const OUTPUT_FILE = 'huntings.csv';

// Calculate total challenges per group
const CHALLENGES_PER_GROUP = CONFIG.MEMBERS_PER_GROUP *
    (CONFIG.COMPLETED_CHALLENGES_PER_MEMBER + CONFIG.ONGOING_CHALLENGES_PER_MEMBER);

// Hunting generation function
function generateHunting(id, taskId, hunterId) {
    const now = new Date().toISOString();
    return {
        id: id,
        task_id: taskId,
        hunter_id: hunterId,
        amount: 100,
        deleted: false,
        created_at: now,
        updated_at: now
    };
}

// Main execution function
async function generateHuntingDummyData() {
    console.log('Starting hunting dummy data generation...');
    console.log(`Total groups: ${CONFIG.TOTAL_GROUPS}`);
    console.log(`Challenges per group: ${CHALLENGES_PER_GROUP}`);
    console.log(`Failed tasks per challenge: ${CONFIG.COMPLETED_FAILED_TASKS}`);

    // Check and create output directory
    const outputDir = ensureDirectory(CONFIG.OUTPUT_DIR);
    const outputPath = path.join(outputDir, OUTPUT_FILE);

    // Remove existing file if it exists
    removeFileIfExists(outputPath);

    const writeStream = fs.createWriteStream(outputPath);
    let totalHuntings = 0;

    try {
        // Write CSV header
        writeStream.write('id,task_id,hunter_id,amount,deleted,created_at,updated_at\n');

        // For each group
        for (let groupId = 1; groupId <= CONFIG.TOTAL_GROUPS; groupId++) {
            // For each member in the group
            for (let memberIndex = 0; memberIndex < CONFIG.MEMBERS_PER_GROUP; memberIndex++) {
                // Calculate base challenge ID for this member
                const baseChallengeId = (groupId - 1) * CHALLENGES_PER_GROUP +
                    memberIndex * (CONFIG.COMPLETED_CHALLENGES_PER_MEMBER + CONFIG.ONGOING_CHALLENGES_PER_MEMBER) + 1;

                // Calculate hunter ID (next member in the group, or first member if last)
                const hunterIndex = (memberIndex + 1) % CONFIG.MEMBERS_PER_GROUP;
                const hunterId = (groupId - 1) * CONFIG.MEMBERS_PER_GROUP + hunterIndex + 1;

                // Generate huntings for completed challenges
                for (let i = 0; i < CONFIG.COMPLETED_CHALLENGES_PER_MEMBER; i++) {
                    const challengeId = baseChallengeId + i;

                    // Generate huntings for failed tasks
                    for (let j = 0; j < CONFIG.COMPLETED_FAILED_TASKS; j++) {
                        const taskId = (challengeId - 1) * CONFIG.TASKS_PER_CHALLENGE +
                            CONFIG.COMPLETED_SUCCESSFUL_TASKS + j + 1;
                        const hunting = generateHunting(totalHuntings + 1, taskId, hunterId);
                        writeHuntingToCSV(writeStream, hunting);
                        totalHuntings++;
                    }
                }

                // Progress logging
                if (totalHuntings % CONFIG.LOG_INTERVAL === 0) {
                    const progress = calculateProgress(totalHuntings,
                        CONFIG.TOTAL_GROUPS * CONFIG.MEMBERS_PER_GROUP *
                        CONFIG.COMPLETED_CHALLENGES_PER_MEMBER * CONFIG.COMPLETED_FAILED_TASKS);
                    console.log(`Progress: ${progress}% (${totalHuntings} huntings generated)`);
                }
            }
        }

        // Close stream
        await closeStream(writeStream);
        console.log('\nHunting dummy data generation completed!');
        console.log(`Total huntings generated: ${totalHuntings}`);
        console.log(`Output file location: ${outputPath}`);

    } catch (error) {
        console.error('Error occurred:', error);
        process.exit(1);
    }
}

// Helper function to write hunting to CSV
function writeHuntingToCSV(writeStream, hunting) {
    const csvLine = [
        hunting.id,
        hunting.task_id,
        hunting.hunter_id,
        hunting.amount,
        hunting.deleted ? 1 : 0,
        `"${hunting.created_at}"`,
        `"${hunting.updated_at}"`
    ].join(',') + '\n';

    writeStream.write(csvLine);
}

// Execute script
generateHuntingDummyData().catch(error => {
    console.error('Fatal error occurred:', error);
    process.exit(1);
}); 
