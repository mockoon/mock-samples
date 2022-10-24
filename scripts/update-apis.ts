import { OpenAPIConverter } from '@mockoon/commons-server';
import download from 'download';
import { writeFileSync } from 'fs';
import imageType from 'image-type';
import isSvg from 'is-svg';
import fetch from 'node-fetch';
import path from 'path';
import removeMd from 'remove-markdown';
import { stripHtml } from 'string-strip-html';

type MockAPI = {
  title: string;
  slug: string;
  version: string;
  description: string;
  categories: string[];
  provider: string;
  logoSrc: string | null;
  environmentSrc: string;
  logoBg: string;
  externalLink: string;
};

const repoURL = 'https://raw.githubusercontent.com/mockoon/mock-samples/main/';
const apiFolder = 'mock-apis/';
const logoFolder = `${apiFolder}logos/`;
const envsFolder = `${apiFolder}data/`;
const mockAPIs: { items: MockAPI[]; categories: string[] } = {
  items: [],
  categories: []
};
const categories = new Set<string>();
const slugs = new Set();

const capitalize = (text: string) => {
  if (!text) {
    return '';
  }
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const slugify = (text: string) =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

const response = await fetch('https://api.apis.guru/v2/list.json');
const apiList: any = await response.json();

writeFileSync(`./tmp/list.json`, JSON.stringify(apiList, null, 2));

for (const apiName in apiList) {
  if (apiList.hasOwnProperty(apiName)) {
    console.log('Parsing: ' + apiName);

    const versionName = Object.keys(apiList[apiName].versions)[0];
    const version = apiList[apiName].versions[versionName];
    const apiInfo = version.info;

    if (!apiInfo['x-providerName']) throw 'Provider missing for ' + apiName;

    let slug = slugify(
      apiInfo['x-providerName'] +
        (apiInfo['x-serviceName'] ? '-' + apiInfo['x-serviceName'] : '')
    );

    let environmentSrc: string | undefined = undefined;

    // download and convert spec
    if (version.swaggerUrl) {
      try {
        console.log('    Downloading spec: ' + version.swaggerUrl);

        await download(version.swaggerUrl, `./tmp/specs/`, {
          filename: `${slug}.json`
        });

        console.log('    Conversion start');

        const openAPIConverter = new OpenAPIConverter();
        const environment = await openAPIConverter.convertFromOpenAPI(
          `./tmp/specs/${slug}.json`
        );
        console.log('    Conversion finished');
        console.log('    Writing to file: ' + `./${envsFolder}${slug}.json`);
        writeFileSync(
          `./${envsFolder}${slug}.json`,
          JSON.stringify(environment, null, 2)
        );
        environmentSrc = `${repoURL}${envsFolder}${slug}.json`;
      } catch (error: any) {
        console.log(
          `    Missing or incompatible spec for : ${apiName} - ${error.message}`
        );

        // skip incompatible specs
        continue;
      }
    }

    const externalLink =
      version.externalDocs?.url || apiInfo?.contact?.url || null;
    const apiCategories = (apiInfo['x-apisguru-categories'] || []).map(
      (category: string) => slugify(category)
    );

    apiCategories.forEach((category) => {
      categories.add(category);
    });

    // verify slug presence and uniqueness
    if (!slug) throw 'No slug for ' + apiName;
    if (slugs.has(slug)) {
      slug = slugify(slug + '-' + versionName);
    }
    slugs.add(slug);

    const description = removeMd(
      // remove code blocks before removing rest of markdown
      (stripHtml(apiInfo.description || '').result || '').replace(
        /(`{3,})[\s\S]*\1/gm,
        ''
      )
    )
      .replace(/\r?\n|\r/g, '<br />')
      .replace(/(\<br \/\>){2,}/g, '<br />')
      .replace(/\s\s+/g, ' ');

    let logoSrc: string | null = null;

    // download logo
    if (apiInfo['x-logo'].url && !apiInfo['x-logo'].url.includes('no-logo')) {
      console.log('    Downloading logo from:' + apiInfo['x-logo'].url);
      const ext = path.extname(apiInfo['x-logo'].url);
      const filename = `${slug}${ext}`;

      if (['.svg', '.jpg', '.jpeg', '.png'].includes(ext)) {
        try {
          const logo = await download(apiInfo['x-logo'].url);

          if (logo) {
            const isValidImage = imageType(logo);
            const isValidSvg = isSvg(logo);

            if ((isValidSvg && ext === '.svg') || isValidImage) {
              console.log(
                '    Writing logo to:' + `./${logoFolder}${filename}`
              );
              writeFileSync(`./${logoFolder}${filename}`, logo);

              logoSrc = `${repoURL}${logoFolder}${filename}`;
            }
          }
        } catch (error) {
          console.log(
            '    Error while downloading ' + apiName + ' logo: ' + error
          );
        }
      }
    }

    mockAPIs.items.push({
      title:
        apiInfo.title ||
        capitalize(apiInfo['x-providerName']) +
          ' ' +
          capitalize(apiInfo['x-serviceName']),
      slug,
      version: versionName,
      description,
      categories: apiCategories,
      provider: apiInfo['x-providerName'],
      environmentSrc: environmentSrc as string,
      logoSrc,
      logoBg: apiInfo['x-logo'].backgroundColor || null,
      externalLink
    });
  }
}

mockAPIs.categories = Array.from(categories);
mockAPIs.categories = mockAPIs.categories.sort();
writeFileSync(`./${apiFolder}list.json`, JSON.stringify(mockAPIs, null, 2));
