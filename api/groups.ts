import http from 'k6/http';

// @ts-ignore
import {URLSearchParams} from 'https://jslib.k6.io/url/1.0.0/index.js';

//////////////////////////// Get Group Member List ////////////////////////////

export enum GroupMemberSortType {
    POINT = 'POINT',
    AVERAGE_CHALLENGE_COMPLETION_RATE = 'AVERAGE_CHALLENGE_COMPLETION_RATE',
    HUNTING_COUNT = 'HUNTING_COUNT',
    NONE = 'NONE'
}

export interface GroupMember {
    userId: number,
    userName: string,
    points: number,
    averageChallengeCompletionRate: number,
    huntingCount: number
}

export interface GroupMemberListResponse {
    members: GroupMember[]
}

export const getGroupMemberList: (groupId: number, sortBy: GroupMemberSortType, bearer: string, needResponse?: boolean) => GroupMemberListResponse = (groupId, sortBy, bearer, needResponse = false) => {
    const params = new URLSearchParams([['sortBy', sortBy.toString()]]);
    const response = http.get(http.url`${__ENV.BASE_URL}/groups/${groupId}/members?${params.toString()}`, {
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${bearer}`
        },
        responseType: needResponse ? 'text' : 'none'
    });

    if (response.status !== 200) {
        throw new Error(`Failed to get group member list: ${response.status} ${response.status_text}`);
    }

    return needResponse ? response.json('data') as unknown as GroupMemberListResponse : undefined;
}

//////////////////////////// Get Group Chat Message List ////////////////////////////

export interface ChatAction {
    type: 'HUNT_TASK',
    url?: string,
    httpMethod?: 'GET' | 'POST' | 'PUT' | 'DELETE',
}

export interface GroupChatMessage {
    id: number,
    senderId: number,
    senderType: 'USER' | 'BOT',
    content: string,
    chatActionList: ChatAction[],
    createdAt: string
}

export interface GroupChatMessageListResponse {
    messages: GroupChatMessage[],
    currentPage: number,
    pageCount: number,
    chatMessageCount: number
}

export const getGroupChatMessageList: (groupId: number, pageNum: number, pageSize: number, bearer: string, needResponse?: boolean) => GroupChatMessageListResponse = (groupId, pageNum, pageSize, bearer, needResponse = false) => {
    const params = new URLSearchParams([
        ['pageNum', pageNum.toString()],
        ['pageSize', pageSize.toString()]
    ]);
    const response = http.get(http.url`${__ENV.BASE_URL}/groups/${groupId}/messages?${params.toString()}`, {
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${bearer}`
        },
        responseType: needResponse ? 'text' : 'none'
    });

    if (response.status !== 200) {
        throw new Error(`Failed to get group chat message list: ${response.status} ${response.status_text}`);
    }

    return needResponse ? response.json('data') as unknown as GroupChatMessageListResponse : undefined;
}
