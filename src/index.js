const path = require('path');
const fs = require('fs');
const readline = require('readline');
const { google } = require('googleapis');
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
const TOKEN_PATH = 'token.json';

// Load client secrets from a local file.
function createWakaTimePageFromGmail() {
    fs.readFile(path.join(__dirname, '../credentials.json'), async (err, content) => {
        if (err) return console.log('Error loading client secret file:', err);
        let notionWakaTime = new NotionWakaTime(config.notion.token);
        // Authorize a client with credentials, then call the Gmail API.
        let authClient = await authorize(JSON.parse(content));
        let messages = await listMessages(authClient);
        for (let messageObj of messages) {
            let message = await readMessage(authClient, messageObj.id);
            let body = message.payload.parts[0].body.data;
            let bodyClean = body.replace(/-/g, '+').replace(/_/g, '/');
            let htmlBody = base64.Base64.decode(bodyClean);
            let htmlBodySplit = _.compact(htmlBody.split(/\r\n/));
            let total = htmlBodySplit[0];
            let wakaTimeUrl = new URL.URL(htmlBodySplit[1]);
            let wakaTimeUlrParams = new URL.URLSearchParams(wakaTimeUrl.searchParams);
            let reportStart = wakaTimeUlrParams.get("start");
            let reportEnd = wakaTimeUlrParams.get("end");
            let endProjectIndex = htmlBodySplit.indexOf("Languages:");
            let projectsAndTime = [];
            for (let projectIndex = 3; projectIndex < endProjectIndex; projectIndex++) {
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
    });
}


/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 */
function authorize(credentials) {
    return new Promise((resolve, reject) => {
        const { client_secret, client_id, redirect_uris } = credentials.installed;
        const oAuth2Client = new google.auth.OAuth2(
            client_id, client_secret, redirect_uris[0]);
    
        // Check if we have previously stored a token.
        fs.readFile(TOKEN_PATH, async (err, token) => {
            if (err) return await getNewToken(oAuth2Client);
            oAuth2Client.setCredentials(JSON.parse(token));
            resolve(oAuth2Client);
        });
    });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getNewToken(oAuth2Client, callback) {
    return new Promise((resolve, reject) => {
        const authUrl = oAuth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: SCOPES,
        });
        console.log('Authorize this app by visiting this url:', authUrl);
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });
        rl.question('Enter the code from that page here: ', (code) => {
            rl.close();
            oAuth2Client.getToken(code, (err, token) => {
                if (err) return reject('Error retrieving access token', err);
                oAuth2Client.setCredentials(token);
                // Store the token to disk for later program executions
                fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
                    if (err) return reject(err);
                    console.log('Token stored to', TOKEN_PATH);
                });
                return resolve(oAuth2Client);
            });
        });
    });
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
    return new Promise((resolve, reject)=> {
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
    return new Promise((resolve, reject)=> {
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