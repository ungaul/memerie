# 📂 Memerie

This is a sleek and lightweight **cloud-based file manager** built using JavaScript and Google Drive API. It allows users to upload, organize, and browse files with an intuitive UI, breadcrumb navigation, and smart sorting. In this case, it is used as a meme collection.

## 🚀 Features
- 📁 **Folder Navigation:**
- 🔍 **Search Functionality:**
- ⏫ **File Uploads:**
- 📏 **Size Limit:**
- ⏳ **Rate Limiting:**
- ⚠️ **Error Handling:**

### 🔗 URL Parameters
- `?folder=` - Navigates to a specific folder (dot-separated path, e.g., `folder1.subfolder1`).
- `?sort=` - Sort files by name, size, etc.
- `?direction=` - Sorting order (`asc` or `desc`).
- `?q=` - Search query.

---

## 🛠 Setup & Installation

### 📌 Requirements
- A **Google Cloud project** with the **Drive API enabled**.
- A **Google Drive service account**.
- Node.js installed.

### 📥 Backend Installation
1. Clone the repository:
   ```sh
   git clone https://github.com/ungaul/memerie.git
   cd memerie
   ```

2. Install dependencies:
   ```sh
   npm install
   ```

3. Configure Google Drive API:
   - Create a `.env` file and add:
     ```ini
     GOOGLE_CLIENT_EMAIL=your-service-account-email
     GOOGLE_PRIVATE_KEY=your-private-key
     GOOGLE_DRIVE_FOLDER_ID=(eg: extract from the folder URL: https://drive.google.com/drive/u/0/folders/HERE)
     ```

4. Start the server:
   ```sh
   npm run dev
   ```

### 🌐 Frontend Setup
1. Open `index.html` in a browser or serve locally:
   ```sh
   npm install -g http-server
   http-server
   ```
2. Access via `http://localhost:8080` (or your configured port).

---

## 🤝 Contributing

Any contribution is welcome!

---

## 📜 License
This project is licensed under the [MIT LICENSE](LICENSE.md). Feel free to use and modify it!