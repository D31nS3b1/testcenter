const http = require('http');

module.exports = async function waitForServer(serverUrl) {
  const getStatus = () => new Promise(resolve => {
    const request = http.get(
      serverUrl,
      response => {
        response.on('data', () => resolve(response.statusCode));
      }
    );
    request.on('error', () => resolve(-1));
  });

  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

  let retries = 10;
  let status = 0;
  // while (status !== 200) {
  while (status !== 200 && retries > 0) {
    // eslint-disable-next-line no-await-in-loop
    status = await getStatus();
    if (status === 200) {
      console.log(`Connection to ${serverUrl} successful`);
      return true;
    }
    retries -= 1;
    console.log(`Connection attempt to ${serverUrl} failed; ${retries} retries left`);
    // eslint-disable-next-line no-await-in-loop
    await sleep(5000);
  }
  throw new Error(`Could not reach ${serverUrl}`);
};
