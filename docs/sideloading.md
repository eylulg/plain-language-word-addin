# Sideloading Plain Language

Start the add-in and the server first:

```bash
npm run certs -w addin   # once
npm run dev:server
npm run dev:addin        # serves https://localhost:3100
```

Open https://localhost:3100/taskpane.html in a browser once. If it loads without a certificate warning, Word will load it too.

## Word on Mac

Automatic: `npm start` sideloads the manifest and opens Word.

By hand:

1. Quit Word.
2. Copy the manifest into Word's add-in folder (create the folder if it does not exist):
   ```bash
   mkdir -p ~/Library/Containers/com.microsoft.Word/Data/Documents/wef
   cp addin/manifest.xml ~/Library/Containers/com.microsoft.Word/Data/Documents/wef/
   ```
3. Open Word and a document. On the **Home** tab select **Plain Language**. If the button is missing, open **Insert > Add-ins > My Add-ins** and choose it under **Developer Add-ins**.

To remove it, run `npm run stop -w addin` or delete the file from the `wef` folder.

To debug, right-click inside the task pane and choose **Inspect Element**. If that is missing, run `defaults write com.microsoft.Word OfficeWebAddinDeveloperExtras -bool true` and restart Word.

## Word on Windows

Automatic: `npm start` sideloads the manifest and opens Word.

By hand, with a shared folder catalog:

1. Create a folder such as `C:\addins`, share it (**Properties > Sharing > Share**) and copy `addin\manifest.xml` into it.
2. In Word, go to **File > Options > Trust Center > Trust Center Settings > Trusted Add-in Catalogs**. Add the network path of the share (for example `\\YOUR-PC\addins`), tick **Show in Menu**, and restart Word.
3. Open **Home > Add-ins > More Add-ins > Shared Folder**, choose **Plain Language** and select **Add**.

## Word on the web

1. Open a document at https://www.office.com.
2. Select **Home > Add-ins > More Add-ins** (or **Insert > Add-ins**), then **My Add-ins > Upload My Add-in**.
3. Browse to `addin/manifest.xml` and select **Upload**.

Alternatively run `npm run start:web -w addin -- --document <URL of a document in OneDrive>`.

The web version runs in your browser, so the browser must trust the dev certificate (it does after `npm run certs`).

## Hosting for others

To share the add-in, build it (`npm run build -w addin`), host `addin/dist` on any HTTPS static host, and replace every `https://localhost:3100` in `manifest.xml` with that URL. Set `VITE_REWRITE_API_URL` to the deployed server before building, and add the add-in's URL to the server's `ALLOWED_ORIGINS`.
