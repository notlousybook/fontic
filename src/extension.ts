import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EXTENSION_ID = "fonted";
const STYLE_ID_TAG = '<style id="fonted">';

/**
 * Candidate relative paths to the VS Code workbench HTML file.
 * VS Code has moved this file across releases, so we try each in order.
 */
const WORKBENCH_RELATIVE_PATHS = [
	"out/vs/code/electron-sandbox/workbench/workbench.html",
	"out/vs/code/electron-browser/workbench/workbench.html",
] as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Resolved font configuration from user settings. */
interface FontConfig {
	fontFamily: string | undefined;
	fontStretch: string | undefined;
}

// ---------------------------------------------------------------------------
// Output channel (lazy-initialized)
// ---------------------------------------------------------------------------

let outputChannel: vscode.OutputChannel | undefined;

/** Returns a shared output-channel for structured logging. */
function getOutputChannel(): vscode.OutputChannel {
	if (!outputChannel) {
		outputChannel = vscode.window.createOutputChannel("Fonted");
	}
	return outputChannel;
}

/** Log an informational message to the Fonted output channel. */
function log(message: string): void {
	getOutputChannel().appendLine(`[INFO]  ${message}`);
}

/** Log an error message to the Fonted output channel. */
function logError(message: string, error?: unknown): void {
	const channel = getOutputChannel();
	channel.appendLine(`[ERROR] ${message}`);
	if (error instanceof Error) {
		channel.appendLine(`        ${error.message}`);
	}
}

// ---------------------------------------------------------------------------
// Activation / Deactivation
// ---------------------------------------------------------------------------

/**
 * Called by VS Code when the extension is activated.
 * Registers all commands contributed by fonted.
 */
export function activate(context: vscode.ExtensionContext): void {
	log("Activating fonted extension");

	const commands: Array<[string, () => void | Promise<void>]> = [
		["fonted.enable", () => setFont()],
		["fonted.disable", () => unsetFont()],
		["fonted.reload", () => reloadFont()],
		["fonted.revert", () => revertUI()],
	];

	for (const [id, handler] of commands) {
		context.subscriptions.push(vscode.commands.registerCommand(id, handler));
	}

	if (outputChannel) {
		context.subscriptions.push(outputChannel);
	}

	log("Fonted extension activated");
}

/** Called by VS Code when the extension is deactivated. */
export function deactivate(): void {
	log("Fonted extension deactivated");
}

// ---------------------------------------------------------------------------
// Workbench helpers
// ---------------------------------------------------------------------------

/**
 * Resolves the absolute path to the VS Code workbench HTML file.
 *
 * @throws {Error} If no known workbench path exists on disk.
 */
function getWorkbenchPath(): string {
	for (const relativePath of WORKBENCH_RELATIVE_PATHS) {
		const candidate = path.join(vscode.env.appRoot, relativePath);
		if (fs.existsSync(candidate)) {
			log(`Resolved workbench path: ${candidate}`);
			return candidate;
		}
	}

	const searched = WORKBENCH_RELATIVE_PATHS.map(
		(p) => `  - ${path.join(vscode.env.appRoot, p)}`,
	).join("\n");

	throw new Error(`Could not locate the VS Code workbench HTML file. Searched:\n${searched}`);
}

/**
 * Reads and returns the workbench HTML content.
 *
 * @throws {Error} If the file cannot be read.
 */
