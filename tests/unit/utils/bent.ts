import { inspect } from 'util';

import bent from 'bent';
import nock from 'nock';

import { bentErrorFixer } from '../../../src/utils/bent';

describe('bentErrorFixer()', () => {
    const resBody = {
        '418': { message: `I AM A TEAPOT!!!` },
    };
    nock('http://example.com')
        .persist()
        .get('/')
        .reply(418, resBody['418'], {
            'X-Frame-Options': 'deny',
            'X-RateLimit-Limit': '5000',
        });

    it('http 418', async () => {
        const resPromise = bent('http://example.com')('/').catch(bentErrorFixer);
        await expect(resPromise).toReject();
        await resPromise.catch(error => {
            expect(error).toBeInstanceOf(Error);

            expect(error).toMatchObject({
                name: 'StatusError',
                statusCode: 418,
                headers: {
                    'x-frame-options': 'deny',
                    'x-ratelimit-limit': '5000',
                },
                body: resBody['418'],
            });
            expect(error).toHaveProperty(
                'message',
                [
                    `HTTP 418`,
                    `  x-ratelimit-limit: 5000`,
                    `  body:`,
                    `    ${inspect(resBody['418'])}`,
                ].join('\n'),
            );
            expect(error).not.toContainAnyKeys(['text', 'arrayBuffer', 'json']);

            /*
             * The `name` property and `message` property must have the enumerable flag set to false.
             * These properties should not be displayed when stringing an error object.
             */
            expect(Object.keys(error)).not.toIncludeAnyMembers(['name', 'message']);
            expect(inspect(error)).not.toMatch(/^ *name:(?=[ \n])/m);
            expect(inspect(error)).not.toMatch(/^ *message:(?=[ \n])/m);
        });
    });
});
