import exec from 'k6/execution';
import {sleep} from 'k6';
import {SharedArray} from 'k6/data';

// @ts-ignore
import papaparse from 'https://jslib.k6.io/papaparse/5.1.1/index.js';
// @ts-ignore
import {refreshToken} from '../api/auth.ts';
import {
    getBountyBoard,
    getUserGroups,
    getUserProfile,
    getUserTasks,
    GroupSortType,
    UserTaskStatus
// @ts-ignore
} from '../api/user.ts';
// @ts-ignore
import {certifyTask, huntTask} from '../api/challenge.ts';
// @ts-ignore
import {getGroupChatMessageList, getGroupMemberList, GroupMemberSortType} from '../api/groups.ts';

/**
 * Expect the most traffic at the end of the day and the beginning of the day
 * (90% of DAUs will be concentrated at the end of the day)
 */
export const options = {
    discardResponseBodies: true,
    scenarios: {
        /**
         * Expect many users to submit task certification before the end of the day
         * (70% of DAUs will submit certification before the end of the day)
         * <p>
         * Assume 30 minutes before the end of the day
         * <p>
         * => Set the Arrival Rate to 1,050 users/30 minutes
         */
        challengerCertifyTasks: {
            exec: 'challengerCertifyTasks',
            startTime: '0s',
            executor: 'constant-arrival-rate',
            duration: '30m',
            timeUnit: '1m',
            rate: 35,
            preAllocatedVUs: 40,
        },

        /**
         * At the end of the day,
         * a scheduler is triggered to check the completion/failure of challenges and tasks.
         * This behavior is directly related to the load on the server and needs to be simulated.
         */
        // TODO: simulate end-of-day scheduler in parallel (challenge & task expiration checker)

        /**
         * Expect a large number of users to be task hunting right after the start of the day
         * (90% of DAUs are expected to be task hunting right after the start of the day)
         * <p>
         * Assume 30 minutes right after the start of the day, and also expect a traffic pattern that spikes right after the start and then steadily declines
         * <ol>
         *   <li>Arrival Rate : 1,050 users/10 minutes</li>
         *   <li>Arrival Rate : 300 users/20 minutes</li>
         * </ol>
         */
        hunterHuntTasks: {
            exec: 'hunterHuntTasks',
            startTime: '30m',
            executor: 'ramping-arrival-rate',
            timeUnit: '1m',
            stages: [
                {duration: '10m', target: 105},
                {duration: '20m', target: 15},
            ],
            preAllocatedVUs: 70,
        }
    }
};

//////////////////////////////////// DATA //////////////////////////////////////

interface MockedUserSession {
    id: number,
    user_id: number,
    access_token: string,
    refresh_token: string,
    expiration: string,
    created_at: string,
    updated_at: string
}

const mockedUserSessions = new SharedArray('Mocked User Sessions', () => {
    return papaparse.parse(open('../out/user_sessions.csv'), {header: true}).data;
}) as MockedUserSession[];

/////////////////////////////////// SCENARIO //////////////////////////////////////////

/**
 * 1. Sign in
 * 2. Get user information
 * 3. Get in-progress tasks
 * 4. Check in-progress tasks
 * 4.1. THINK - Simulate thinking time before submitting certification
 * 4.2. Submit task certification
 */
export const challengerCertifyTasks = () => {
    const userIdx = exec.scenario.iterationInTest;
    const mockedUserSession = mockedUserSessions[userIdx];

    // 1. Sign in
    const {accessToken} = refreshToken({
        accessToken: mockedUserSession.access_token,
        refreshToken: mockedUserSession.refresh_token
    }, true);

    // 2. Get user information
    getUserProfile(accessToken);

    // 3. Get in-progress tasks
    const {tasks: userTasks} = getUserTasks(0, 20, UserTaskStatus.IN_PROGRESS, accessToken, true);

    // 4. Check in-progress tasks
    for (let i = 0; i < 2; i++) {
        const {id, challengeDetail: {challengeId}} = userTasks[i];

        // 4.1. THINK - Simulate thinking time before submitting certification
        sleep(5);

        // 4.2. Submit task certification
        const mockedCertification = {
            externalLinks: ['https://example.com/foo', 'https://example.com/bar'],
            imageUrls: ['https://image.com/foo', 'https://image.com/bar']
        }
        certifyTask(challengeId, id, mockedCertification, accessToken);
    }
}


/**
 * 1. Sign in
 * 2. Get user information
 * 3. Get bounty board
 * 4. Hunt tasks
 * 4.1. THINK - Simulate thinking time before hunting tasks
 * 4.2. Hunt tasks
 * 5. Get group list
 * 6. Enter group
 * 6.1. THINK - Simulate thinking time before entering group
 * 6.2. Get group member list
 * 6.3. Get group chat-room information
 * 6.4. THINK - Simulate thinking time before leaving group
 */
export const hunterHuntTasks = () => {
    const userIdx = exec.scenario.iterationInTest + Math.round((mockedUserSessions.length / 2));
    const mockedUserSession = mockedUserSessions[userIdx];

    // 1. Sign in
    const {accessToken} = refreshToken({
        accessToken: mockedUserSession.access_token,
        refreshToken: mockedUserSession.refresh_token
    }, true);

    // 2. Get user information
    getUserProfile(accessToken);

    // 3. Get bounty board
    const {tasks: bounties} = getBountyBoard(accessToken, true);

    // 4. Hunt tasks
    for (let i = 0; i < 2; i++) {
        const {id, challengeDetail: {challengeId}} = bounties[i];

        // 4.1. THINK - Simulate thinking time before hunting tasks
        sleep(1);

        // 4.2. Hunt tasks
        huntTask(challengeId, id, accessToken);
    }

    // 5. Get group list
    const {groups} = getUserGroups(GroupSortType.LATEST_CHAT, accessToken, true);

    // 6. Enter group
    for (let i = 0; i < 2; i++) {
        const {id} = groups[i];

        // 6.1. THINK - Simulate thinking time before entering group
        sleep(1);

        // 6.2. Get group member list
        getGroupMemberList(id, GroupMemberSortType.POINT, accessToken);

        // 6.3. Get group chat-room information
        getGroupChatMessageList(id, 0, 20, accessToken);

        // 6.4. THINK - Simulate thinking time before leaving group
        sleep(8);
    }
}
