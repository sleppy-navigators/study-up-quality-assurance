import http from 'k6/http';

// @ts-ignore
import {CONFIG} from './config.ts';

//////////////////////////// Certify Task ////////////////////////////

export interface CertifyTaskRequest {
    externalLinks: string[],
    imageUrls: string[]
}

export interface CertificationDetail {
    externalLinks: string[],
    imageUrls: string[],
    certificatedAt: string
}

export interface CertifyTaskResponse {
    id: number,
    title: string,
    deadline: string,
    isCompleted: boolean,
    certification: CertificationDetail
}

export const certifyTask: (challengeId: number, taskId: number, request: CertifyTaskRequest, bearer: string, needResponse?: boolean) => CertifyTaskResponse = (challengeId, taskId, request, bearer, needResponse = false) => {
    const response = http.post(http.url`${CONFIG.BASE_URL}/challenges/${challengeId}/tasks/${taskId}/certify`, JSON.stringify(request), {
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${bearer}`
        },
        responseType: needResponse ? 'text' : 'none'
    });

    if (response.status !== 200) {
        console.error(`Failed to certify task: ${response.status} ${response.body}`);
    }

    return needResponse ? response.json('data') as unknown as CertifyTaskResponse : undefined;
}

////////////////////////////// Hunt Task //////////////////////////////

export interface HuntTaskResponse {
    point: number
}

export const huntTask: (challengeId: number, taskId: number, bearer: string, needResponse?: boolean) => HuntTaskResponse = (challengeId, taskId, bearer, needResponse = false) => {
    const response = http.post(http.url`${CONFIG.BASE_URL}/challenges/${challengeId}/tasks/${taskId}/hunt`, null, {
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${bearer}`
        },
        responseType: needResponse ? 'text' : 'none'
    });

    if (response.status !== 200) {
        console.error(`Failed to hunt task: ${response.status} ${response.body}`);
    }

    return needResponse ? response.json('data') as unknown as HuntTaskResponse : undefined;
}
