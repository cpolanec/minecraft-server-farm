/* eslint-disable no-console */
import got from 'got';
import PaperMCApiClient from '../lib/papermc-api-client';

// Mock the console logger to avoid cluttering the Jest output.
// Comment the line below in order to receive console output for debugging.
console.log = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
});

test('receive valid build number list', async () => {
  jest.spyOn(got, 'get').mockResolvedValue({
    body: JSON.stringify({
      builds: [0, 1, 2, 3, 4],
    }),
  });
  const build = await PaperMCApiClient.gatherLatestBuildNumber('1.17');
  expect(build).toEqual(4);
});

test('PaperMC build number API error handling', async () => {
  jest.spyOn(got, 'get').mockRejectedValue(new Error('some http error'));
  await expect(
    PaperMCApiClient.gatherLatestBuildNumber('0.0'),
  ).rejects.toThrowError();
});

test('receive download information', async () => {
  jest.spyOn(got, 'get').mockResolvedValue({
    body: JSON.stringify({
      downloads: {
        application: {
          name: 'paper-1.17.1-170.jar',
        },
      },
    }),
  });
  const url = await PaperMCApiClient.createDownloadUrl('1.17.1', 170);
  expect(url).toEqual(
    'https://papermc.io/api/v2/projects/paper/versions/1.17.1/builds/170/downloads/paper-1.17.1-170.jar',
  );
});

test('PaperMC download API error handling', async () => {
  jest.spyOn(got, 'get').mockRejectedValue(new Error('some http error'));
  await expect(
    PaperMCApiClient.createDownloadUrl('0.0', 0),
  ).rejects.toThrowError();
});
