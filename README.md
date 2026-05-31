# favorcate
このリポジトリは2024/12/23に開催された第2回 Asian Challenge Cupで使用したものです。

## favorcateの機能
- それぞれの「推し」についてのコメントを投稿することができます
- コメント上のネガティブな言葉は自動的にポジティブな言葉に変換されます
- 「推し」の名前で検索を行うことができます
- 「推し」が登録されていなかった場合は自分自身で登録することができます。

## 使い方について
http://127.0.0.1:3000/faves
にアクセスすると、以下のように一覧が表示されます。
<img width="600" alt="Image" src="https://github.com/user-attachments/assets/7fc07894-d2d8-4d9f-a921-4df0d92a4e13" />

---

ここで、表示された「推し」の名前をクリックするとその「推し」についてのコメント一覧が表示されます。
<img width="600" alt="Image" src="https://github.com/user-attachments/assets/999a791f-0460-4306-b164-52b1be679ae3" />

---

ここから、各コメントに対してGoodボタンを押せるようになっています。
<img width="600" alt="Image" src="https://github.com/user-attachments/assets/859e6ee9-9841-4dc2-9dae-9b7f80586065" />

---

また、画面の下部ではコメントを投稿することができるようになっています。
<img width="800" alt="Image" src="https://github.com/user-attachments/assets/de6b3e72-df5a-4cf2-b1f6-a8dd2b58bc7d" />

ネガティブな言葉を含むコメントを投稿しようとした場合、自動的にポジティブな言葉に変換されて投稿が行われます。（言葉の変換はバックエンドで完全一致によって行われています。）
<img width="800"  alt="Image" src="https://github.com/user-attachments/assets/52fc186d-f6dc-4f77-80b8-bd1058735087" />
