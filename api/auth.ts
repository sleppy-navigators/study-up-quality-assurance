import http from 'k6/http';

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
    const response = http.post(http.url`${__ENV.BASE_URL}/auth/refresh`, JSON.stringify(request), {
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        responseType: needResponse ? 'text' : 'none'
    });

    if (response.status !== 200) {
        throw new Error(`Failed to refresh token: ${response.status} ${response.status_text}`);
    }

    return needResponse ? response.json('data') as unknown as RefreshTokenResponse : undefined;
}
