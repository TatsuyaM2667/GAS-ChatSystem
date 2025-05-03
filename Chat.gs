function doGet(e) { 
  var output = HtmlService.createHtmlOutputFromFile('index');
   output.addMetaTag('viewport','width=device-width,initial-scale=1'); 
   return output; 
  } 

function addMessage(username, recipient, message) {
  var sheet = SpreadsheetApp.openById("SpreadShnetID").getSheetByName("ChatLog");
  var senderEmail = Session.getActiveUser().getEmail();
  sheet.appendRow([new Date(), senderEmail, username, recipient, message]);

  // 直接キャッシュ更新（即時反映用）
  try {
    var cache = CacheService.getPublicCache();
    cache.put("chatUpdated", "true", 10);
  } catch (e) {
    Logger.log("キャッシュ更新失敗: " + e);
    // トリガーに任せる
  }
}

function getMessages() { 
  var sheet = SpreadsheetApp.openById("SpreadShnetID").getSheetByName("ChatLog"); 
  var data = sheet.getDataRange().getValues(); 
  var currentUser = Session.getActiveUser().getEmail(); // 現在のユーザーのメールアドレスを取得
  var formattedData = [];

  for (var i = 1; i < data.length; i++) { 
    var sender = data[i][1]; // 送信者のメールアドレス
    var recipient = data[i][3]; // 宛先

    // ① 全体チャットメッセージ（宛先なし）
    // ② DMメッセージ（送信者または受信者が現在のユーザー）
    if (recipient === "" || sender === currentUser || recipient === currentUser) { 
      formattedData.push({ 
        timestamp: data[i][0].toLocaleString(),
        username: data[i][2],
        recipient: recipient,
        message: data[i][4]
      });
    }
  }
  return formattedData; 
}

function getGroupMessages(groupName) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(groupName);
  if (!sheet) return [];

  var data = sheet.getDataRange().getValues();
  var formattedData = [];

  for (var i = 1; i < data.length; i++) {
    formattedData.push({
      timestamp: data[i][0].toLocaleString(),
      username: data[i][1],
      message: data[i][2]
    });
  }

  return formattedData;
}

function getUsernameByEmail(email) { 
  var sheet = SpreadsheetApp.openById("SpreadShnetID").getSheetByName("UserList"); // ユーザーリストを管理
  var data = sheet.getDataRange().getValues(); 
  for (var i = 1; i < data.length; i++) { 
  if (data[i][1] === email) { 
  return data[i][0]; // ユーザー名を返す 
  } } 
  return null;
 }

function createTrigger() {
  ScriptApp.newTrigger("sendUpdate")
    .timeBased()
    .everyMinutes(1) // 1分ごとに更新チェック
    .create();
}


function sendUpdate() {
  var cache = CacheService.getPublicCache();
  cache.put("chatUpdated", "true", 10); // キャッシュを10秒間保持

  // Google Apps Scriptのトリガーを作成
  ScriptApp.newTrigger("notifyClients")
    .timeBased()
    .after(500) // 500ミリ秒後に実行
    .create();
}

function checkCache() { 
  var cache = CacheService.getPublicCache(); 
  var cacheValue = cache.get("chatUpdated");
  Logger.log("キャッシュ確認: " + cacheValue); // デバッグ用ログ 
  return cacheValue || "false"; 
  } 

function loginUser(username, password) { 
  var sheet = SpreadsheetApp.openById("SpreadShnetID").getSheetByName("UserList"); 
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) { 
  if (data[i][0] === username && data[i][1] === password) { 
  return "ログイン成功"; } } return "ユーザー名またはパスワードが違います。";
    }

function registerUser(username, password, email) { 
  var sheet = SpreadsheetApp.openById("SpreadShnetID").getSheetByName("UserList"); var data = sheet.getDataRange().getValues();// ユーザー名の重複チェック 
      for (var i = 1; i < data.length; i++) { 
        if (data[i][0] === username) 
      { 
        return "このユーザー名は既に使用されています。";
         } } // 新しいユーザーを追加 
      sheet.appendRow([username, password, email || ""]); 
      return "登録成功！";
       }

function getUsers() { 
 var sheet = SpreadsheetApp.openById("SpreadShnetID").getSheetByName("UserList"); 
 var data = sheet.getDataRange().getValues(); 
 var users = []; for (var i = 1; i < data.length; i++) {
    users.push({ username: data[i][0] }); // オブジェクトとしてユーザー名を保存 
  } 
  Logger.log("ユーザー一覧: " + JSON.stringify(users)); // デバッグ用ログ 
  return users;
  }

function notifyClients() {
  var cache = CacheService.getPublicCache();
  cache.put("chatUpdated", "true", 10); // 更新通知をキャッシュに保存
}

function updateUserLastReadTime(username) {
  var sheet = SpreadsheetApp.openById("SpreadShnetID").getSheetByName("UserLastRead");
  var data = sheet.getDataRange().getValues();
  
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === username) {
      sheet.getRange(i + 1, 2).setValue(new Date());
      return;
    }
  }
  sheet.appendRow([username, new Date()]);
}

