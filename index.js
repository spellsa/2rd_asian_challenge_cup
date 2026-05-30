const http = require("http");
const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const util = require("util");
const url = require("url");
const querystring = require("querystring");

const mimeTypes = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

// データベースに接続
const db = new sqlite3.Database("./database.db", (err) => {
  if (err) {
    console.error("データベース接続エラー:", err.message);
    return;
  }
  console.log("データベースに接続しました。");
});

// db.all を Promise 化
const dbAll = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

async function getSearchFavoriteJson(searchWord) {
  const favoritesJson = {
    faves: [],
  };

  try {
    // クエリの実行
    const rows = await dbAll(`SELECT * FROM Favorites WHERE name LIKE '%${searchWord}%'`);

    // rows をマッピングして details をネスト
    favoritesJson.faves = rows.map((row) => ({
      fave_id: row.fave_id,
      details: {
        group: row.group_name,
        name: row.name,
        description: row.description,
        sub_description: row["sub-description"] || row.sub_description, // カラム名に注意
      },
    }));

    // JSON を返す
    return JSON.stringify(favoritesJson, null, 2);
  } catch (err) {
    console.error("エラー:", err.message);
    throw err; // エラーを再スロー
  }
}

// favoritesJson 関数を修正
async function getFavoritesJson() {
  const favoritesJson = {
    faves: [],
  };

  try {
    // クエリの実行
    const rows = await dbAll("SELECT * FROM Favorites");

    // rows をマッピングして details をネスト
    favoritesJson.faves = rows.map((row) => ({
      fave_id: row.fave_id,
      details: {
        group: row.group_name,
        name: row.name,
        description: row.description,
        sub_description: row["sub-description"] || row.sub_description, // カラム名に注意
      },
    }));

    // JSON を返す
    return JSON.stringify(favoritesJson, null, 2);
  } catch (err) {
    console.error("エラー:", err.message);
    throw err; // エラーを再スロー
  }
}
async function getPostsJson(fave_id, orderType) {
  const postsJson = {
    faves: [],
    posts: [],
  };

  try {
    // Favorites テーブルからお気に入り情報を取得
    const faveQuery = `SELECT * FROM Favorites WHERE fave_id = ?`;
    const faveRows = await dbAll(faveQuery, [fave_id]);

    if (faveRows.length > 0) {
      postsJson.faves = faveRows.map((row) => ({
        fave_id: row.fave_id,
        details: {
          group: row.group_name,
          name: row.name,
          description: row.description,
          sub_description: row["sub-description"] || row.sub_description, // カラム名に注意
        },
      }));
    } else {
      console.warn(`fave_id ${fave_id} に該当するお気に入り情報が見つかりませんでした。`);
    }

    // 投稿の取得クエリを設定
    let postQuery;
    if (orderType === "latest") {
      postQuery = `
        SELECT id AS post_id, content AS text, good AS likes, created_at
        FROM Post
        WHERE fave_id = ?
        ORDER BY post_id DESC
      `;
    } else if (orderType === "good") {
      postQuery = `
        SELECT id AS post_id, content AS text, good AS likes, created_at
        FROM Post
        WHERE fave_id = ?
        ORDER BY good DESC
      `;
    } else {
      throw new Error("invalid order type 'latest' or 'good'");
    }

    // 投稿データを取得
    const postRows = await dbAll(postQuery, [fave_id]);

    // 投稿データをマッピング
    postsJson.posts = postRows.map((post) => ({
      post_id: post.post_id,
      details: {
        text: post.text,
        likes: post.likes,
        created_at: post.created_at,
      },
    }));

    return JSON.stringify(postsJson, null, 2);
  } catch (err) {
    console.error("エラー:", err.message);
    throw err; // エラーを再スロー
  }
}

const hostname = "127.0.0.1";
const port = 3000;

