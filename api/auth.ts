import http from 'k6/http';


// @ts-ignore
import {CONFIG} from './config.ts';

//////////////////////////// Refresh Token ////////////////////////////

export interface RefreshTokenRequest {
    accessToken: string,
    refreshToken: string
}

export interface RefreshTokenResponse {
    accessToken: string,
    refreshToken: string
}

export const refreshToken: (request: RefreshTokenRequest, needResponse?: boolean) => RefreshTokenResponse = (request, needResponse = false) => {
    const response = http.post(http.url`${CONFIG.BASE_URL}/auth/refresh`, JSON.stringify(request), {
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        responseType: needResponse ? 'text' : 'none'
    });

    if (response.status !== 200) {
        console.error(`Failed to refresh token: ${response.status} ${response.body}`);
    }

    return needResponse ? response.json('data') as unknown as RefreshTokenResponse : undefined;
}
