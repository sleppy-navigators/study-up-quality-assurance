import fs from 'fs';
import path from 'path';

/**
 * Checks if the directory exists and creates it if it doesn't.
 * @param {string} dirPath - Directory path to create
 * @returns {string} Absolute path of the created directory
 */
function ensureDirectory(dirPath) {
    const absolutePath = path.resolve(dirPath);
    if (!fs.existsSync(absolutePath)) {
        fs.mkdirSync(absolutePath, {recursive: true});
        console.log(`Directory created: ${absolutePath}`);
    }
    return absolutePath;
}

/**
 * Removes the file if it exists.
 * @param {string} filePath - File path to remove
 * @returns {boolean} true if file existed and was removed, false otherwise
 */
function removeFileIfExists(filePath) {
    const absolutePath = path.resolve(filePath);
    if (fs.existsSync(absolutePath)) {
        fs.unlinkSync(absolutePath);
        console.log(`Existing file removed: ${absolutePath}`);
        return true;
    }
    return false;
}

/**
 * Calculates the progress percentage.
 * @param {number} current - Current progress count
 * @param {number} total - Total count
 * @returns {string} Progress percentage with 2 decimal places
 */
function calculateProgress(current, total) {
    return ((current / total) * 100).toFixed(2);
}

/**
 * Safely closes a file stream.
 * @param {fs.WriteStream} stream - Stream to close
 * @returns {Promise<void>}
 */
function closeStream(stream) {
    return new Promise((resolve, reject) => {
        stream.end(() => {
            resolve();
        });
        stream.on('error', reject);
    });
}

export {
    ensureDirectory,
    removeFileIfExists,
    calculateProgress,
    closeStream
}; 
