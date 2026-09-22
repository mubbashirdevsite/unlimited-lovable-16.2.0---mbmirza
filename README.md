# Mirza-Lovable

Mirza-Lovable is a Chrome Manifest V3 extension that adds an AI productivity side panel to Lovable projects. It helps you prepare and send development prompts, use reusable code-workflow shortcuts, and manage supported project actions from one place.

Version: `2.0`

## Features

- Chrome side panel UI for Lovable projects
- Account sign-in, license-key activation, and supported free-trial flow
- Prompt composer for sending requests to the active Lovable project
- Quick shortcuts for:
  - Bug analysis and fixes
  - Refactoring
  - Error handling
  - Performance optimization
  - Documentation and comments
  - SEO
  - UI improvements
  - Component organization
  - Code review
- AI prompt optimization
- Optional voice input
- File attachments in prompts
- Prompt history
- Native Lovable chat mode
- Project utilities such as source download, publishing, and Lovable Cloud actions when enabled by the active plan
- English side-panel interface with theme and account controls

## Requirements

- Google Chrome or another Chromium-based browser with Manifest V3 support
- An active Lovable account
- A Lovable project opened at `lovable.dev`
- A valid Mirza-Lovable license or an available trial
- Internet access for Lovable and the license platform

## Installation (Developer Mode)

1. Download or clone this repository.
2. Open `chrome://extensions` in Chrome.
3. Turn on **Developer mode**.
4. Select **Load unpacked**.
5. Choose the extension folder containing `manifest.json`.
6. Open or refresh a project at `https://lovable.dev`.
7. Open the extension from the Chrome toolbar and use the side panel.

After changing extension files, return to `chrome://extensions`, click **Reload**, and refresh the Lovable project tab.

## Usage

1. Open a Lovable project URL containing the project ID.
2. Open the Mirza-Lovable side panel.
3. Sign in, activate your license, or start the available trial.
4. Enter a request in the prompt box, or choose a quick shortcut.
5. Optionally attach files, enable Plan mode, optimize the prompt, or use voice input.
6. Select **Send** to deliver the prompt to the active Lovable project.
7. Use the history, account, theme, and project utility controls as needed.

The extension selects an active Lovable project tab when multiple Lovable tabs are open. Keep the target project tab open and refreshed so the content bridge can connect correctly.

## Permissions

The extension requests these Chrome permissions:

- `storage`: Save local settings, session state, license state, and prompt history
- `activeTab`, `tabs`, and `scripting`: Find and connect to the active Lovable project tab
- `cookies`: Read Lovable authentication state for project synchronization
- `identity`: Support account authentication flows
- `alarms` and `notifications`: Schedule and display extension notifications
- `sidePanel`: Provide the Chrome side panel experience

It also requests host access for Lovable and the configured license platform domains listed in `manifest.json`.

## Troubleshooting

### The side panel cannot find my project

- Make sure the project is open on `lovable.dev`.
- Confirm that the URL is a project URL, not only the Lovable home page.
- Refresh the project tab after reloading the extension.
- Close duplicate Lovable tabs if the wrong project is selected.

### Prompt sending fails

- Check that you are signed in to Lovable.
- Verify that your license or trial is active.
- Reload the extension and refresh the Lovable tab.
- Check the extension errors from `chrome://extensions`.

### Voice input does not work

Allow microphone access when Chrome asks for it, then reopen the side panel and try again.

### License or account problems

Use the account controls in the side panel. License validity, plan features, and expiration are checked by the configured license service.

## Project Structure

- `manifest.json`: Chrome extension manifest and permissions
- `background.js`: Service worker, tab discovery, authentication synchronization, and message delivery
- `sidepanel.html`: Side panel document
- `sidepanel.js`: Side panel behavior and user interactions
- `sidepanel-templates.js`: Side panel UI templates and quick shortcuts
- `content-bridge.js`: Communication bridge between the extension and Lovable
- `pageHook.js`: Lovable page integration hook
- `extension-config.js`: Extension and license-platform configuration
- `sidepanel.css`, `theme.css`, and `floating.css`: UI styling
- `assets/`: Icons and branding assets

## Security and Responsible Use

Use this extension only with accounts, projects, and license access that you are authorized to use. Do not share license keys or authentication data. Review the requested Chrome permissions before installing, and keep the extension source and configuration under your control.

## Development Notes

This repository is a plain JavaScript Chrome extension and does not require a build step. The files are loaded directly by Chrome according to `manifest.json`.

Before distributing a release, verify the manifest, test the side panel on a real Lovable project, and confirm that the configured license and support URLs are appropriate for the release environment.