function getWorkbenchHtml(): string {
	const workbenchPath = getWorkbenchPath();

	try {
		return fs.readFileSync(workbenchPath, "utf8");
	} catch (error) {
		throw new Error(
			`Failed to read workbench file at ${workbenchPath}: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

// ---------------------------------------------------------------------------
// Style injection
// ---------------------------------------------------------------------------

/**
 * Builds the `<style>` block that will be injected into the workbench HTML.
 */
function getStyleMarkup(font: FontConfig): string {
	const fontStretch = font.fontStretch ? `font-stretch: ${font.fontStretch};` : "";

	const declarations = `{font-family: "${font.fontFamily}" !important; ${fontStretch}}`;

	return `<style id="fonted">
  :is(.mac, .windows, .linux, :host-context(.OS), .monaco-inputbox input):not(.monaco-mouse-cursor-text) ${declarations}
  </style>`;
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

/**
 * Injects the configured font into the VS Code workbench HTML.
 * No-ops if the font is already injected or no font is configured.
 */
function setFont(): void {
	try {
		const font = getFontConfig();

		if (!font.fontFamily) {
			log("No font configured — running unsetFont instead");
			unsetFont();
			return;
		}

		const html = getWorkbenchHtml();

		if (html.includes(STYLE_ID_TAG)) {
			log("Font style is already injected — skipping");
			return;
		}

		const newHtml = html.replace("</head>", `${getStyleMarkup(font)}</head>`);
		saveWorkbench(newHtml);
		promptRestart();
	} catch (error) {
		logError("Failed to set font", error);
		vscode.window.showErrorMessage(
			`Fonted: Failed to set font. ${error instanceof Error ? error.message : "See the Fonted output channel for details."}`,
		);
	}
}

/**
 * Removes the fonted style block from the workbench HTML.
 *
 * @param silent — If `true`, suppresses the restart prompt (used internally
 *                 by {@link reloadFont} to avoid two successive prompts).
 */
function unsetFont(silent = false): void {
	try {
		const html = getWorkbenchHtml();

		if (!html.includes(STYLE_ID_TAG)) {
			log("No fonted style found — nothing to remove");
			return;
		}

		const newHtml = html.replace(/<style id="fonted">(?:[^<]*\n)*([^<]*)<\/style>/gm, "");

		saveWorkbench(newHtml);

		if (!silent) {
			promptRestart();
		}
	} catch (error) {
		logError("Failed to unset font", error);
		vscode.window.showErrorMessage(
			`Fonted: Failed to remove font. ${error instanceof Error ? error.message : "See the Fonted output channel for details."}`,
		);
	}
}

/**
 * Removes the current font injection and re-applies it with the latest
 * configuration. Only shows a single restart prompt.
 */
function reloadFont(): void {
	try {
		const font = getFontConfig();

		// Remove existing injection silently (no restart prompt yet)
		unsetFont(/* silent */ true);

		// Re-apply if a font is configured
		if (font.fontFamily) {
			setFont();
		} else {
			// Font was cleared — just prompt once
			promptRestart();
		}
	} catch (error) {
		logError("Failed to reload font", error);
		vscode.window.showErrorMessage(
			`Fonted: Failed to reload font. ${error instanceof Error ? error.message : "See the Fonted output channel for details."}`,
		);
	}
}

/**
 * Reverts the VS Code title-bar style back to "custom" (the default) and
 * notifies the user.
 */
async function revertUI(): Promise<void> {
	try {
		const config = vscode.workspace.getConfiguration();
		await config.update("window.titleBarStyle", "custom", vscode.ConfigurationTarget.Global);
		vscode.window.showInformationMessage(
			"Fonted: UI has been reverted to custom style. Please restart if it hasn't updated.",
		);
		log("Reverted window.titleBarStyle to 'custom'");
	} catch (error) {
		logError("Failed to revert UI", error);
		vscode.window.showErrorMessage(
			"Fonted: Failed to revert UI. See the Fonted output channel for details.",
		);
	}
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

/**
 * Writes the modified HTML back to the workbench file.
 *
 * @throws {Error} If the file cannot be written.
 */
function saveWorkbench(html: string): void {
	const workbenchPath = getWorkbenchPath();

	try {
		fs.writeFileSync(workbenchPath, html);
		log(`Workbench file saved: ${workbenchPath}`);
	} catch (error) {
		throw new Error(
			`Failed to write workbench file at ${workbenchPath}: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/**
 * Retrieves a single fonted configuration value by key.
 */
function getConfig<T>(key: string): T | undefined {
	return vscode.workspace.getConfiguration(EXTENSION_ID).get<T>(key);
}

/**
 * Reads the current font configuration from VS Code settings.
 */
function getFontConfig(): FontConfig {
	return {
		fontFamily: getConfig<string>("font"),
		fontStretch: getConfig<string>("fontStretch"),
	};
}

// ---------------------------------------------------------------------------
// UX helpers
// ---------------------------------------------------------------------------

/**
 * Shows an information message prompting the user to restart VS Code.
 * If the user clicks "Restart Now", the window is reloaded.
 *
 * Inspired by https://github.com/iocave/monkey-patch
 */
async function promptRestart(): Promise<void> {
	const ACTION = "Restart Now";
	const choice = await vscode.window.showInformationMessage(
		"Fonted: Please restart VS Code to apply changes.",
		ACTION,
	);

	if (choice === ACTION) {
		vscode.commands.executeCommand("workbench.action.reloadWindow");
	}
}
