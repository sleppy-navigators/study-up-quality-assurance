import {faker} from '@faker-js/faker';
import fs from 'fs';
import path from 'path';
import {calculateProgress, closeStream, ensureDirectory, removeFileIfExists} from './util.js';
import {CONFIG} from './config.js';

// Output file configuration
const OUTPUT_FILE = 'tasks.csv';

// Calculate total challenges per group
const CHALLENGES_PER_GROUP = CONFIG.MEMBERS_PER_GROUP * (CONFIG.COMPLETED_CHALLENGES_PER_MEMBER + CONFIG.ONGOING_CHALLENGES_PER_MEMBER);

// Get past date (yesterday)
function getPastDate() {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    return date;
}

// Get future date (one week later)
function getFutureDate() {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date;
}

// Generate URLs for successful tasks
function generateUrls() {
    const urls = Array.from({length: faker.number.int({min: 3, max: 5})}, () => faker.internet.url());
    return urls.join('\n');
}

// Task generation function
function generateTask(challengeId, taskIndex, isSuccessful, isInProgress, challengeDeadline) {
    const now = new Date().toISOString();
    const deadline = isInProgress ? challengeDeadline : getPastDate().toISOString();

    const externalLinks = isSuccessful ? generateUrls() : "";
    const imageUrls = isSuccessful ? generateUrls() : "";
    const certifiedAt = isSuccessful ? getPastDate().toISOString() : "\\N";

    return {
        id: (challengeId - 1) * CONFIG.TASKS_PER_CHALLENGE + taskIndex + 1,
        challenge_id: challengeId,
        title: faker.lorem.sentence(),
        deadline: deadline,
        external_links: externalLinks,
        image_urls: imageUrls,
        certified_at: certifiedAt,
        deleted: false,
        created_at: now,
        updated_at: now
    };
}

// Main execution function
async function generateTaskDummyData() {
    console.log('Starting task dummy data generation...');
    console.log(`Total groups: ${CONFIG.TOTAL_GROUPS}`);
    console.log(`Challenges per group: ${CHALLENGES_PER_GROUP}`);
    console.log(`Tasks per challenge: ${CONFIG.TASKS_PER_CHALLENGE}`);
    console.log(`Total tasks per group: ${CHALLENGES_PER_GROUP * CONFIG.TASKS_PER_CHALLENGE}`);

    // Check and create output directory
    const outputDir = ensureDirectory(CONFIG.OUTPUT_DIR);
    const outputPath = path.join(outputDir, OUTPUT_FILE);

    // Remove existing file if it exists
    removeFileIfExists(outputPath);

    const writeStream = fs.createWriteStream(outputPath);
    let totalTasks = 0;

    try {
        // Write CSV header
        writeStream.write('id,challenge_id,title,deadline,external_links,image_urls,certified_at,deleted,created_at,updated_at\n');

        // For each group
        for (let groupId = 1; groupId <= CONFIG.TOTAL_GROUPS; groupId++) {
            // For each member in the group
            for (let memberIndex = 0; memberIndex < CONFIG.MEMBERS_PER_GROUP; memberIndex++) {
                // Calculate base challenge ID for this member
                const baseChallengeId = (groupId - 1) * CHALLENGES_PER_GROUP +
                    memberIndex * (CONFIG.COMPLETED_CHALLENGES_PER_MEMBER + CONFIG.ONGOING_CHALLENGES_PER_MEMBER) + 1;

                // Generate tasks for completed challenges
                for (let i = 0; i < CONFIG.COMPLETED_CHALLENGES_PER_MEMBER; i++) {
                    const challengeId = baseChallengeId + i;
                    let taskIndex = 0;

                    // Generate successful tasks
                    for (let j = 0; j < CONFIG.COMPLETED_SUCCESSFUL_TASKS; j++) {
                        const task = generateTask(challengeId, taskIndex++, true, false);
                        writeTaskToCSV(writeStream, task);
                        totalTasks++;
                    }

                    // Generate failed tasks
                    for (let j = 0; j < CONFIG.COMPLETED_FAILED_TASKS; j++) {
                        const task = generateTask(challengeId, taskIndex++, false, false);
                        writeTaskToCSV(writeStream, task);
                        totalTasks++;
                    }
                }

                // Generate tasks for ongoing challenges
                for (let i = 0; i < CONFIG.ONGOING_CHALLENGES_PER_MEMBER; i++) {
                    const challengeId = baseChallengeId + CONFIG.COMPLETED_CHALLENGES_PER_MEMBER + i;
                    const challengeDeadline = getFutureDate().toISOString();
                    let taskIndex = 0;

                    // Generate successful tasks
                    for (let j = 0; j < CONFIG.ONGOING_SUCCESSFUL_TASKS; j++) {
                        const task = generateTask(challengeId, taskIndex++, true, false, challengeDeadline);
                        writeTaskToCSV(writeStream, task);
                        totalTasks++;
                    }

                    // Generate failed tasks
                    for (let j = 0; j < CONFIG.ONGOING_FAILED_TASKS; j++) {
                        const task = generateTask(challengeId, taskIndex++, false, false, challengeDeadline);
                        writeTaskToCSV(writeStream, task);
                        totalTasks++;
                    }

                    // Generate in-progress tasks
                    for (let j = 0; j < CONFIG.ONGOING_IN_PROGRESS_TASKS; j++) {
                        const task = generateTask(challengeId, taskIndex++, false, true, challengeDeadline);
                        writeTaskToCSV(writeStream, task);
                        totalTasks++;
                    }
                }

                // Progress logging
                if (totalTasks % CONFIG.LOG_INTERVAL === 0) {
                    const progress = calculateProgress(totalTasks, CONFIG.TOTAL_GROUPS * CHALLENGES_PER_GROUP * CONFIG.TASKS_PER_CHALLENGE);
                    console.log(`Progress: ${progress}% (${totalTasks}/${CONFIG.TOTAL_GROUPS * CHALLENGES_PER_GROUP * CONFIG.TASKS_PER_CHALLENGE} tasks generated)`);
                }
            }
        }

        // Close stream
        await closeStream(writeStream);
        console.log('\nTask dummy data generation completed!');
        console.log(`Total tasks generated: ${totalTasks}`);
        console.log(`Output file location: ${outputPath}`);

    } catch (error) {
        console.error('Error occurred:', error);
        process.exit(1);
    }
}

// Helper function to write task to CSV
function writeTaskToCSV(writeStream, task) {
    const csvLine = [
        task.id,
        task.challenge_id,
        `"${task.title}"`,
        `"${task.deadline}"`,
        `"${task.external_links.replace(/"/g, '""')}"`,
        `"${task.image_urls.replace(/"/g, '""')}"`,
        task.certified_at ? `"${task.certified_at}"` : "",
        task.deleted ? 1 : 0,
        `"${task.created_at}"`,
        `"${task.updated_at}"`
    ].join(',') + '\n';

    writeStream.write(csvLine);
}

// Execute script
generateTaskDummyData().catch(error => {
    console.error('Fatal error occurred:', error);
    process.exit(1);
}); 
