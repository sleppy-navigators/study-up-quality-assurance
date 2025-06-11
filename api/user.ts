import http from 'k6/http';

// @ts-ignore
import {URLSearchParams} from 'https://jslib.k6.io/url/1.0.0/index.js';

//////////////////////////// Get User Profile ////////////////////////////

export interface UserProfileResponse {
    id: number,
    name: string,
    email: string,
    point: number
}

export const getUserProfile: (bearer: string, needResponse?: boolean) => UserProfileResponse = (bearer, needResponse = false) => {
    const response = http.get(http.url`${__ENV.BASE_URL}/users/me`, {
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${bearer}`
        },
        responseType: needResponse ? 'text' : 'none'
    });

    if (response.status !== 200) {
        throw new Error(`Failed to get user profile: ${response.status} ${response.status_text}`);
    }

    return needResponse ? response.json('data') as unknown as UserProfileResponse : undefined;
}

//////////////////////////// Get User Tasks ////////////////////////////

export enum UserTaskStatus {
    SUCCEED = 'SUCCEED',
    FAILED = 'FAILED',
    IN_PROGRESS = 'IN_PROGRESS',
    COMPLETED = 'COMPLETED',
    ALL = 'ALL'
}

export interface TaskCertificationDetail {
    externalLinks: string[],
    imageUrls: string[],
    certificatedAt: string
}

export interface TaskChallengeDetail {
    challengeId: number,
    challengeTitle: string,
    challengeDeposit: number,
    isCompleted: boolean
}

export interface TaskGroupDetail {
    groupId: number,
    groupName: string,
    currentlyJoined: boolean
}

export interface UserTaskDetail {
    id: number,
    title: string,
    deadline: string,
    certification?: TaskCertificationDetail,
    challengeDetail: TaskChallengeDetail,
    groupDetail: TaskGroupDetail
}

export interface UserTasksResponse {
    tasks: UserTaskDetail[]
}

export const getUserTasks: (pageNum: number, pageSize: number, status: UserTaskStatus, bearer: string, needResponse?: boolean) => UserTasksResponse = (pageNum, pageSize, status, bearer, needResponse = false) => {
    const params = new URLSearchParams([
        ['pageNum', pageNum.toString()],
        ['pageSize', pageSize.toString()],
        ['status', status.toString()]
    ]);
    const response = http.get(http.url`${__ENV.BASE_URL}/users/me/tasks?${params.toString()}`, {
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${bearer}`
        },
        responseType: needResponse ? 'text' : 'none'
    });

    if (response.status !== 200) {
        throw new Error(`Failed to get user tasks: ${response.status} ${response.status_text}`);
    }

    return needResponse ? response.json('data') as unknown as UserTasksResponse : undefined;
}

//////////////////////////// Get Bounty Board ////////////////////////////

export interface ChallengerDetail {
    challengerId: number,
    challengerName: string,
    currentlyJoined: boolean
}

export interface HuntableTask {
    id: number,
    title: string,
    reward: number,
    challengerDetail: ChallengerDetail,
    challengeDetail: TaskChallengeDetail,
    groupDetail: TaskGroupDetail
}

export interface BountyBoardResponse {
    tasks: HuntableTask[]
}

export const getBountyBoard: (bearer: string, needResponse?: boolean) => BountyBoardResponse = (bearer, needResponse = false) => {
    const response = http.get(http.url`${__ENV.BASE_URL}/users/me/bounties`, {
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${bearer}`
        },
        responseType: needResponse ? 'text' : 'none'
    });

    if (response.status !== 200) {
        throw new Error(`Failed to get bounty board: ${response.status} ${response.status_text}`);
    }

    return needResponse ? response.json('data') as unknown as BountyBoardResponse : undefined;
}

///////////////////////////////// Get Group List //////////////////////////////

export enum GroupSortType {
    LATEST_CHAT = 'LATEST_CHAT',
    NONE = 'NONE'
}

export interface GroupBrief {
    id: number,
    name: string,
    thumbnailUrl?: string,
    memberCount: number,
    lastChatMessage: string
}

export interface GroupListResponse {
    groups: GroupBrief[]
}

export const getUserGroups: (sortBy: GroupSortType, bearer: string, needResponse?: boolean) => GroupListResponse = (sortBy, bearer, needResponse) => {
    const params = new URLSearchParams([
        ['sortBy', sortBy.toString()]
    ]);
    const response = http.get(http.url`${__ENV.BASE_URL}/users/me/groups?${params.toString()}`, {
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${bearer}`
        },
        responseType: needResponse ? 'text' : 'none'
    });

    if (response.status !== 200) {
        throw new Error(`Failed to get group list: ${response.status} ${response.status_text}`);
    }

    return needResponse ? response.json('data') as unknown as GroupListResponse : undefined;
}
