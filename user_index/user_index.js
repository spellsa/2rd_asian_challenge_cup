let amountLikes = 0; //適当に0で初期化しておく　ここの変数にはJsonのすべてのものが入るのではなく、postsのもののみが入る
let postsJson = null;

document.addEventListener("DOMContentLoaded", function () {
  //ボタンを現在のurlから初期化
  const link = document.getElementById("change-button"); // <a> タグを取得
  const button = link.querySelector("button"); // <a> タグ内の <button> を取得

  const sortStatus = new URL(window.location.href).pathname.split("/")[2];
  const baseUrl = window.location.href.replace(/\/[^/]*$/, ""); // 現在のURLを取得して、最後の "/" 以降を削除
  if (sortStatus === "latest") {
    button.textContent = "latest"; //テキストではどのソート状態にいるのか表示
    link.href = baseUrl + "/good"; //hrefでは押したときのソートURLにする
  } else {
    button.textContent = "good";
    link.href = baseUrl + "/latest"; //hrefでは押したときのソートURLにする
  }

  // 現在のページのパス部分（ホスト名以下）を取得
  const pathName = window.location.pathname;
  // 正規表現でfaves_の後の数字を抜き出す
  const id = pathName.match(/faves_(\d+)/)[1]; //正規表現で最初にマッチする、faves_10のような[0]に格納されているものではなく、10だけである[1]を代入

  const query = `http://127.0.0.1:3000/faves_?id=${encodeURIComponent(id)}&orderType=${encodeURIComponent(sortStatus)}`; //クエリを生成する
  console.log(`idは${id}です`);
  if (id == 1) {
    window.location.href = "./addFevo/index.html";
  }

  fetch(query, {
    //GETリクエストを送信する、（getの場合は明示的に書かなくて良い。postは必要）
    headers: {
      Accept: "application/json", // JSONリクエストであることを示す
    },
  })
    .then((response) => {
      //なにかデータが帰ってきたとき
      if (!response.ok) {
        // ステータスコードが200番台でない場合（200番は正常なレスポンスのとき）
        // 代わりのデータを設定
        const fallbackData = {
          posts: [
            {
              post_id: 1,
              details: {
                text: "眠いですね",
                likes: 1,
                created_at: "2017-12-05T03:34:56",
              },
            },
            {
              post_id: 2,
              details: {
                text: "今日はいい天気ですね。",
                likes: 5,
                created_at: "2024-12-24T08:15:30",
              },
            },
          ],
        };
        return JSON.stringify(fallbackData, null, 2); // fallbackDataを返すことで次のthenで使えるようにする
      } else {
        //正常にデータが帰ってきたとき
        return response.json();
      }
    })
    .then((data) => {
      //dataにはresponse.json()の結果である、jsonの平文が入る
      receiveJsonPost(data);
    })
    .catch((error) => {
      //エラーハンドリング
      console.error("Error:", error);
    });
});

function receiveJsonPost(receivedJson) {
  postsJson = JSON.parse(receivedJson).posts; //グローバルに入れて関数を抜けたときに消えないようにする
  let faveDetails = JSON.parse(receivedJson).faves[0].details;

  updatePersonalInformation(faveDetails);

  postsJson.forEach((post) => {
    const originalElement = document.getElementById("original");

    console.log(post);
    var clonedElement = originalElement.content.cloneNode(true); // 複製

    //clonedElement.style.display = "block"; // display設定

    var clonedText = clonedElement.querySelector(".post");
    var clonedLikes = clonedElement.querySelector(".post-number");
    var clonedCreatedAt = clonedElement.querySelector(".post-date-text");
    var reactionButton = clonedElement.querySelector(".reaction-button");
    var reactionImg = clonedElement.querySelector(".reaction-img");

    clonedText.textContent = post.details.text; // テキスト内容
    clonedLikes.textContent = post.details.likes; // いいね数
    amountLikes = post.details.likes; //いいね数を他のところでも使えるように保存しておく

    // created_at を Date オブジェクトに変換
    let date = new Date(post.details.created_at);
    console.log(date.setHours(date.getHours() + 9));
    // 日本標準時（JST）でフォーマット
    clonedCreatedAt.textContent = date.toLocaleString({ timeZone: "Asia/Tokyo" });

    clonedElement.id = post.post_id; // クローンされた要素自体のIDを変更
    reactionButton.dataset.postId = post.post_id; // ボタンのIDを変更

    clonedElement.id = post.post_id; //クローンされた物自体のIDを変更
    reactionButton.dataset.postId = post.post_id; //ボタンのIDを変更
    //clonedElement.setAttribute("id", `post_${post.post_id}`);

    document.getElementById("newPostContainer").appendChild(clonedElement); // 新しい要素を追加

    reactionButton.addEventListener("click", (event) => {
      //現在の投稿IDを引数として送る、ボタンとクローンされた物自体のIDは等しいのでこれでいい
      toggleGood(this, clonedLikes, reactionImg, event.currentTarget.dataset.postId);
    });
    // debug: 複製された要素が正しく追加されているかを確認
    console.log(clonedElement);
  });
}

function updatePersonalInformation(details) {
  // クラス名で要素を選択
  const groupElement = document.querySelector(".group");
  const userNameElement = document.querySelector(".user-name");
  const descriptionElement = document.querySelector(".description");
  const subDescriptionElement = document.querySelector(".sub-description");

  // データが存在する場合に内容を更新
  if (details) {
    if (groupElement) {
      groupElement.textContent = details.group;
    } else {
      console.warn("要素 '.group' が見つかりません。");
    }

    if (userNameElement) {
      userNameElement.textContent = details.name;
    } else {
      console.warn("要素 '.user-name' が見つかりません。");
    }

    if (descriptionElement) {
      descriptionElement.textContent = details.description;
    } else {
      console.warn("要素 '.description' が見つかりません。");
    }

    if (subDescriptionElement) {
      subDescriptionElement.textContent = details.sub_description;
    } else {
      console.warn("要素 '.sub-description' が見つかりません。");
    }
  } else {
    console.error("details データが存在しません。");
  }
}

function toggleGood(button, likeElement, imgElement, postId) {
  console.log(`${postId}のボタンが押されました`);
  console.log(`この投稿のいいねは${getLikesByPostId(postId)}`);

  // いいね状態をトグル
  const isLiked = imgElement.getAttribute("src") === "/user_index/img/yellow-good.png"; //画像が同じかどうかでbool値を与える
  if (isLiked) {
    imgElement.setAttribute("src", "/user_index/img/good.png");
    amountLikes = getLikesByPostId(postId);
  } else {
    imgElement.setAttribute("src", "/user_index/img/yellow-good.png");
    amountLikes = getLikesByPostId(postId) + 1;
  }
  console.log(amountLikes);
  likeElement.textContent = amountLikes;

  fetch("http://127.0.0.1:3000/changeLike", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ POSTID: postId, AMOUNTLIKES: amountLikes }),
  });
  console.log(JSON.stringify({ POSTID: postId, AMOUNTLIKES: amountLikes }) + "実際にサーバーに送信したstringだよ");
}

// 特定のpost_idを取得する関数
function getLikesByPostId(postId) {
  const post = postsJson.find((post) => post.post_id == postId); // post_idで検索
  if (post) {
    return post.details.likes; // 見つかったらlikesを返す
  } else {
    return null; // 見つからない場合
  }
}
