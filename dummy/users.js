import {faker} from '@faker-js/faker';
import fs from 'fs';
import path from 'path';
import {calculateProgress, closeStream, ensureDirectory, removeFileIfExists} from './util.js';
import {CONFIG} from './config.js';

// Output file configuration
const OUTPUT_FILE = 'users.csv';

// User generation function
function generateUser(index) {
    const now = new Date().toISOString();
    return {
        id: index + 1,
        username: faker.person.fullName(),
        email: faker.internet.email(),
        amount: CONFIG.DEFAULT_POINTS,
        deleted: false,
        created_at: now,
        updated_at: now
    };
}

// Main execution function
async function generateUserDummyData() {
    console.log('Starting user dummy data generation...');
    console.log(`Total users to generate: ${CONFIG.TOTAL_USERS}`);

    // Check and create output directory
    const outputDir = ensureDirectory(CONFIG.OUTPUT_DIR);
    const outputPath = path.join(outputDir, OUTPUT_FILE);

    // Remove existing file if it exists
    removeFileIfExists(outputPath);

    const writeStream = fs.createWriteStream(outputPath);
    let totalUsers = 0;

    try {
        // Write CSV header
        writeStream.write('id,username,email,amount,deleted,created_at,updated_at\n');

        for (let i = 0; i < CONFIG.TOTAL_USERS; i++) {
            const user = generateUser(i);
            const csvLine = [
                user.id,
                `"${user.username}"`,
                `"${user.email}"`,
                user.amount,
                user.deleted ? 1 : 0,
                `"${user.created_at}"`,
                `"${user.updated_at}"`
            ].join(',') + '\n';

            writeStream.write(csvLine);
            totalUsers++;

            // Progress logging
            if ((i + 1) % CONFIG.LOG_INTERVAL === 0) {
                const progress = calculateProgress(i + 1, CONFIG.TOTAL_USERS);
                console.log(`Progress: ${progress}% (${i + 1}/${CONFIG.TOTAL_USERS} users generated)`);
            }
        }

        // Close stream
        await closeStream(writeStream);
        console.log('\nUser dummy data generation completed!');
        console.log(`Total users generated: ${totalUsers}`);
        console.log(`Output file location: ${outputPath}`);

    } catch (error) {
        console.error('Error occurred:', error);
        process.exit(1);
    }
}

// Execute script
generateUserDummyData().catch(error => {
    console.error('Fatal error occurred:', error);
    process.exit(1);
}); 
