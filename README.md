# fonted

<p align="center">
  <img src="assets/fonted.png" alt="Fonted — dark theme preview" width="150" />
</p>

An extension to change the UI font of VS Code. That's all it does.

> Based on https://github.com/blackmann/fonted but this is made better ig idk man

> [!IMPORTANT]
> For Cursor (and some other VS Code forks), the marketplace doesn't stay up to date with the current version of Fonted. Please use the [Releases](https://github.com/blackmann/fonted/releases) page.


<img src="assets/dark.png" alt="Fonted — dark theme preview" />

## Features

- 🔤 Replace the VS Code UI font with any installed font
- 📐 Control `font-stretch` for variable-width fonts
- ♻️ Reload the font without manually editing files
- 🔙 Revert the title bar style if it breaks

## Usage

1. Install the extension.
2. Open **Settings** and set `fonted.font` to your desired font family:
   ```json
   "fonted.font": "Pragmata Pro Mono"
   ```
3. Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and run **Fonted: Enable**.
4. Restart VS Code when prompted.

> [!NOTE]
> You can safely ignore the notification: *"Your Code installation appears to be corrupt. Please reinstall."* — this is expected because the extension modifies an internal VS Code file.

## Commands

| Command              | Description                                      |
| -------------------- | ------------------------------------------------ |
| `Fonted: Enable`     | Inject the configured font into the VS Code UI   |
| `Fonted: Disable`    | Remove the injected font                         |
| `Fonted: Reload`     | Re-apply the font after changing settings         |
| `Fonted: Revert UI`  | Reset `window.titleBarStyle` back to `custom`     |

## Configuration

| Setting              | Type     | Description                                          |
| -------------------- | -------- | ---------------------------------------------------- |
| `fonted.font`        | `string` | Font family to use for the VS Code UI                |
| `fonted.fontStretch`  | `string` | CSS `font-stretch` value (e.g. `condensed`, `125%`)  |

## Known Limitations

- The extension patches VS Code's internal `workbench.html` file, which triggers a "corrupt installation" warning. This is cosmetic and harmless.
- A restart is required after every font change.
- If a VS Code update resets the workbench file, you'll need to re-run **Fonted: Enable**.
