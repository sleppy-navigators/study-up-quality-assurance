import {faker} from '@faker-js/faker';
import fs from 'fs';
import path from 'path';
import {calculateProgress, closeStream, ensureDirectory, removeFileIfExists} from './util.js';
import {CONFIG} from './config.js';

// Output file configuration
const OUTPUT_FILE = 'groups.csv';

// Group generation function
function generateGroup(index) {
    const now = new Date().toISOString();
    // Calculate the user ID who created this group
    // For groups 1-5, user 1 is the creator
    // For groups 6-10, user 6 is the creator, and so on...
    const creatorId = Math.floor(index / CONFIG.MEMBERS_PER_GROUP) * CONFIG.MEMBERS_PER_GROUP + 1;

    return {
        id: index + 1,
        name: faker.company.name(),
        description: faker.company.catchPhrase(),
        thumbnail_url: faker.image.url(),
        deleted: false,
        created_at: now,
        created_by: creatorId,
        updated_at: now,
        updated_by: creatorId
    };
}

// Main execution function
async function generateGroupDummyData() {
    console.log('Starting group dummy data generation...');
    console.log(`Total groups to generate: ${CONFIG.TOTAL_GROUPS}`);

    // Check and create output directory
    const outputDir = ensureDirectory(CONFIG.OUTPUT_DIR);
    const outputPath = path.join(outputDir, OUTPUT_FILE);

    // Remove existing file if it exists
    removeFileIfExists(outputPath);

    const writeStream = fs.createWriteStream(outputPath);
    let totalGroups = 0;

    try {
        // Write CSV header
        writeStream.write('id,name,description,thumbnail_url,deleted,created_at,created_by,updated_at,updated_by\n');

        for (let i = 0; i < CONFIG.TOTAL_GROUPS; i++) {
            const group = generateGroup(i);
            const csvLine = [
                group.id,
                `"${group.name}"`,
                `"${group.description}"`,
                `"${group.thumbnail_url}"`,
                group.deleted ? 1 : 0,
                `"${group.created_at}"`,
                group.created_by,
                `"${group.updated_at}"`,
                group.updated_by
            ].join(',') + '\n';

            writeStream.write(csvLine);
            totalGroups++;

            // Progress logging
            if ((i + 1) % CONFIG.LOG_INTERVAL === 0) {
                const progress = calculateProgress(i + 1, CONFIG.TOTAL_GROUPS);
                console.log(`Progress: ${progress}% (${i + 1}/${CONFIG.TOTAL_GROUPS} groups generated)`);
            }
        }

        // Close stream
        await closeStream(writeStream);
        console.log('\nGroup dummy data generation completed!');
        console.log(`Total groups generated: ${totalGroups}`);
        console.log(`Output file location: ${outputPath}`);

    } catch (error) {
        console.error('Error occurred:', error);
        process.exit(1);
    }
}

// Execute script
generateGroupDummyData().catch(error => {
    console.error('Fatal error occurred:', error);
    process.exit(1);
}); 
