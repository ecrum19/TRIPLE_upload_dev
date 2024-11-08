import {
  getSolidDataset,
  SolidDataset,
  WithServerResourceInfo,
  AgentAccess,
  UrlString,
  responseToResourceInfo,
  isRawData,
  responseToSolidDataset,
  getSolidDatasetWithAcl,
  getAgentAccessAll,
  getResourceAcl,
  AclDataset,
  getWebIdDataset,
  getThing,
  addUrl,
  setThing,
  saveSolidDatasetAt,
  addStringNoLocale,
} from "@inrupt/solid-client";
import { fetch } from "@inrupt/solid-client-authn-browser";


export type FileData = WithServerResourceInfo & {
  blob: Blob;
  etag: string | null;
};
export type WorkingData = (SolidDataset & WithServerResourceInfo) | FileData;

// TODO: Fix this stupid pod registration thing (it should be working, not sure why it isn't ...)
/**
 * Method to Fetch WebId data from the Solid Pod API.
 * 
 * @param url the URL of the Solid pod or resource from which data should be obtained
 * 
 * @retuns a SolidDataset of the WebId from the WebId url provided
 */
export async function webIdDataset(url: UrlString, customLoc: UrlString | null): Promise<void> {
  const profData = await getWebIdDataset(url);
  const profThing = getThing(profData, url);
  let updatedThing = null;
  
  console.log(profThing);
  /* if the user did not sepcify a Pod url */
  if (customLoc === null) {
    const parsedUrl = new URL(url);

    /* if the user is using the triple pod hosting server */
    if (parsedUrl.hostname === 'triple.ilabt.imec.be') {
      const pathSegments = parsedUrl.pathname.split('/').filter(segment => segment.length > 0);
      const rootPath = (parsedUrl.origin + '/' + pathSegments[0] + '/').toString();
      updatedThing = addUrl(profThing, "http://www.w3.org/ns/pim/space#storage", rootPath);
      // updatedThing = addStringNoLocale(profThing, "http://www.w3.org/ns/pim/space#storage", "<../>");
      /* saves the updated card to the User's Pod (with their pod is registered) */
      const newCard = setThing(profData, updatedThing);
      const updatedCard = saveSolidDatasetAt(profThing.url, newCard, { fetch: fetch })
      console.log(updatedCard);
    } 

  /* if the user did specify their Pod's URL */
  } else {
    // updatedThing = addUrl(profThing, "http://www.w3.org/ns/pim/space#storage", customLoc);
    updatedThing = addStringNoLocale(profThing, "http://www.w3.org/ns/pim/space#storage", "<../>");
    
    /* saves the updated card to the User's Pod (with their pod is registered) */
    const newCard = setThing(profData, updatedThing);
    console.log(newCard);
  }
  
  
}


/**
 * Method to Fetch SolidDatasets from Solid Pod API. (Adapted from https://gitlab.com/vincenttunru/penny)
 * 
 * @param url the URL of the Solid pod or resource from which data should be obtained
 * 
 * @retuns a SolidDataset from the URL provided
 */
export async function fetchData(url: UrlString): Promise<WorkingData> {
  const urlObject = new URL(url);
  const headers = urlObject.pathname.endsWith("/")
    ? { Accept: "text/turtle" }
    : {
        // Ask the server to give us Turtle if it _can_ be served as Turtle
        Accept: "text/turtle;q=1.0, */*;q=0.5",
      };
  
  const response = await fetch(url, { headers: headers });
  const resourceInfo = responseToResourceInfo(response);
  if (isRawData(resourceInfo)) {
    return {
      ...resourceInfo,
      blob: await response.blob(),
      etag: response.headers.get("ETag"),
    };
  }
  if (response.headers.get("Content-Type") === "application/ld+json") {
    // Request JSON-LD as Turtle
    return await getSolidDataset(url, { fetch: fetch });
  }
  const dataset = await responseToSolidDataset(response);
  return dataset;
}

/**
 * Determine whether a given URL (container or resource) has an attached .acl file
 * 
 * @param url a URL to a pod container/resource
 * 
 * @retuns the .acl contents as an obj OR null if no .acl file exists
 */
export async function fetchPermissionsData(url: UrlString): Promise<AclDataset | null> {
  try {
    const solidDataWAcl = await getSolidDatasetWithAcl(url, { fetch: fetch });
    return getResourceAcl(solidDataWAcl);
  } catch (error) {
    return null;
  }
}

/**
 * Determines the list of users and access rights for a given resource or container
 * 
 * @param url a URL to a pod container/resource from which we can get access information
 * 
 * @retuns an AgentAccess object with information about users and their access rights
 */
export async function fetchAclAgents(url: UrlString): Promise<AgentAccess | null> {
  return getAgentAccessAll(await getSolidDatasetWithAcl(url, { fetch: fetch }));
}


