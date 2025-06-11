import fs from 'fs';
import path from 'path';
import {calculateProgress, closeStream, ensureDirectory, removeFileIfExists} from './util.js';
import {CONFIG} from './config.js';
import jwt from 'jsonwebtoken';

// Output file configuration
const OUTPUT_FILE = 'user_sessions.csv';

// Get future date (one week later)
function getFutureDate() {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date;
}

// Generate a valid access token (expired)
function generateAccessToken(userId) {
    const now = Math.floor(Date.now() / 1000);
    const oneWeekAgo = now - (7 * 24 * 60 * 60); // 1 week ago
    const oneWeekAgoMinusOneHour = oneWeekAgo - (60 * 60); // 1 hour before 1 week ago

    const payload = {
        sub: userId.toString(),
        username: `user${userId}`,
        email: `user${userId}@example.com`,
        authorities: ['profile'],
        iss: 'study-up',
        iat: oneWeekAgo, // issued 1 week ago
        exp: oneWeekAgoMinusOneHour // expired 1 hour after issuance
    };

    return jwt.sign(payload, CONFIG.JWT_SECRET);
}

// Generate a valid refresh token (UUID format)
function generateRefreshToken() {
    return crypto.randomUUID();
}

// UserSession generation function
function generateUserSession(userId) {
    const now = new Date().toISOString();
    const expiration = getFutureDate().toISOString();
    return {
        id: userId,
        user_id: userId,
        access_token: generateAccessToken(userId),
        refresh_token: generateRefreshToken(),
        expiration: expiration,
        created_at: now,
        updated_at: now
    };
}

// Main execution function
async function generateUserSessionDummyData() {
    console.log('Starting userSession dummy data generation...');
    console.log(`Total users: ${CONFIG.TOTAL_USERS}`);

    // Check and create output directory
    const outputDir = ensureDirectory(CONFIG.OUTPUT_DIR);
    const outputPath = path.join(outputDir, OUTPUT_FILE);

    // Remove existing file if it exists
    removeFileIfExists(outputPath);

    const writeStream = fs.createWriteStream(outputPath);
    let totalSessions = 0;

    try {
        // Write CSV header
        writeStream.write('id,user_id,access_token,refresh_token,expiration,created_at,updated_at\n');

        // Generate sessions for each user
        for (let userId = 1; userId <= CONFIG.TOTAL_USERS; userId++) {
            const session = generateUserSession(userId);
            writeUserSessionToCSV(writeStream, session);
            totalSessions++;

            // Progress logging
            if (userId % CONFIG.LOG_INTERVAL === 0) {
                const progress = calculateProgress(userId, CONFIG.TOTAL_USERS);
                console.log(`Progress: ${progress}% (${userId}/${CONFIG.TOTAL_USERS} sessions generated)`);
            }
        }

        // Close stream
        await closeStream(writeStream);
        console.log('\nUserSession dummy data generation completed!');
        console.log(`Total sessions generated: ${totalSessions}`);
        console.log(`Output file location: ${outputPath}`);

    } catch (error) {
        console.error('Error occurred:', error);
        process.exit(1);
    }
}

// Helper function to write userSession to CSV
function writeUserSessionToCSV(writeStream, session) {
    const csvLine = [
        session.id,
        session.user_id,
        `"${session.access_token}"`,
        `"${session.refresh_token}"`,
        `"${session.expiration}"`,
        `"${session.created_at}"`,
        `"${session.updated_at}"`
    ].join(',') + '\n';

    writeStream.write(csvLine);
}

// Execute script
generateUserSessionDummyData().catch(error => {
    console.error('Fatal error occurred:', error);
    process.exit(1);
}); 
