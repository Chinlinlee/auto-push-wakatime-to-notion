# auto-push-wakatime-to-notion
自動把gmail收到的wakatime報告同步到notion。

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