const server = http.createServer(async (req, res) => {
  let filePath = "." + req.url; // リクエストされたURLを基にファイルパスを作成
  console.log("\n" + filePath);
  const parsedUrl = url.parse(req.url, true); // URLをパース
  const pathname = parsedUrl.pathname; // pathnameを取得

  //console.log(`リクエストされたURL2${pathname}`);

  if (filePath === "./faves") {
    filePath = "./index.html";
  } else if (filePath === "./") {
    filePath = "./404.html";
    console.log(filePath);
  }

  // ファイルの拡張子を取得
  const extname = path.extname(filePath);

  // MIMEタイプを決定
  const contentType = mimeTypes[extname] || "application/octet-stream";

  if (req.method === "POST" && pathname === "/add-post") {
    let body = "";

    // データ受信
    req.on("data", (chunk) => {
      body += chunk;
      // データが大きすぎる場合は接続を終了
      if (body.length > 1e6) {
        // 約1MB
        req.connection.destroy();
      }
    });
    // データ受信完了
    req.on("end", () => {
      let parsedBody = querystring.parse(body);
      try {
        parsedBody = JSON.parse(body);
      } catch (err) {
        console.error("JSONパースエラー:", err.message);
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "無効なJSON形式です。" }));
        return;
      }

      const fave_id = parsedBody.fave_id;
      let content = parsedBody.text || parsedBody.content; // 'text' または 'content' をサポート

      // 入力データの検証
      if (!content) {
        res.writeHead(400, { "Content-Type": "text/plain" });
        res.end("コンテンツは必須です。");
        return;
      }

      // サニタイズ用の置換マップ
      const replacements = {
        バカ: "スマート",
        ブサイク: "イケてる",
        キモい: "心地いい",
        しね: "いきろ",
        ダサい: "オシャレ",
        臭い: "フレッシュ",
        最低: "最高",
        嫌い: "好き",
        無能: "有能",
        失敗作: "傑作",
        弱い: "強い",
        うざい: "面白い",
        わがまま: "個性的",
        残念: "素晴らしい",
        おかしい: "ユニーク",
        めんどくさい: "楽しみ",
        負け犬: "挑戦者",
        不幸: "幸せ",
        狭い: "広い",
        暗い: "明るい",
        鈍い: "鋭い",
        ケチ: "節約家",
        冷たい: "優しい",
        怖い: "勇敢",
        不細工: "綺麗",
        意地悪: "親切",
        頭悪い: "頭いい",
        悪い: "良い",
        否定的: "肯定的",
        寂しい: "賑やか",
        不安: "安心",
        無責任: "責任感がある",
        乱暴: "穏やか",
        泣き虫: "感受性豊か",
        あほ: "賢い",
        嘘つき: "正直",
        しつこい: "熱心",
        くだらない: "興味深い",
        短気: "忍耐強い",
        冷酷: "温かい",
        つまらない: "楽しい",
        変人: "自由人",
        不器用: "器用",
        うるさい: "賑やか",
        遅い: "慎重",
        意味不明: "個性的",
        弱虫: "チャレンジャー",
        嫌味: "ウィット",
        失礼: "礼儀正しい",
        醜い: "美しい",
        短絡的: "柔軟",
        無駄: "有意義",
        不潔: "清潔",
        嘘: "真実",
        ごみ: "宝",
        のろま: "堅実",
        あくどい: "賢明",
        臆病: "大胆",
        なまけもの: "勤勉",
        過剰: "適切",
        弱点: "長所",
        ばかげている: "すごい",
        悲惨: "希望に満ちた",
        怠惰: "積極的",
        粗末: "高級",
        失格: "合格",
        不細工な: "端正",
        つらい: "充実",
        ぼろぼろ: "ピカピカ",
        見苦しい: "見事",
        やばい: "素晴らしい",
        貧乏: "豊か",
        みじめ: "幸福",
        いらない: "必要",
        無価値: "価値ある",
        気持ち悪い: "気持ちいい",
        意味がない: "重要",
        役立たず: "頼りになる",
        欠陥: "完成",
        欠点: "美点",
        停滞: "発展",
        不正: "正義",
        不快: "快適",
        暗闇: "光",
        終わり: "始まり",
        無愛想: "愛想が良い",
        疲れた: "元気",
        負け: "勝利",
        失敗: "成功",
        退屈: "刺激的",
        無意味: "意義深い",
        苦しい: "楽しい",
        不公平: "公平",
        悪質: "善良",
        失望: "希望",
      };

      // 置換処理
      for (const [badWord, goodWord] of Object.entries(replacements)) {
        const regex = new RegExp(badWord, "g");
        content = content.replace(regex, goodWord);
      }

      // データベースに挿入
      const stmt = db.prepare("INSERT INTO Post (fave_id, content) VALUES (?, ?)");
      stmt.run(fave_id, content, function (err) {
        if (err) {
          console.error("データ挿入エラー:", err.message);
          res.writeHead(500, { "Content-Type": "text/plain" });
          res.end("投稿の追加に失敗しました。");
        } else {
          const newPostId = this.lastID;

          db.get("SELECT id AS post_id, content, good AS likes, created_at FROM Post WHERE id = ?", [newPostId], (err, row) => {
            if (err) {
              console.error("データ取得エラー:", err.message);
              res.writeHead(500, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: "投稿の取得に失敗しました。" }));
              return;
            } else {
              console.log(`新しい投稿が追加されました: post_id=${row.post_id}, content=${row.content}`);
              // 新しい投稿データをJSONで返す
              res.writeHead(201, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ post: row }));
              return;
            }
          });
        }
      });

      stmt.finalize();
    });
    return;
  } else if (req.method === "POST" && pathname === "/add-fave") {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1e6) {
        req.connection.destroy();
      }
    });

    req.on("end", () => {
      let parsedBody = querystring.parse(body);
      try {
        parsedBody = JSON.parse(body);
      } catch (err) {
        return;
      }

      const group_name = parsedBody.group_name;
      ``;
      const name = parsedBody.name;
      const description = parsedBody.description;
      const sub_description = parsedBody.sub_description;
      const stmt = db.prepare(`INSERT INTO Favorites (group_name, name, description, sub_description) VALUES (?, ?, ?, ?)`);
      stmt.run(group_name, name, description, sub_description);
    });
  } else if (req.method === "POST" && pathname === "/changeLike") {
    //いいね数が変更されたとき
    let body = "";

    // データをチャンクとして受け取る
    req.on("data", (chunk) => {
      body += chunk.toString(); // チャンクを文字列として追加
    });

    // データ受信完了時
    req.on("end", () => {
      try {
        // JSON を解析
        const parsedData = JSON.parse(body);
        const { POSTID, AMOUNTLIKES } = parsedData;

        // コンソールにデータを出力
        console.log(`POSTID: ${POSTID}`);
        console.log(`AMOUNTLIKES: ${AMOUNTLIKES}`);

        const stmt = db.prepare(`UPDATE Post SET good = ? WHERE id = ?`);
        stmt.run(AMOUNTLIKES, POSTID);

        // レスポンスを返す
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            message: "Data received successfully",
            receivedData: { POSTID, AMOUNTLIKES },
          })
        );
      } catch (err) {
        // エラーハンドリング
        console.error(err.message);
        res.writeHead(400, { "Content-Type": "text/plain" });
        res.end("Invalid JSON");
      }
    });
    return;
  } else if (req.method === "GET" && pathname === "/faves_search") {
    //推しの検索画面のとき
    try {
      console.log("推しの検索が実行されました");
      const parsedUrl = url.parse(req.url, true); // URLをパースしてクエリパラメータを取得 trueでクエリ解析が有効になる
      const searchWord = parsedUrl.query.search; //クエリを収納

      const result = await getSearchFavoriteJson(searchWord);
      console.log(result);

      //console.log(`クエリから取得された推しの検索ワードは${searchWord}です`);

      // レスポンスを返す
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
    } catch (err) {
      // エラーハンドリング
      console.error(err.message);
      res.writeHead(400, { "Content-Type": "text/plain" });
      res.end("Invalid JSON");
    }
    return;
  }

  // クライアントがJSONをリクエストしているかを判定
  //一般的なアクセスではacceptヘッダーにtext/htmlが含まれるが、JavaScriptのfetchリクエストではacceptヘッダーにapplication/jsonを指定することで、JSONを返すようにできます。
  const isJsonRequest = req.headers["accept"] && req.headers["accept"].includes("application/json"); //boolean
  console.log(isJsonRequest);
  if (isJsonRequest) {
    // JSONリクエストの場合
    if (filePath === "./index.html") {
      console.log(filePath + "_推し一覧のJsonがリクエストされました");
      //推し一覧のページのとき
      getFavoritesJson()
        .then((json) => {
          //正常に送信できた場合
          res.writeHead(200, { "Content-Type": "application/json" });
          //console.log(JSON.stringify(json));
          res.end(JSON.stringify(json));
        })
        .catch((err) => {
          //エラーハンドリング
          console.error("Error fetching JSON:", err);
          res.writeHead(500, { "Content-Type": "text/plain" });
          res.end("500 Internal Server Error");
        });
    } else if (filePath.substring(0, 8) === "./faves_") {
      console.log(filePath + "_投稿一覧のJsonがリクエストされました");
      //投稿一覧のページのとき
      const parsedUrl = url.parse(req.url, true); // URLをパースしてクエリパラメータを取得 trueでクエリ解析が有効になる
      const faveId = parsedUrl.query.id;
      console.log("リクエストされたユーザーのIDは" + parsedUrl.query.id);

      const orderType = parsedUrl.query.orderType;
      console.log(`クエリから取得された推しのIDは${faveId}です`);
      console.log(`クエリから取得されたソートの方法は${orderType}です`);

      getPostsJson(faveId, orderType)
        .then((json) => {
          //正常に送信できた場合
          res.writeHead(200, { "Content-Type": "application/json" });
          console.log(json);
          res.end(JSON.stringify(json));
        })
        .catch((err) => {
          //エラーハンドリング
          console.error("Error fetching JSON:", err);
          res.writeHead(500, { "Content-Type": "text/plain" });
          res.end("500 Internal Server Error");
        });
    }
  } else {
    //JSON以外のリクエストの場合
    console.log(filePath + "JSON以外のものがリクエストされました");
    // ファイルを読み込んでレスポンスを送信
    fs.readFile(filePath, (error, content) => {
      if (error) {
        if (error.code === "ENOENT") {
          if (filePath.split("/")[3] === undefined) {
            //latestのあとに無駄なものがついていないとき
            //各ユーザーのurlが押されたとき
            console.log("各ユーザごとのページへとリダイレクトさせます");
            filePath = "./user_index/user_index.html"; //各ユーザーごとのページのhtmlのパスを指定
          } else {
            //何も見つからなかったとき
            filePath = "./404.html"; // 404.htmlのパスを指定
          }

          fs.readFile(filePath, (err, data) => {
            if (err) {
              //404ページが見つからなかった場合
              // エラーハンドリング
              res.writeHead(500, { "Content-Type": "text/plain" });
              res.end("500 Internal Server Error");
            } else {
              //404ページが見つかった場合
              res.writeHead(404, { "Content-Type": "text/html" });
              res.end(data); // 404.htmlの内容を表示
            }
          });
        } else {
          console.log(error.code);
          // その他のエラー（500エラー）
          res.writeHead(500, { "Content-Type": "text/plain" });
          res.end("500 Internal Server Error");
        }
      } else {
        // ファイルを正常に読み込めた場合
        res.writeHead(200, { "Content-Type": contentType });
        res.end(content, "utf-8");
      }
    });
  }
});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
