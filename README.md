# NNPTUD-S2

# MSSV:   2280601248
# Tên:    Trần Hậu Huy

# https://github.com/nguyenthanhtunghutechsg/NNPTUD-S2/tree/20260126

1) mở terminal và gõ : npm install json-server
2) tạo file db.json và thêm nội dung sau :
{
  "$schema": "./node_modules/json-server/schema.json",
  "posts": [
    { "id": "1", "title": "a title", "views": 100 },
    { "id": "2", "title": "another title", "views": 200 }
  ],
  "comments": [
    { "id": "1", "text": "a comment about post 1", "postId": "1" },
    { "id": "2", "text": "another comment about post 1", "postId": "1" }
  ],
  "profile": {
    "name": "typicode"
  }
}
3) quay lại terminal gõ : npx json-server db.json
4) để tắt server bấm ctrl C

- Chuyển xoá cứng chuyển thành xoá mềm bằng cách thêm isDeleted:true vào trong đối tượng
- Làm ID tự tăng bằng với maxId +1 khi tạo (mới khi tạo mới thì bỏ trống ID), ID lưu trong CSDL là chuỗi 
- Hiển thị các post xoá mềm và sử dụng gạch ngang (thay đổi cách hiển thị) cho các post đó
- Thực hiện toàn bộ thao tác CRUD với comments