# XNB2CP Web

This is yet another rewrite of [XNB2CP-js](https://github.com/anotherpillow/xnb2cp-js) and [XNB2CP-py](https://github.com/anotherpillow/xnb2cp-py) as a web app. It is a tool to convert Stardew Valley XNB mods to Content Patcher.

## Usage

1. Select the XNB mod you want to convert with the files icon.
2. Navigate and upload to the `Content` folder of the XNB mod. (It must be ordered as if it would go in Content)
3. If your browser prompts you to upload the folder, choose "Upload".
4. Fill in the manifest fields. (Make sure to credit the original author!)
5. Click "Done" and wait for the conversion to finish.
6. Once it finishes, click "Download" to download the converted mod.

## Credits

- XNB-js by [lybell-art](https://github.com/lybell-art/xnb-js)
- [Custom Menu Background](https://www.nexusmods.com/stardewvalley/mods/7416) by [herbivoor](https://www.nexusmods.com/stardewvalley/users/78936668)

## Traslations

- Polish translation by [@kriislol](https://github.com/kriislol) on Discord.
- Russian translation by [@bezdelnikx](https://github.com/bezdelnikx)
- German translation by [@hellevator.](https://discord.com/users/549331533635518484) on Discord.

### How to translate

1. Fork this repository
2. Clone `i18n/en.json`, and rename it to `[language code].json`
    - The "language code" is the first half of `window.navigator` (check by just running this in your browser console)
3. Replace the English text with it of your language.
4. Create a pull request.