function getUnreadCount(username) {
  var sheet = SpreadsheetApp.openById("SpreadShnetID").getSheetByName("ChatLog");
  var readSheet = SpreadsheetApp.openById("SpreadShnetID").getSheetByName("UserLastRead");

  var lastReadTime = null;
  var readData = readSheet.getDataRange().getValues();
  for (var i = 1; i < readData.length; i++) {
    if (readData[i][0] === username) {
      lastReadTime = new Date(readData[i][1]);
      break;
    }
  }
  if (!lastReadTime) return 0;

  var chatData = sheet.getDataRange().getValues();
  var unreadCount = 0;

  for (var i = 1; i < chatData.length; i++) {
    var messageTime = new Date(chatData[i][0]);
    var recipient = chatData[i][3];
    
    if (recipient === username && messageTime > lastReadTime) {
      unreadCount++;
    }
  }
  return unreadCount;
}

function createGroup() {
  const groupName = document.getElementById("groupName").value.trim();
  const members = document.getElementById("groupMembers").value
    .split(",")
    .map(m => m.trim())
    .filter(m => m);

  if (!groupName || members.length === 0) {
    alert("グループ名とメンバーを入力してください。");
    return;
  }

  google.script.run
    .withSuccessHandler(msg => {
      alert(msg); // グループ作成成功時のメッセージを表示
      loadGroups(); // グループ一覧を更新
    })
    .withFailureHandler(err => alert(err.message))
    .createGroupSheet(groupName, members);
}

function sendGroupMessage(groupName, username, message) {
  Logger.log("受信したグループ名（整形前）:", groupName);
  groupName = groupName.trim(); // 前後の空白を削除
  Logger.log("受信したグループ名（整形後）:", groupName);

  if (!groupName) {
    throw new Error("グループ名が指定されていません。");
  }

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(groupName);
  if (!sheet) {
    Logger.log(`エラー: グループ「${groupName}」が見つかりません。`);
    throw new Error(`グループ「${groupName}」が存在しません。`);
  }

  sheet.appendRow([new Date(), username, message]);
  Logger.log(`メッセージがシート「${groupName}」に正常に追加されました`);
}

function debugSheetNames() {
  const sheets = SpreadsheetApp.getActiveSpreadsheet().getSheets();
  const sheetNames = sheets.map(sheet => sheet.getName());
  Logger.log("スプレッドシート内のシート名一覧:", sheetNames);
}

function getUserGroups(username) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("GroupList");
  if (!sheet) return [];

  const data = sheet.getDataRange().getValues();
  const groups = [];

  for (let i = 1; i < data.length; i++) {
    const groupName = data[i][0];
    const members = data[i][1] ? data[i][1].split(",").map(m => m.trim()) : [];

    if (members.includes(username)) {
      groups.push(groupName); // ユーザーが属するグループのみ追加
    }
  }

  return groups; // ユーザーが所属するグループ一覧を返す
}

function storeUsername(username) {
  const userProperties = PropertiesService.getUserProperties();
  userProperties.setProperty('username', username);
}

function getUsername() {
  const userProperties = PropertiesService.getUserProperties();
  return userProperties.getProperty('username');
}

function getAllUsernames() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("UserList");
  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
  return values.flat().filter(name => name); // 空欄除外
}

function createGroup(groupName, membersInput) {
  // membersInputの内容をログに出力
  Logger.log('membersInput:', membersInput);

  if (!membersInput || typeof membersInput !== "string") {
    throw new Error("メンバーリストが正しく入力されていません。");
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // すでに同名のグループが存在する場合はエラー
  if (ss.getSheetByName(groupName)) {
    throw new Error("同じ名前のグループがすでに存在します。");
  }

  // メンバーをカンマ区切りで入力している場合、splitして配列化
  var members = membersInput.split(",").map(function(member) {
    return member.trim(); // 各メンバー名をトリミング
  }).filter(function(member) {
    return member !== ""; // 空のメンバーを除外
  });

  // メンバーが1人以上いるか確認
  if (members.length === 0) {
    throw new Error("グループメンバーを1人以上入力してください。");
  }

  // 新しいグループのシートを作成
  var groupSheet = ss.insertSheet(groupName);
  groupSheet.appendRow(["Timestamp", "Username", "Message"]);

  // GroupListシートに記録
  var groupListSheet = ss.getSheetByName("GroupList");
  if (!groupListSheet) {
    groupListSheet = ss.insertSheet("GroupList");
    groupListSheet.appendRow(["GroupName", "Members"]);
  }

  groupListSheet.appendRow([groupName, members.join(",")]);

  return `グループ「${groupName}」が作成されました。`;
}
let selectedGroup = "";

function toggleGroupSelector() {
  const selector = document.getElementById("groupSelector");
  selector.classList.toggle("hidden");
}

function loadGroups() {
  const username = sessionStorage.getItem("username"); // クライアントサイドでユーザー名を取得
  
  // Google Apps Script の関数を呼び出してグループ情報を取得
  google.script.run.withSuccessHandler(groups => {
    const groupList = document.getElementById("groupList"); // グループ選択欄
    groupList.innerHTML = `<option value="">グループを選択</option>`; // 初期化

    groups.forEach(group => {
      const option = document.createElement("option");
      option.value = group;
      option.textContent = group;
      groupList.appendChild(option);
    });

    console.log(groups); // デバッグ用に取得したグループをログに出力
  }).getUserGroups(username);
}

function getGroupMessages(groupName) {
  Logger.log("取得するグループ名:", groupName);

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(groupName);
  if (!sheet) {
    Logger.log(`グループ「${groupName}」のシートが見つかりません`);
    return [];
  }

  const data = sheet.getDataRange().getValues();
  const messages = [];

  for (let i = 1; i < data.length; i++) {
    messages.push({
      timestamp: data[i][0],
      username: data[i][1],
      message: data[i][2]
    });
  }

  Logger.log("取得したメッセージ:", messages);
  return messages;
}