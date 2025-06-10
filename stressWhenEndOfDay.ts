import http from "k6/http";

import {sleep} from "k6";
import exec from "k6/execution";

/**
 * Expect the most traffic at the end of the day and the beginning of the day
 * (90% of DAUs will be concentrated at the end of the day)
 */
export const options = {
    discardResponseBodies: true,
    scenario: {
        /**
         * Expect many users to submit task certification before the end of the day
         * (70% of DAUs will submit certification before the end of the day)
         * <p>
         * Assume 30 minutes before the end of the day
         * <p>
         * => Set the Arrival Rate to 1,050 users/30 minutes
         */
        challengerCertifyTasks: {
            exec: "challengerCertifyTasks",
            startTime: "0s",
            executor: "constant-arrival-rate",
            duration: "30m",
            timeUnit: "1m",
            rate: 35,
            preAllocatedVUs: 40,
        },

        // TODO: simulate end-of-day scheduler in parallel (challenge & task expiration checker)
        /**
         * At the end of the day,
         * a scheduler is triggered to check the completion/failure of challenges and tasks.
         * This behavior is directly related to the load on the server and needs to be simulated.
         */

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
            exec: "hunterHuntTasks",
            startTime: "30m",
            executor: "ramping-arrival-rate",
            timeUnit: "1m",
            stages: [
                {duration: "10m", target: 105},
                {duration: "20m", target: 15},
            ],
            preAllocatedVUs: 70,
        }
    }
};

/////////////////////////////////// SCENARIO //////////////////////////////////////////

/**
 * 1. 토큰 갱신
 * 2. 내 회원 정보 조회 (프로필, 테스크 목록, 챌린지 목록, 그룹 목록 등)
 * 3.1. THINK
 * 3.2. 테스크 인증 자료 제출
 */
export const challengerCertifyTasks = () => {
    // exec.scenario.iterationInTest
}


/**
 * 1. 토큰 갱신
 * 2. 내 회원 정보 조회 (프로필, 테스크 목록, 챌린지 목록, 그룹 목록 등)
 * 3.1. THINK
 * 3.2. 그룹 진입
 * 3.3. 그룹 정보 조회 (그룹 채팅 목록, 그룹 멤버 목록, 그룹 챌린지 목록, 그룹 테스크 목록 등)
 * 3.3.1. THINK
 * 3.3.2. 테스크 헌팅
 */
export const hunterHuntTasks = () => {
    // exec.scenario.iterationInTest
}
