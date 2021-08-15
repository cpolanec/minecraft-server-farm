/* eslint-disable no-console */
import got from 'got';

class PaperMCApiClient {
  //---------------------------------------------------------------------------
  // CLASS ATTRIBUTES
  //---------------------------------------------------------------------------

  private static URL_PREFIX = 'https://papermc.io/api/v2/projects/paper';

  //---------------------------------------------------------------------------
  // CLASS FUNCTIONALITY
  //---------------------------------------------------------------------------

  public static async gatherLatestBuildNumber(version: string): Promise<number> {
    let build: number;
    const url = `${PaperMCApiClient.URL_PREFIX}/versions/${version}`;
    try {
      const response = await got.get(url);
      const { builds } = JSON.parse(response.body) as Record<string, number[]>;
      build = builds[builds.length - 1];
      return build;
    } catch (error) {
      console.log(`failed to gather builds from ${url}`);
      throw error;
    }
  }

  // https://papermc.io/api/v2/projects/paper/versions/1.17.1/builds/170/downloads/paper-1.17.1-170.jar
  public static async createDownloadUrl(version: string, build: number): Promise<string> {
    const buildUrl = `${PaperMCApiClient.URL_PREFIX}/versions/${version}/builds/${build}`;
    try {
      const response = await got.get(buildUrl);
      const { downloads } = JSON.parse(response.body) as Record<string, { application: unknown }>;
      const application = downloads.application as { name: string };
      return `${buildUrl}/downloads/${application.name}`;
    } catch (error) {
      console.log(`failed to create download URL from build info: ${buildUrl}`);
      throw error;
    }
  }
}

export default PaperMCApiClient;
