import {faker} from '@faker-js/faker';
import fs from 'fs';
import path from 'path';
import {calculateProgress, closeStream, ensureDirectory, removeFileIfExists} from './util.js';
import {CONFIG} from './config.js';

// Output file configuration
const OUTPUT_FILE = 'challenges.csv';

// Calculate total challenges per group
const CHALLENGES_PER_GROUP = CONFIG.MEMBERS_PER_GROUP * (CONFIG.COMPLETED_CHALLENGES_PER_MEMBER + CONFIG.ONGOING_CHALLENGES_PER_MEMBER);

// Get deadline for completed challenges (yesterday 23:59:59)
function getCompletedChallengeDeadline() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(23, 59, 59, 999);
    return yesterday.toISOString();
}

// Get deadline for ongoing challenges (one week later 23:59:59)
function getOngoingChallengeDeadline() {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    nextWeek.setHours(23, 59, 59, 999);
    return nextWeek.toISOString();
}

// Challenge generation function
function generateChallenge(groupId, memberIndex, challengeIndex, isCompleted) {
    const now = new Date().toISOString();
    const baseUserId = Math.floor((groupId - 1) / CONFIG.MEMBERS_PER_GROUP) * CONFIG.MEMBERS_PER_GROUP + 1;
    const ownerId = baseUserId + memberIndex;

    return {
        id: (groupId - 1) * CHALLENGES_PER_GROUP + memberIndex * (CONFIG.COMPLETED_CHALLENGES_PER_MEMBER + CONFIG.ONGOING_CHALLENGES_PER_MEMBER) + challengeIndex + 1,
        group_id: groupId,
        owner_id: ownerId,
        title: faker.lorem.sentence(),
        description: faker.lorem.sentences(2),
        amount: CONFIG.DEFAULT_INITIAL_AMOUNT,
        initial_amount: CONFIG.DEFAULT_INITIAL_AMOUNT,
        deadline: isCompleted ? getCompletedChallengeDeadline() : getOngoingChallengeDeadline(),
        deleted: false,
        created_at: now,
        updated_at: now
    };
}

// Main execution function
async function generateChallengeDummyData() {
    console.log('Starting challenge dummy data generation...');
    console.log(`Total groups: ${CONFIG.TOTAL_GROUPS}`);
    console.log(`Members per group: ${CONFIG.MEMBERS_PER_GROUP}`);
    console.log(`Completed challenges per member: ${CONFIG.COMPLETED_CHALLENGES_PER_MEMBER}`);
    console.log(`Ongoing challenges per member: ${CONFIG.ONGOING_CHALLENGES_PER_MEMBER}`);
    console.log(`Total challenges per group: ${CHALLENGES_PER_GROUP}`);

    // Check and create output directory
    const outputDir = ensureDirectory(CONFIG.OUTPUT_DIR);
    const outputPath = path.join(outputDir, OUTPUT_FILE);

    // Remove existing file if it exists
    removeFileIfExists(outputPath);

    const writeStream = fs.createWriteStream(outputPath);
    let totalChallenges = 0;

    try {
        // Write CSV header
        writeStream.write('id,group_id,owner_id,title,description,amount,initial_amount,deadline,deleted,created_at,updated_at\n');

        for (let groupId = 1; groupId <= CONFIG.TOTAL_GROUPS; groupId++) {
            for (let memberIndex = 0; memberIndex < CONFIG.MEMBERS_PER_GROUP; memberIndex++) {
                // Generate completed challenges
                for (let i = 0; i < CONFIG.COMPLETED_CHALLENGES_PER_MEMBER; i++) {
                    const challenge = generateChallenge(groupId, memberIndex, i, true);
                    writeChallengeToCSV(writeStream, challenge);
                    totalChallenges++;
                }

                // Generate ongoing challenges
                for (let i = 0; i < CONFIG.ONGOING_CHALLENGES_PER_MEMBER; i++) {
                    const challenge = generateChallenge(groupId, memberIndex, CONFIG.COMPLETED_CHALLENGES_PER_MEMBER + i, false);
                    writeChallengeToCSV(writeStream, challenge);
                    totalChallenges++;
                }

                // Progress logging
                if (totalChallenges % CONFIG.LOG_INTERVAL === 0) {
                    const progress = calculateProgress(totalChallenges, CONFIG.TOTAL_GROUPS * CHALLENGES_PER_GROUP);
                    console.log(`Progress: ${progress}% (${totalChallenges}/${CONFIG.TOTAL_GROUPS * CHALLENGES_PER_GROUP} challenges generated)`);
                }
            }
        }

        // Close stream
        await closeStream(writeStream);
        console.log('\nChallenge dummy data generation completed!');
        console.log(`Total challenges generated: ${totalChallenges}`);
        console.log(`Output file location: ${outputPath}`);

    } catch (error) {
        console.error('Error occurred:', error);
        process.exit(1);
    }
}

// Helper function to write challenge to CSV
function writeChallengeToCSV(writeStream, challenge) {
    const csvLine = [
        challenge.id,
        challenge.group_id,
        challenge.owner_id,
        `"${challenge.title}"`,
        `"${challenge.description}"`,
        challenge.amount,
        challenge.initial_amount,
        `"${challenge.deadline}"`,
        challenge.deleted ? 1 : 0,
        `"${challenge.created_at}"`,
        `"${challenge.updated_at}"`
    ].join(',') + '\n';

    writeStream.write(csvLine);
}

// Execute script
generateChallengeDummyData().catch(error => {
    console.error('Fatal error occurred:', error);
    process.exit(1);
}); 
