const { Client } = require("@notionhq/client");

class NotionWakaTime {
    constructor(token) {
        this.notionClient = new Client({
            auth: token
        });
    }
    async getWakaTimeParentPageId() {
        let notionListWakaTime = await this.notionClient.search({
            query: "Wakatime-Report"
        });
        let wakaTimeParentPage = notionListWakaTime.results.find(v => v.object === "page");
        return wakaTimeParentPage.id;
    }
    /**
    * 
    * @param {import('../def/index.d').wakaTimeObj} wakaTimeObj 
    */
    async createWakaTimePage(wakaTimeObj) {
        if (await this.isReportExist(wakaTimeObj)) {
            console.log("The table exist");
            return;
        }
        let wakaTimeParentPageId = await this.getWakaTimeParentPageId();
        let title = `Wakatime ${wakaTimeObj.start} until ${wakaTimeObj.end}`;
        let notionPage = {
            "parent": {
                "type": "page_id",
                "page_id": wakaTimeParentPageId
            },
            "properties": {
                "title": {
                    "id": "title",
                    "type": "title",
                    "title": [
                        {
                            "type": "text",
                            "text": {
                                "content": title,
                                "link": null
                            },
                            "annotations": {
                                "bold": false,
                                "italic": false,
                                "strikethrough": false,
                                "underline": false,
                                "code": false,
                                "color": "default"
                            },
                            "plain_text": title,
                            "href": null
                        }
                    ]
                }
            },
            "children": []
        };
        this.addTotalTime(wakaTimeObj, notionPage);
        this.addProjectTitle(notionPage);
        this.addProjectTimeTable(wakaTimeObj, notionPage);
        console.log(JSON.stringify(notionPage, null , 4));
        let createResponse = await this.notionClient.pages.create(notionPage);
        console.log(createResponse);
    }
    /**
     * 
     * @param {import('../def/index.d').wakaTimeObj} wakaTimeObj 
     * @return {Promise<Boolean>}
     */
    async isReportExist(wakaTimeObj) {
        let title = `Wakatime ${wakaTimeObj.start} until ${wakaTimeObj.end}`;
        let notionListWakaTime = await this.notionClient.search({
            query: title
        });
        return Boolean(notionListWakaTime.results.length);
    }

    /**
     * 
     * @param {import('../def/index.d').wakaTimeObj} wakaTimeObj 
     * @param {Object} pageObj 
     */
    addTotalTime(wakaTimeObj, pageObj) {
        pageObj.children.push({
            "object": "block",
            "type": "heading_2",
            "heading_2": {
                "rich_text": [
                    {
                        "type": "text",
                        "text": {
                            "content": wakaTimeObj.totalTime,
                            "link": null
                        },
                        "annotations": {
                            "bold": true,
                            "italic": false,
                            "strikethrough": false,
                            "underline": false,
                            "code": false,
                            "color": "default"
                        },
                        "plain_text": wakaTimeObj.totalTime,
                        "href": null
                    }
                ]
            }
        });
    }

    /**
     * 
     * @param {Object} pageObj 
     */
    addProjectTitle(pageObj) {
        pageObj.children.push({
            "object": "block",
            "type": "heading_2",
            "heading_2": {
                "rich_text": [
                    {
                        "type": "text",
                        "text": {
                            "content": "Projects:",
                            "link": null
                        },
                        "annotations": {
                            "bold": true,
                            "italic": false,
                            "strikethrough": false,
                            "underline": false,
                            "code": false,
                            "color": "default"
                        },
                        "plain_text": "Projects:",
                        "href": null
                    }
                ]
            }
        });
    }

    /**
     * 
     * @param {import('../def/index.d').wakaTimeObj} wakaTimeObj 
     * @param {Object} pageObj 
     */
    addProjectTimeTable(wakaTimeObj, pageObj) {
        let tableHeader = [
            [{
                "type": "text",
                "text": {
                    "content": "Name",
                    "link": null
                },
                "annotations": {
                    "bold": false,
                    "italic": false,
                    "strikethrough": false,
                    "underline": false,
                    "code": false,
                    "color": "default"
                },
                "plain_text": "Name",
                "href": null
            }],
            [{
                "type": "text",
                "text": {
                    "content": "Time",
                    "link": null
                },
                "annotations": {
                    "bold": false,
                    "italic": false,
                    "strikethrough": false,
                    "underline": false,
                    "code": false,
                    "color": "default"
                },
                "plain_text": "Time",
                "href": null
            }]
        ];
        let tableObj = {
            "object": "block",
            "type": "table",
            "table": {
                "table_width": 2,
                "has_column_header": true,
                "has_row_header": false,
                "children": [
                    {
                        "object": "block",
                        "type": "table_row",
                        "table_row": {
                            "cells": [
                                ...tableHeader
                            ]
                        }
                    }
                ]
            }
        };
        for(let i = 0; i < wakaTimeObj.projectsAndTime.length ; i++) {
            let projectAndTime = wakaTimeObj.projectsAndTime[i];
            let projectAndTimeSplit = projectAndTime.split(" : ");
            let projectName = projectAndTimeSplit[0];
            let projectTime = projectAndTimeSplit[1];
            tableObj.table.children.push({
                "object": "block",
                "type": "table_row",
                "table_row": {
                    "cells": [
                        [{
                            "type": "text",
                            "text": {
                                "content": projectName,
                                "link": null
                            },
                            "annotations": {
                                "bold": true,
                                "italic": false,
                                "strikethrough": false,
                                "underline": false,
                                "code": false,
                                "color": "default"
                            },
                            "plain_text": projectName,
                            "href": null
                        }],
                        [{
                            "type": "text",
                            "text": {
                                "content": projectTime,
                                "link": null
                            },
                            "annotations": {
                                "bold": true,
                                "italic": false,
                                "strikethrough": false,
                                "underline": false,
                                "code": false,
                                "color": "default"
                            },
                            "plain_text": projectTime,
                            "href": null
                        }]
                    ]
                }
            });
        }
        pageObj.children.push(tableObj);
    }
}

module.exports.NotionWakaTime = NotionWakaTime;