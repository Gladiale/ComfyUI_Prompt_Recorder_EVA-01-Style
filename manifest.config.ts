import { defineManifest } from "@crxjs/vite-plugin";
import pkg from "./package.json" with { type: "json" };

export default defineManifest({
  manifest_version: 3,
  name: pkg.name,
  version: pkg.version,
  description:
    "プロンプトワードを階層化されたグループへ記録・選定し、重複を排除した最終プロンプトを生成する (EVA-01 themed).",
  icons: {
    16: "icons/icon16.png",
    32: "icons/icon32.png",
    48: "icons/icon48.png",
    128: "icons/icon128.png",
  },
  action: {
    default_icon: {
      48: "icons/icon48.png",
    },
    default_popup: "src/popup.html",
    default_title: "ComfyUI Prompt Recorder Eva-01",
  },
  permissions: ["storage"],
});
