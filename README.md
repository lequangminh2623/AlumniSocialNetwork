# 🎓 Hệ thống Mạng Xã Hội Cựu Sinh Viên

Hệ thống hỗ trợ kết nối **cựu sinh viên, giảng viên và sinh viên** thông qua mạng xã hội nội bộ, cho phép chia sẻ thông tin, trao đổi học thuật, khảo sát và thông báo sự kiện từ nhà trường.

---

## 🚀 Tính năng chính

- 📝 **Đăng ký & đăng nhập**:  
  - Cựu sinh viên đăng ký bằng mã số sinh viên, phải được quản trị viên xác nhận.  
  - Giảng viên được cấp tài khoản qua email kèm mật khẩu mặc định, bắt buộc đổi mật khẩu trong 24h.  

- 📰 **Trang cá nhân & timeline**:  
  - Mỗi tài khoản có timeline riêng để đăng bài viết, hiển thị avatar và ảnh cover.  
  - Người dùng có thể like, haha, thả tim, bình luận, và chia sẻ.  
  - Chủ bài viết có quyền khóa bình luận, chỉnh sửa hoặc xóa comment/bài viết.  

- 📊 **Khảo sát trực tuyến**:  
  - Quản trị viên có thể tạo khảo sát về đào tạo, nhu cầu tuyển dụng, thu nhập…  
  - Hệ thống thống kê, tổng hợp kết quả khảo sát từ cựu sinh viên.  

- 📢 **Thông báo & sự kiện**:  
  - Quản trị viên đăng thông báo hoặc sự kiện, gửi lời mời tham gia cho cựu sinh viên.  
  - Có thể tạo nhóm, gửi thông báo qua email hoặc bài đăng.  

- 🛠️ **Quản lý nội dung**:  
  - Người dùng có thể sửa hoặc xóa bài viết của mình.  
  - Quản trị viên có quyền xóa bất kỳ bài viết nào.  

- 📈 **Thống kê & báo cáo**:  
  - Xem thống kê số lượng người dùng, số bài viết đăng theo năm, tháng, quý.  
  - Sử dụng **ChartJS** hoặc **Google Charts** để hiển thị trực quan.  

---

## 🏗️ Kiến trúc hệ thống

- **Frontend**:  
  - [React Native](https://reactnative.dev/)
  - [TailwindCSS](https://tailwindcss.com/)  

- **Backend**:  
  - [Django REST Framework](https://www.django-rest-framework.org/)
  - REST API, OAuth2

- **Cơ sở dữ liệu**:  
  - [MySQL](https://www.mysql.com/) / [PostgreSQL](https://www.postgresql.org/)  

- **Realtime & Notification**:  
  - [Firebase](https://firebase.google.com/) (thời gian thực & thông báo)  

---

## 📌 Ghi chú

- Tích hợp tính năng thời gian thực (realtime chat, đồng bộ comment, thông báo) bằng **Firebase** 
