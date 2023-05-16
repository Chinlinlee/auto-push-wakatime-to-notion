# auto-push-wakatime-to-notion
![image](https://github.com/Chinlinlee/auto-push-wakatime-to-notion/assets/49154622/a17f4baf-24f4-415f-aa93-4f76385302f6)

自動把gmail收到的wakatime報告同步到notion。

- 詳細內容可看 [將 WakaTime 自動同步到 Notion](https://luxuriant-cobbler-efa.notion.site/Wakatime-Notion-9f5bb51342d341a79a9d36667dc856bb)
# 如何使用
- 請先到Google API申請憑證，並把憑證JSON放到目錄取名為`credentials.json`
- 在`config資料夾`新增`config.js`檔案，把notion的token填入
```js
//可參考config/config.template.js
module.exports = { 
    notion: {
        token: "token"
    }
};
```
- `node src/index.js`
> 每個禮拜二半夜12點更新

# 參考資料
- [[How-To] 如何申請及啟用 Gmail API 的 OAuth 2.0 憑證以供其他程式使用](https://www.alexclassroom.com/internet/google/google-apis/how-to-register-and-enable-gmail-api/#%e5%a6%82%e4%bd%95%e8%a7%a3%e6%b1%ba-google-api-%e7%9a%84-oauth-%e9%a9%97%e8%ad%89%e6%8e%88%e6%ac%8a%e9%8c%af%e8%aa%a4-400-invalid-scope)
- [Node.js 快速入門導覽課程 (用於參考 oauth 2.0)](https://developers.google.com/people/quickstart/nodejs?hl=zh-tw)
- [用 WakaTime 自我監控](https://medium.com/code-and-me/%E7%94%A8-wakatime-%E8%87%AA%E6%88%91%E7%9B%A3%E6%8E%A7-f59599144e28)
