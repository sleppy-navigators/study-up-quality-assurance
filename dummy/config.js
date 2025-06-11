import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
import yaml from 'js-yaml';

// Read YAML file
const yamlPath = path.resolve('../src/main/resources/config/application.yaml');
const yamlContent = fs.readFileSync(yamlPath, 'utf8');
const applicationProperties = yaml.load(yamlContent);

// Get current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Common configuration
export const CONFIG = {
    // Common settings
    OUTPUT_DIR: path.join(__dirname, '..', 'out'),
    LOG_INTERVAL: 1000,

    // User settings
    TOTAL_USERS: 10000,
    DEFAULT_POINTS: 1000,

    // Group settings
    TOTAL_GROUPS: 10000,
    MEMBERS_PER_GROUP: 5,

    // Challenge settings
    COMPLETED_CHALLENGES_PER_MEMBER: 10,
    ONGOING_CHALLENGES_PER_MEMBER: 2,
    DEFAULT_INITIAL_AMOUNT: 100,

    // Task settings
    TASKS_PER_CHALLENGE: 20,
    COMPLETED_SUCCESSFUL_TASKS: 10,
    COMPLETED_FAILED_TASKS: 10,
    ONGOING_SUCCESSFUL_TASKS: 8,
    ONGOING_FAILED_TASKS: 8,
    ONGOING_IN_PROGRESS_TASKS: 4,

    // ChatMessage specific configuration
    MESSAGES_PER_GROUP: 1500,
    SENDER_TYPE: "BOT",

    // GroupMember specific configuration
    GROUPS_PER_USER: 5,

    // JWT specific configuration
    JWT_SECRET: applicationProperties.authentication['access-token'].secret,
}; 
