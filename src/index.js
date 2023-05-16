const path = require('path');
const fs = require('fs');
const fsP = require('fs/promises');
const { google } = require('googleapis');
const { authenticate } = require('@google-cloud/local-auth');
const base64 = require('js-base64');
const _ = require('lodash');
const URL = require('url');
const { NotionWakaTime } = require('./notion/notion');
const config = require('../config/config');
const schedule = require('node-schedule');

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = path.join(__dirname, "../token.json");
const CREDENTIALS_PATH = path.join(__dirname, "../credentials.json");

// Load client secrets from a local file.
function createWakaTimePageFromGmail() {
    fs.readFile(path.join(__dirname, '../credentials.json'), async (err, content) => {
        if (err) return console.log('Error loading client secret file:', err);
        let notionWakaTime = new NotionWakaTime(config.notion.token);
        // Authorize a client with credentials, then call the Gmail API.
        let authClient = await authorize();
        let messages = await listMessages(authClient);
        for (let messageObj of messages) {
            let message = await readMessage(authClient, messageObj.id);
            let body;
            if (Object.prototype.hasOwnProperty.call(message.payload, "parts")) {
                body = message.payload.parts[0].body.data;
            } else { // No coding week
                continue;
            }
            let bodyClean = body.replace(/-/g, '+').replace(/_/g, '/');
            let htmlBody = base64.Base64.decode(bodyClean);
            let htmlBodySplit = _.compact(htmlBody.split(/\r\n/));
            let total = htmlBodySplit[0];
            if (!total.includes("mins")) {
                total = htmlBodySplit[htmlBodySplit.indexOf("total")-1];
            }
            let wakaTimeUrl = new URL.URL(htmlBodySplit[1]);
            let wakaTimeUrlParams = new URL.URLSearchParams(wakaTimeUrl.searchParams);
            let reportStart = wakaTimeUrlParams.get("start");
            let reportEnd = wakaTimeUrlParams.get("end");
            let startProjectIndex = htmlBodySplit.indexOf("Projects:");
            let endProjectIndex = htmlBodySplit.indexOf("Languages:");
            let projectsAndTime = [];
            for (let projectIndex = startProjectIndex+1 ; projectIndex < endProjectIndex; projectIndex++) {
                projectsAndTime.push(htmlBodySplit[projectIndex])
            }
            let wakaTimeReport = {
                start: reportStart,
                end: reportEnd,
                totalTime: total,
                projectsAndTime: projectsAndTime
            };
            await notionWakaTime.createWakaTimePage(wakaTimeReport);
        }
        console.log("push to notion completed");
    });
}


/**
 * Reads previously authorized credentials from the save file.
 *
 * @return {Promise<OAuth2Client|null>}
 */
async function loadSavedCredentialsIfExist() {
    try {
        const content = await fsP.readFile(TOKEN_PATH);
        const credentials = JSON.parse(content);
        return google.auth.fromJSON(credentials);
    } catch (err) {
        return null;
    }
}

/**
 * Serializes credentials to a file comptible with GoogleAUth.fromJSON.
 *
 * @param {OAuth2Client} client
 * @return {Promise<void>}
 */
async function saveCredentials(client) {
    const content = await fsP.readFile(CREDENTIALS_PATH);
    const keys = JSON.parse(content);
    const key = keys.installed || keys.web;
    const payload = JSON.stringify({
      type: 'authorized_user',
      client_id: key.client_id,
      client_secret: key.client_secret,
      refresh_token: client.credentials.refresh_token,
    });
    await fsP.writeFile(TOKEN_PATH, payload);
}
  

async function authorize() {
    let client = await loadSavedCredentialsIfExist();
    if (client) return client;
    client = await authenticate({
        scopes: SCOPES,
        keyfilePath: CREDENTIALS_PATH
    });

    if (client.credentials) {
        await saveCredentials(client);
      }
    return client;
}

/**
 * Lists the labels in the user's account.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function listLabels(auth) {
    const gmail = google.gmail({ version: 'v1', auth });
    gmail.users.labels.list({
        userId: 'me',
    }, (err, res) => {
        if (err) return console.log('The API returned an error: ' + err);
        const labels = res.data.labels;
        if (labels.length) {
            console.log('Labels:');
            labels.forEach((label) => {
                console.log(`- ${label.name}`);
            });
        } else {
            console.log('No labels found.');
        }
    });
}

function listMessages(auth) {
    return new Promise((resolve, reject) => {
        const gmail = google.gmail({ version: 'v1', auth });
        gmail.users.messages.list({
            userId: 'me',
            includeSpamTrash: false,
            q: "from:noreply@wakatime.com subject:report for"
        }, (err, res) => {
            if (err) {
                // console.log('The API returned an error: ' + err);
                return reject('The API returned an error: ' + err);
            }
            const messages = res.data;
            return resolve(messages.messages);
        });
    });
}
/**
 * 
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 * @param {string} id  message id
 * @return {Promise<gmail_v1.Schema$Message>}
 */
function readMessage(auth, id) {
    return new Promise((resolve, reject) => {
        const gmail = google.gmail({ version: 'v1', auth });
        gmail.users.messages.get({
            userId: 'me',
            id: id
        }, (err, res) => {
            if (err) {
                // console.log('The API returned an error: ' + err);
                return reject('The API returned an error: ' + err);
            }
            const message = res.data;
            return resolve(message);
        });
    });
}

const scheduleToAddNewReport = schedule.scheduleJob("0 0 12 * * 2", createWakaTimePageFromGmail);
createWakaTimePageFromGmail();
